import { IfindMcpClient } from "@/lib/ifind-mcp";
import { fetchFreeHistory, fetchFreeQuotes, fetchFreeStockConcepts, isFreeDataEnabled } from "@/lib/free-data";

export type Quote = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  market: "沪" | "深" | "创";
  signal?: string;
};

export type NewsItem = {
  time: string;
  source: string;
  title: string;
  tone: "positive" | "neutral" | "negative";
};

export type StockDetail = Quote & {
  industry: string;
  marketCap: string;
  pe: string;
  pb: string;
  roe: string;
  high52: number;
  low52: number;
  thesis: string;
  risks: string[];
  news: NewsItem[];
  history?: Array<{ date: string; close: number; changePercent: number }>;
  dataProvider?: ProviderInfo;
};

export const indexQuotes: Quote[] = [
  { code: "000001.SH", name: "上证指数", price: 3387.21, change: 18.42, changePercent: 0.55, volume: "4,182亿", market: "沪" },
  { code: "399001.SZ", name: "深证成指", price: 10721.64, change: 86.31, changePercent: 0.81, volume: "5,691亿", market: "深" },
  { code: "399006.SZ", name: "创业板指", price: 2204.18, change: 27.66, changePercent: 1.27, volume: "1,908亿", market: "创" }
];

export const watchlistQuotes: Quote[] = [
  { code: "600519.SH", name: "贵州茅台", price: 1488.8, change: 16.8, changePercent: 1.14, volume: "28.6亿", market: "沪", signal: "趋势修复" },
  { code: "300750.SZ", name: "宁德时代", price: 232.46, change: -2.18, changePercent: -0.93, volume: "41.2亿", market: "创", signal: "等待确认" },
  { code: "688981.SH", name: "中芯国际", price: 91.03, change: 3.47, changePercent: 3.96, volume: "65.8亿", market: "沪", signal: "强势放量" },
  { code: "000333.SZ", name: "美的集团", price: 74.12, change: 0.46, changePercent: 0.62, volume: "12.4亿", market: "深", signal: "区间震荡" }
];

export type ScreenerQuote = Quote & {
  industry: string;
  score: number;
  momentum: "强" | "中" | "弱";
  valuation: "低估" | "合理" | "偏高";
  risk: "低" | "中" | "高";
};

export const screenerUniverse: ScreenerQuote[] = [
  { ...watchlistQuotes[0], industry: "白酒", score: 82, momentum: "中", valuation: "合理", risk: "中" },
  { ...watchlistQuotes[1], industry: "电池", score: 64, momentum: "弱", valuation: "合理", risk: "中" },
  { ...watchlistQuotes[2], industry: "半导体", score: 88, momentum: "强", valuation: "偏高", risk: "高" },
  { ...watchlistQuotes[3], industry: "家电", score: 76, momentum: "中", valuation: "低估", risk: "低" },
  { code: "601318.SH", name: "中国平安", price: 48.26, change: 0.31, changePercent: 0.65, volume: "32.1亿", market: "沪", signal: "估值修复", industry: "保险", score: 74, momentum: "中", valuation: "低估", risk: "中" },
  { code: "002594.SZ", name: "比亚迪", price: 273.5, change: 4.12, changePercent: 1.53, volume: "54.7亿", market: "深", signal: "趋势跟随", industry: "整车", score: 79, momentum: "强", valuation: "合理", risk: "中" },
  { code: "600036.SH", name: "招商银行", price: 36.18, change: -0.22, changePercent: -0.61, volume: "18.2亿", market: "沪", signal: "等待确认", industry: "银行", score: 69, momentum: "弱", valuation: "低估", risk: "低" },
  { code: "002475.SZ", name: "立讯精密", price: 39.62, change: 0.88, changePercent: 2.27, volume: "27.9亿", market: "深", signal: "景气改善", industry: "消费电子", score: 81, momentum: "强", valuation: "合理", risk: "中" },
  { code: "300124.SZ", name: "汇川技术", price: 61.45, change: -1.06, changePercent: -1.70, volume: "14.7亿", market: "创", signal: "回撤观察", industry: "自动化", score: 72, momentum: "弱", valuation: "偏高", risk: "中" },
  { code: "688012.SH", name: "中微公司", price: 168.9, change: 6.1, changePercent: 3.75, volume: "21.6亿", market: "沪", signal: "强势放量", industry: "半导体", score: 91, momentum: "强", valuation: "偏高", risk: "高" }
];

