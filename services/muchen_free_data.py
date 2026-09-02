"""Local free-data gateway for MuChen.

The gateway keeps provider-specific code outside the Next.js app so that the
provider can be replaced later without changing the frontend contract.

Run with:
    python services/muchen_free_data.py

It exposes OpenAPI docs at http://127.0.0.1:8090/docs.
"""

from __future__ import annotations

import re
import threading
import time
from datetime import date, timedelta
from typing import Any

import adata
import baostock as bs
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn


app = FastAPI(
    title="沐尘免费数据网关",
    description="面向本地研究的免费 A 股行情与题材数据适配层。",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_baostock_lock = threading.Lock()
_baostock_logged_in = False
_topics_cache: tuple[float, dict[str, Any]] | None = None
_topics_cache_lock = threading.Lock()
_topics_refreshing = False
_topics_cache_seconds = 15 * 60

_topic_definitions = [
    {"id": "ai-compute", "name": "东数西算(算力)", "category": "科技成长", "index_code": "885957"},
    {"id": "semiconductor", "name": "芯片概念", "category": "先进制造", "index_code": "885756"},
    {"id": "robotics", "name": "人形机器人", "category": "先进制造", "index_code": "886069"},
    {"id": "low-altitude", "name": "低空经济", "category": "主题投资", "index_code": "886067"},
    {"id": "new-energy", "name": "固态电池", "category": "新能源", "index_code": "886032"},
    {"id": "innovative-medicine", "name": "创新药", "category": "医药生物", "index_code": "886015"},
]


def _json_records(frame: Any, limit: int | None = None) -> list[dict[str, Any]]:
    if frame is None or frame.empty:
        return []
    if limit is not None:
        frame = frame.head(limit)
    records = frame.where(frame.notna(), None).to_dict(orient="records")
    return records


def _normalise_stock_code(value: str) -> str:
    raw = value.strip().upper()
    if "." in raw:
        left, right = raw.split(".", 1)
        if left in {"SH", "SZ", "BJ"} and right.isdigit():
            return f"{left.lower()}.{right.zfill(6)}"
        if right in {"SH", "SZ", "BJ"} and left.isdigit():
            return f"{right.lower()}.{left.zfill(6)}"

    code = raw.zfill(6)
    if code.startswith(("600", "601", "603", "605", "688", "689")):
        market = "sh"
    elif code.startswith(("000", "001", "002", "003", "300", "301", "399")):
        market = "sz"
    elif code.startswith(("4", "8")):
        market = "bj"
    else:
        raise HTTPException(status_code=400, detail=f"无法识别股票代码：{value}")
    return f"{market}.{code}"


def _display_stock_code(value: str) -> str:
    market, code = value.split(".", 1)
    return f"{code}.{market.upper()}"


def _number(value: str | float | int | None) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _tencent_symbol(stock_code: str) -> str:
    market, code = _normalise_stock_code(stock_code).split(".", 1)
    return f"{market}{code}"


def _tencent_get(url: str) -> requests.Response:
    # 部分本机代理会中断公开行情请求；此本地网关直接连接公开接口。
    session = requests.Session()
    session.trust_env = False
    response = session.get(url, headers={"Referer": "https://gu.qq.com/"}, timeout=8)
    response.raise_for_status()
    return response


def _fetch_tencent_quotes(stock_codes: list[str]) -> dict[str, dict[str, Any]]:
    symbols = list(dict.fromkeys(_tencent_symbol(code) for code in stock_codes))
    if not symbols:
        return {}
    content = _tencent_get(f"https://qt.gtimg.cn/q={','.join(symbols)}").content.decode("gbk", errors="replace")
    quotes: dict[str, dict[str, Any]] = {}
    for matched in re.finditer(r'v_([a-z]{2}\d+)="([^"]*)";', content):
        symbol, raw = matched.groups()
        fields = raw.split("~")
        if len(fields) < 33:
            continue
        price = _number(fields[3])
        if price <= 0:
            continue
        timestamp = fields[30]
        as_of = f"{timestamp[:4]}-{timestamp[4:6]}-{timestamp[6:8]}" if len(timestamp) >= 8 else "最新交易日"
        amount = _number(fields[57]) * 10_000 if len(fields) > 57 else _number(fields[37]) * 10_000
        market, code = symbol[:2], symbol[2:]
        display_code = f"{code}.{market.upper()}"
        quotes[display_code] = {
            "code": display_code,
            "as_of": as_of,
            "price": price,
            "change": _number(fields[31]),
            "change_percent": _number(fields[32]),
            "amount": amount,
            "history": [],
        }
    return quotes


def _query_tencent_history(stock_code: str, start_date: str, end_date: str) -> list[dict[str, Any]]:
    symbol = _tencent_symbol(stock_code)
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    points = max(60, min(1_000, (end - start).days * 2))
    payload = _tencent_get(
        f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={symbol},day,,,{points},qfq"
    ).json()
    series = payload.get("data", {}).get(symbol, {}).get("qfqday", [])
    display_code = _display_stock_code(_normalise_stock_code(stock_code))
    rows: list[dict[str, Any]] = []
    for point in series:
        if len(point) < 6 or point[0] < start_date or point[0] > end_date:
            continue
        close = _number(point[2])
        previous_close = _number(rows[-1]["close"]) if rows else close
        rows.append({
            "date": point[0],
            "code": _normalise_stock_code(stock_code),
            "open": point[1],
            "high": point[3],
            "low": point[4],
            "close": point[2],
            "preclose": f"{previous_close:.4f}",
            "volume": point[5],
            "amount": "0",
            "adjustflag": "qfq",
            "turn": "",
            "tradestatus": "1",
            "pctChg": f"{((close / previous_close - 1) * 100) if previous_close else 0:.4f}",
            "peTTM": "",
            "pbMRQ": "",
            "psTTM": "",
            "pcfNcfTTM": "",
            "isST": "0",
            "display_code": display_code,
        })
    if not rows:
        raise ValueError("腾讯历史行情未返回可用数据")
    latest = _fetch_tencent_quotes([stock_code]).get(display_code)
    if latest:
        rows[-1]["close"] = f"{latest['price']:.4f}"
        rows[-1]["preclose"] = f"{latest['price'] - latest['change']:.4f}"
        rows[-1]["amount"] = f"{latest['amount']:.4f}"
        rows[-1]["pctChg"] = f"{latest['change_percent']:.4f}"
    return rows


def _ensure_baostock_login() -> None:
    global _baostock_logged_in
    if _baostock_logged_in:
        return
    result = bs.login()
    if result.error_code != "0":
        raise HTTPException(status_code=502, detail=f"BaoStock 登录失败：{result.error_msg}")
    _baostock_logged_in = True


def _reset_baostock_session() -> None:
    global _baostock_logged_in
    try:
        bs.logout()
    except Exception:
        pass
    _baostock_logged_in = False


def _query_history_with_provider(
    stock_code: str,
    start_date: str,
    end_date: str,
    frequency: str,
    adjustflag: str,
) -> tuple[list[dict[str, Any]], str]:
    code = _normalise_stock_code(stock_code)
    if frequency in {"d", "w", "m"}:
        fields = "date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg,peTTM,pbMRQ,psTTM,pcfNcfTTM,isST"
    elif frequency in {"5", "15", "30", "60"}:
        fields = "date,time,code,open,high,low,close,volume,amount,adjustflag"
    else:
        raise HTTPException(status_code=400, detail="frequency 仅支持 d/w/m/5/15/30/60")

    # 腾讯接口可提供不依赖登录会话的日线，作为默认路径；BaoStock 仅在它
    # 暂时不可用或请求非日线时兜底，避免单一上游网络波动让前端退回演示数据。
    if frequency == "d":
        try:
            return _query_tencent_history(stock_code, start_date, end_date), "tencent-finance"
        except (requests.RequestException, ValueError, KeyError, TypeError):
            pass

    with _baostock_lock:
        for attempt in range(2):
            _ensure_baostock_login()
            result = bs.query_history_k_data_plus(
                code,
                fields,
                start_date=start_date,
                end_date=end_date,
                frequency=frequency,
                adjustflag=adjustflag,
            )
            if result.error_code != "0":
                _reset_baostock_session()
                if attempt == 0:
                    continue
                raise HTTPException(status_code=502, detail=f"BaoStock 查询失败：{result.error_msg}")
            rows: list[dict[str, Any]] = []
            while result.next():
                values = result.get_row_data()
                rows.append(dict(zip(fields.split(","), values)))
            break
    for row in rows:
        row["display_code"] = _display_stock_code(code)
    return rows, "baostock"


def _query_history(
    stock_code: str,
    start_date: str,
    end_date: str,
    frequency: str,
    adjustflag: str,
) -> list[dict[str, Any]]:
    return _query_history_with_provider(stock_code, start_date, end_date, frequency, adjustflag)[0]


def _latest_quote(
    stock_code: str,
    start_date: str | None = None,
    include_history: bool = False,
) -> dict[str, Any] | None:
    display_code = _display_stock_code(_normalise_stock_code(stock_code))
    try:
        quote = _fetch_tencent_quotes([stock_code]).get(display_code)
        if quote:
            if include_history:
                quote["history"] = _query_history(
                    stock_code,
                    start_date or (date.today() - timedelta(days=45)).isoformat(),
                    date.today().isoformat(),
                    "d",
                    "3",
                )
            return quote
    except (requests.RequestException, ValueError, KeyError, TypeError):
        pass

    rows = _query_history(
        stock_code,
        start_date or (date.today() - timedelta(days=45)).isoformat(),
        date.today().isoformat(),
        "d",
        "3",
    )
    if not rows:
        return None
    latest = rows[-1]
    try:
        close = float(latest.get("close") or 0)
        preclose = float(latest.get("preclose") or 0)
        amount = float(latest.get("amount") or 0)
        pct_change = float(latest.get("pctChg") or 0)
    except (TypeError, ValueError):
        return None
    return {
        "code": latest["display_code"],
        "as_of": latest.get("date", ""),
        "price": close,
        "change": round(close - preclose, 4),
        "change_percent": round(pct_change, 4),
        "amount": amount,
        "history": rows if include_history else [],
    }


def _format_amount(amount: float) -> str:
    if amount >= 100_000_000:
        return f"{amount / 100_000_000:.1f} 亿"
    if amount >= 10_000:
        return f"{amount / 10_000:.1f} 万"
    return f"{amount:.0f}"


def _topic_trend(change_percent: float, up_ratio: float) -> str:
    if change_percent >= 2.5 and up_ratio >= 0.6:
        return "强化"
    if change_percent >= 0.8 and up_ratio >= 0.45:
        return "新启动"
    if change_percent < -0.8 and up_ratio < 0.45:
        return "退潮"
    return "分歧"


def _build_topic_snapshot(definition: dict[str, str]) -> dict[str, Any]:
    try:
        member_frame = adata.stock.info.concept_constituent_ths(index_code=definition["index_code"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"同花顺题材成分查询失败：{exc}") from exc

    if member_frame is None or member_frame.empty:
        return {
            **definition,
            "members": [],
            "member_count": 0,
            "updated_at": date.today().isoformat(),
            "data_status": "empty",
        }

    sample_members: list[dict[str, Any]] = []
    quotes_by_code: dict[str, dict[str, Any]] = {}
    for _, member in member_frame.head(5).iterrows():
        quote = _latest_quote(str(member["stock_code"]), include_history=True)
        if quote is None:
            continue
        quotes_by_code[quote["code"]] = quote
        sample_members.append({
            "code": quote["code"],
            "name": str(member["short_name"]),
            "price": quote["price"],
            "change_percent": quote["change_percent"],
            "amount": _format_amount(quote["amount"]),
            "status": "强势" if quote["change_percent"] >= 5 else "观察",
            "rank": len(sample_members) + 1,
            "as_of": quote["as_of"],
        })

    if not sample_members:
        raise HTTPException(status_code=502, detail=f"题材 {definition['name']} 暂无可用行情样本")

    sample_members.sort(key=lambda member: member["change_percent"], reverse=True)
    for rank, member in enumerate(sample_members, start=1):
        member["rank"] = rank

    changes = [member["change_percent"] for member in sample_members]
    up_count = sum(change > 0.2 for change in changes)
    down_count = sum(change < -0.2 for change in changes)
    flat_count = len(changes) - up_count - down_count
    up_ratio = up_count / len(changes)
    average_change = sum(changes) / len(changes)
    heat = round(max(0, min(100, 50 + average_change * 4 + up_ratio * 35 - (down_count / len(changes)) * 15)))
    for member in sample_members:
        if member["rank"] == 1:
            member["status"] = "龙头"
        elif member["change_percent"] >= 9.5:
            member["status"] = "连板"

    dates = sorted({row["date"] for quote in quotes_by_code.values() for row in quote.get("history", [])})[-6:]
    history: list[dict[str, Any]] = []
    for day in dates:
        day_changes = []
        for member in sample_members:
            quote = quotes_by_code.get(member["code"])
            row = next((item for item in (quote or {}).get("history", []) if item.get("date") == day), None)
            if row:
                try:
                    day_changes.append(float(row.get("pctChg") or 0))
                except (TypeError, ValueError):
                    pass
        day_average = sum(day_changes) / len(day_changes) if day_changes else 0
        day_heat = round(max(0, min(100, 50 + day_average * 4 + (sum(change > 0 for change in day_changes) / max(1, len(day_changes))) * 35)))
        history.append({"date": day[5:].replace("-", "-"), "change_percent": round(day_average, 4), "limit_up_count": sum(change >= 9.5 for change in day_changes), "heat": day_heat})

    recent_limit_up_codes = set()
    for member in sample_members:
        for row in quotes_by_code[member["code"]].get("history", [])[-30:]:
            try:
                if float(row.get("pctChg") or 0) >= 9.5:
                    recent_limit_up_codes.add(member["code"])
            except (TypeError, ValueError):
                pass

    return {
        **definition,
        "members": sample_members,
        "member_count": int(len(member_frame)),
        "updated_at": max(member["as_of"] for member in sample_members),
        "data_status": "live-derived",
        "heat": heat,
        "change_percent": round(average_change, 4),
        "up_count": up_count,
        "down_count": down_count,
        "flat_count": flat_count,
        "limit_up_count": sum(change >= 9.5 for change in changes),
        "limit_up_30_count": len(recent_limit_up_codes),
        "continuation_days": sum(point["change_percent"] > 0 for point in history),
        "turnover": _format_amount(sum(quotes_by_code[member["code"]]["amount"] for member in sample_members)),
        "rank_times": 0,
        "trend": _topic_trend(average_change, up_ratio),
        "history": history,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "muchen-free-data",
        "providers": {
            "tencent-finance": "primary-latest-quotes-and-daily-history",
            "baostock": "fallback-history",
            "adata-ths": "free-concept-membership",
        },
        "note": "仅供本地研究与模拟使用；公开网页数据源可能限流或变更。",
    }


@app.get("/api/sources")
def sources() -> list[dict[str, str]]:
    return [
        {
            "name": "腾讯财经公开行情",
            "scope": "A 股最新交易日行情、前复权日 K 线",
            "access": "免费公开接口，无需 Key",
            "status": "active",
        },
        {
            "name": "BaoStock",
            "scope": "A 股日 K 线兜底、股票基础资料、交易日历",
            "access": "免费，无需 Key",
            "status": "fallback",
        },
        {
            "name": "adata / 同花顺公开页面",
            "scope": "股票所属题材、同花顺题材成分股",
            "access": "免费公开页面适配",
            "status": "active",
        },
    ]


@app.get("/api/quotes")
def quotes(codes: str = Query(min_length=3)) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    stock_codes = list(dict.fromkeys(item.strip() for item in codes.split(",") if item.strip()))
    try:
        tencent_quotes = _fetch_tencent_quotes(stock_codes)
    except (HTTPException, requests.RequestException, ValueError, KeyError, TypeError):
        tencent_quotes = {}

    used_fallback = False
    for stock_code in stock_codes:
        try:
            display_code = _display_stock_code(_normalise_stock_code(stock_code))
            quote = tencent_quotes.get(display_code)
            if quote is None:
                used_fallback = True
                quote = _latest_quote(stock_code)
            if quote:
                quote.pop("history", None)
                items.append(quote)
            else:
                errors.append({"code": stock_code, "error": "没有可用行情"})
        except HTTPException as exc:
            errors.append({"code": stock_code, "error": str(exc.detail)})
        except Exception as exc:
            errors.append({"code": stock_code, "error": f"查询异常：{exc}"})
    provider = "tencent-finance+baostock-fallback" if used_fallback else "tencent-finance"
    return {"provider": provider, "items": items, "errors": errors}


def _build_topics_payload() -> dict[str, Any]:
    return {
        "provider": "adata-ths+tencent-finance",
        "updated_at": date.today().isoformat(),
        "items": [_build_topic_snapshot(definition) for definition in _topic_definitions],
    }


def _refresh_topics_cache() -> None:
    global _topics_cache, _topics_refreshing
    try:
        payload = _build_topics_payload()
        with _topics_cache_lock:
            _topics_cache = (time.time(), payload)
    finally:
        with _topics_cache_lock:
            _topics_refreshing = False


@app.get("/api/topics")
def topics() -> dict[str, Any]:
    global _topics_refreshing
    now = time.time()
    with _topics_cache_lock:
        cached = _topics_cache
        fresh = cached and now - cached[0] < _topics_cache_seconds
        if fresh:
            return cached[1]
        if not _topics_refreshing:
            _topics_refreshing = True
            threading.Thread(target=_refresh_topics_cache, daemon=True).start()
        if cached:
            return {**cached[1], "refreshing": True, "stale": True}
    return {
        "provider": "adata-ths+tencent-finance",
        "updated_at": date.today().isoformat(),
        "items": [],
        "refreshing": True,
    }


@app.get("/api/stock/{stock_code}/history")
def stock_history(
    stock_code: str,
    start_date: str = Query(default_factory=lambda: (date.today() - timedelta(days=365)).isoformat()),
    end_date: str = Query(default_factory=lambda: date.today().isoformat()),
    frequency: str = "d",
    adjustflag: str = "3",
) -> dict[str, Any]:
    items, provider = _query_history_with_provider(stock_code, start_date, end_date, frequency, adjustflag)
    return {
        "provider": provider,
        "stock_code": _display_stock_code(_normalise_stock_code(stock_code)),
        "items": items,
    }


@app.get("/api/stock/{stock_code}/concepts")
def stock_concepts(stock_code: str) -> dict[str, Any]:
    code = _normalise_stock_code(stock_code).split(".", 1)[1]
    try:
        frame = adata.stock.info.get_concept_ths(stock_code=code)
    except Exception as exc:  # public pages can be intermittently unavailable
        raise HTTPException(status_code=502, detail=f"同花顺题材查询失败：{exc}") from exc
    return {
        "provider": "adata-ths",
        "stock_code": _display_stock_code(_normalise_stock_code(stock_code)),
        "items": _json_records(frame),
    }


@app.get("/api/topic/{index_code}/members")
def topic_members(index_code: str, limit: int = Query(default=500, ge=1, le=1000)) -> dict[str, Any]:
    if not index_code.isdigit() or not index_code.startswith("8"):
        raise HTTPException(status_code=400, detail="同花顺题材指数代码通常以 8 开头")
    try:
        frame = adata.stock.info.concept_constituent_ths(index_code=index_code)
    except Exception as exc:  # public pages can be intermittently unavailable
        raise HTTPException(status_code=502, detail=f"同花顺题材成分查询失败：{exc}") from exc
    return {"provider": "adata-ths", "index_code": index_code, "items": _json_records(frame, limit)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8090)