export function searchStocks(query: string): Quote[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];
  const allQuotes = [...watchlistQuotes, ...screenerUniverse];
  const seen = new Set<string>();
  return allQuotes.filter((quote) => {
    const matched = quote.code.toLowerCase().includes(keyword) || quote.name.toLowerCase().includes(keyword) || quote.signal?.toLowerCase().includes(keyword);
    if (!matched || seen.has(quote.code)) return false;
    seen.add(quote.code);
    return true;
  }).slice(0, 8);
}

export async function searchStocksAsync(query: string): Promise<{ results: Quote[]; provider: ProviderInfo }> {
  if (!query.trim()) return { results: [], provider: getProviderInfo() };
  if (!isFreeDataEnabled()) return { results: searchStocks(query), provider: getProviderInfo() };
  const snapshot = await getMarketSnapshot();
  const keyword = query.trim().toLowerCase();
  const allQuotes = [...snapshot.watchlistQuotes, ...snapshot.screenerUniverse];
  const seen = new Set<string>();
  const results = allQuotes.filter((quote) => {
    const matched = quote.code.toLowerCase().includes(keyword) || quote.name.toLowerCase().includes(keyword) || quote.signal?.toLowerCase().includes(keyword);
    if (!matched || seen.has(quote.code)) return false;
    seen.add(quote.code);
    return true;
  }).slice(0, 8);
  return { results, provider: snapshot.provider };
}

export const latestNews: NewsItem[] = [
  { time: "10:42", source: "市场雷达", title: "科技成长方向成交额继续抬升，半导体板块活跃度居前", tone: "positive" },
  { time: "10:18", source: "公告精选", title: "多家公司披露回购进展，风险偏好出现边际改善", tone: "positive" },
  { time: "09:56", source: "宏观观察", title: "今日北向资金脉冲流入，指数维持震荡上行结构", tone: "neutral" },
  { time: "09:31", source: "风险提示", title: "部分高位题材股波动放大，追涨需关注量价背离", tone: "negative" }
];

export type MarketSnapshot = {
  indexQuotes: Quote[];
  watchlistQuotes: Quote[];
  screenerUniverse: ScreenerQuote[];
  latestNews: NewsItem[];
  provider: ProviderInfo;
};

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function volumeLabel(amount: number) {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}亿`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(1)}万`;
  return `${Math.round(amount)}`;
}

function liveQuote(base: Quote, live: { price: number; change: number; change_percent: number; amount: number }) {
  return {
    ...base,
    price: live.price,
    change: live.change,
    changePercent: live.change_percent,
    volume: volumeLabel(live.amount)
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  if (!isFreeDataEnabled()) return { indexQuotes, watchlistQuotes, screenerUniverse, latestNews, provider: getProviderInfo() };

  const baseQuotes = [...indexQuotes, ...watchlistQuotes, ...screenerUniverse];
  const codes = [...new Set(baseQuotes.map((quote) => quote.code))];
  try {
    const quotePayload = await fetchFreeQuotes(codes);
    const liveQuotes = quotePayload.items;
    if (!liveQuotes.length) return demoMarketSnapshot("本地数据服务未返回行情，已回退演示数据");
    const liveByCode = new Map(liveQuotes.map((quote) => [quote.code, quote]));
    const updateQuote = (quote: Quote) => {
      const live = liveByCode.get(quote.code);
      return live ? liveQuote(quote, live) : quote;
    };
    const updateScreener = (quote: ScreenerQuote): ScreenerQuote => {
      const updated = updateQuote(quote);
      const momentum: ScreenerQuote["momentum"] = updated.changePercent >= 3 ? "强" : updated.changePercent <= -1 ? "弱" : "中";
      return { ...quote, ...updated, momentum };
    };
    const asOf = liveQuotes.map((quote) => quote.as_of).filter(Boolean).sort().at(-1) ?? "最新交易日";
    const quoteSource = quotePayload.provider.startsWith("tencent-finance") ? "腾讯财经公开行情" : "BaoStock";
    return {
      indexQuotes: indexQuotes.map(updateQuote),
      watchlistQuotes: watchlistQuotes.map(updateQuote),
      screenerUniverse: screenerUniverse.map(updateScreener),
      provider: {
        ...getProviderInfo(),
        note: `${quoteSource} 最新交易日行情 · 已更新 ${liveQuotes.length} / ${codes.length} 个样本${liveQuotes.length < codes.length ? "，其余保留演示值" : ""}`
      },
      latestNews: [
        { time: asOf, source: quoteSource, title: `本地免费数据网关已更新 ${liveQuotes.length} 个最新交易日样本`, tone: "positive" },
        { time: "题材", source: "同花顺公开页面", title: "题材成分与股票联动数据已通过本地服务加载", tone: "neutral" }
      ]
    };
  } catch {
    return demoMarketSnapshot("本地数据服务未响应，已回退演示数据");
  }
}

const detailMap: Record<string, StockDetail> = {
  "600519.SH": {
    ...watchlistQuotes[0],
    industry: "白酒",
    marketCap: "1.87万亿",
    pe: "23.8x",
    pb: "8.1x",
    roe: "34.2%",
    high52: 1788.0,
    low52: 1250.2,
    thesis: "股价重新站回短期均线，量能温和放大，当前更接近趋势修复而非单边突破。基本面仍有较强确定性，但估值和消费复苏节奏是核心观察项。",
    risks: ["消费复苏不及预期", "估值对增长兑现较敏感", "短线量能尚未形成突破级别"],
    news: [latestNews[1], { time: "昨日", source: "公司动态", title: "公司披露核心产品渠道库存保持健康", tone: "positive" }]
  },
  "300750.SZ": {
    ...watchlistQuotes[1],
    industry: "电池",
    marketCap: "1.02万亿",
    pe: "18.6x",
    pb: "4.2x",
    roe: "22.8%",
    high52: 301.5,
    low52: 152.6,
    thesis: "中期产业趋势仍在，但短线价格回到震荡中枢，AI 观察模型暂不把当前波动归类为有效反转。",
    risks: ["行业价格竞争", "海外需求和政策变化", "短线跌破关键支撑"],
    news: [latestNews[3], { time: "昨日", source: "行业快讯", title: "动力电池装机量环比保持增长", tone: "neutral" }]
  },
  "688981.SH": {
    ...watchlistQuotes[2],
    industry: "半导体制造",
    marketCap: "7,224亿",
    pe: "—",
    pb: "3.8x",
    roe: "6.4%",
    high52: 102.8,
    low52: 42.1,
    thesis: "盘中放量突破前期平台，市场关注度高。信号强度较高但波动同样放大，更适合等待回踩确认，不宜把单日脉冲当成完整趋势。",
    risks: ["高波动和获利回吐", "资本开支兑现周期较长", "外部供应链政策变化"],
    news: [latestNews[0], { time: "昨日", source: "行业快讯", title: "先进制程产能利用率边际回升", tone: "positive" }]
  }
};

export function getStockDetail(code: string): StockDetail {
  return detailMap[code] ?? {
    ...watchlistQuotes[3],
    code,
    name: "演示标的",
    industry: "综合",
    marketCap: "—",
    pe: "—",
    pb: "—",
    roe: "—",
    high52: 100,
    low52: 60,
    thesis: "当前为演示标的。接入 iFinD MCP 后，这里将由实时证券资料、行情、财务和公告数据生成。",
    risks: ["演示数据不代表真实行情", "请接入数据源后再进行研究"],
    news: latestNews.slice(0, 2)
  };
}

function marketForCode(code: string): Quote["market"] {
  if (code.includes(".SH") || code.startsWith("60") || code.startsWith("68")) return "沪";
  if (code.startsWith("30")) return "创";
  return "深";
}

function metric(value: unknown, suffix = "x") {
  const parsed = numberValue(value);
  return parsed ? `${parsed.toFixed(2)}${suffix}` : "—";
}

export async function getStockDetailAsync(code: string): Promise<StockDetail> {
  if (!isFreeDataEnabled()) return { ...getStockDetail(code), dataProvider: getProviderInfo() };
  try {
    const [historyPayload, conceptPayload] = await Promise.all([
      fetchFreeHistory(code),
      fetchFreeStockConcepts(code).catch(() => ({ items: [] }))
    ]);
    const history = historyPayload.items;
    const historySource = historyPayload.provider.startsWith("tencent-finance") ? "腾讯财经公开行情" : "BaoStock";
    const latest = history.at(-1);
    if (!latest) return { ...getStockDetail(code), dataProvider: getDemoFallbackProviderInfo("本地数据服务未返回历史行情，已回退演示数据") };
    const previous = history.at(-2) ?? latest;
    const price = numberValue(latest.close);
    const previousPrice = numberValue(latest.preclose) || numberValue(previous.close);
    const change = price - previousPrice;
    const changePercent = numberValue(latest.pctChg) || (previousPrice ? change / previousPrice * 100 : 0);
    const yearHistory = history.slice(-260).map((row) => numberValue(row.close)).filter(Boolean);
    const industry = conceptPayload.items[0]?.name ?? "A 股";
    const name = watchlistQuotes.find((quote) => quote.code === code)?.name ?? code;
    const signal = changePercent >= 3 ? "强势放量" : changePercent >= 0 ? "趋势观察" : "回撤观察";
    return {
      code,
      name,
      price,
      change,
      changePercent,
      volume: volumeLabel(numberValue(latest.amount)),
      market: marketForCode(code),
      signal,
      industry,
      marketCap: "—",
      pe: metric(latest.peTTM),
      pb: metric(latest.pbMRQ),
      roe: "—",
      high52: Math.max(...yearHistory, price),
      low52: Math.min(...yearHistory, price),
      thesis: `最新交易日 ${latest.date} 收盘 ${price.toFixed(2)}，涨跌幅 ${changePercent.toFixed(2)}%。当前页面使用${historySource}历史行情与同花顺公开题材信息生成基础观察。`,
      risks: ["免费公开数据可能存在延迟或缺失", "仅有行情与题材标签，尚未接入完整财务和公告原文", "短线涨跌不代表趋势已经确认"],
      news: [{ time: latest.date, source: `${historySource} / 同花顺公开页面`, title: `${industry}题材与行情数据已更新`, tone: "neutral" }],
      history: history.map((row) => ({ date: row.date, close: numberValue(row.close), changePercent: numberValue(row.pctChg) })),
      dataProvider: { ...getProviderInfo(), note: `${historySource} 历史行情 + 同花顺公开题材` }
    };
  } catch {
    return { ...getStockDetail(code), dataProvider: getDemoFallbackProviderInfo("本地数据服务未响应，已回退演示数据") };
  }
}

export type ProviderInfo = {
  mode: "demo" | "free-data" | "ifind-mcp";
  label: string;
  configured: boolean;
  note: string;
};

function getDemoFallbackProviderInfo(note: string): ProviderInfo {
  return { mode: "demo", label: "演示数据", configured: false, note };
}

function demoMarketSnapshot(note: string): MarketSnapshot {
  return {
    indexQuotes,
    watchlistQuotes,
    screenerUniverse,
    latestNews,
    provider: getDemoFallbackProviderInfo(note)
  };
}

export function getProviderInfo(): ProviderInfo {
  const configured = Boolean(process.env.IFIND_MCP_URL && process.env.IFIND_MCP_AUTH_KEY);
  const mode = process.env.MUCHEN_DATA_MODE === "ifind-mcp" && configured
    ? "ifind-mcp"
    : process.env.MUCHEN_DATA_MODE === "free-data"
      ? "free-data"
      : "demo";
  return mode === "ifind-mcp"
    ? { mode, label: "iFinD MCP", configured: true, note: "服务端 MCP 数据通道已配置" }
    : mode === "free-data"
      ? { mode, label: "本地免费数据", configured: true, note: "腾讯行情主源 / BaoStock 兜底 / 同花顺公开题材已接入" }
    : { mode, label: "演示数据", configured, note: configured ? "iFinD 已配置，当前仍使用演示模式" : "配置 iFinD MCP 后可切换真实数据" };
}

export interface MarketDataProvider {
  getStockDetail(code: string): Promise<StockDetail>;
}

export class DemoMarketDataProvider implements MarketDataProvider {
  async getStockDetail(code: string) {
    return getStockDetail(code);
  }
}

/**
 * iFinD MCP 的服务端适配器边界。
 * 业务层只依赖 MarketDataProvider；后续补齐 MCP initialize/tools/call
 * 握手和工具字段映射时，不需要改动页面与模拟盘模块。
 */
export class IfindMcpProvider implements MarketDataProvider {
  private getClient() {
    if (!process.env.IFIND_MCP_URL || !process.env.IFIND_MCP_AUTH_KEY) {
      throw new Error("IFIND_MCP_URL 和 IFIND_MCP_AUTH_KEY 未配置");
    }
    return new IfindMcpClient(process.env.IFIND_MCP_URL, process.env.IFIND_MCP_AUTH_KEY);
  }

  async listTools() {
    return this.getClient().listTools();
  }

  async getStockDetail(code: string): Promise<StockDetail> {
    if (!process.env.IFIND_MCP_URL || !process.env.IFIND_MCP_AUTH_KEY) throw new Error("IFIND_MCP_URL 和 IFIND_MCP_AUTH_KEY 未配置");
    throw new Error(`iFinD MCP 适配器待接入工具字段映射：${code}`);
  }
}
