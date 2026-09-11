"""No external network or optional data-service packages required."""
import ast
import pathlib
import unittest
from datetime import date
from unittest.mock import Mock

# Execute the original pure adaptation functions; do not duplicate their implementation.
source = pathlib.Path("services/muchen_free_data.py").read_text(encoding="utf-8")
tree = ast.parse(source)
functions = {"_number", "_query_tencent_history", "_query_history_with_provider", "_consecutive_positive_days", "_build_topics_payload"}
namespace = {"date": date, "Any": object}
class HttpError(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        super().__init__(detail)
namespace["HTTPException"] = HttpError
exec(compile(ast.fix_missing_locations(ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0)] + [item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name in functions], type_ignores=[])), "gateway-functions", "exec"), namespace)

class HistoryTests(unittest.TestCase):
    def setUp(self):
        namespace["_tencent_symbol"] = lambda code: "sh600519"
        namespace["_normalise_stock_code"] = lambda code: "sh.600519"
        namespace["_display_stock_code"] = lambda code: "600519.SH"

    def test_historical_date_keeps_its_own_ohlc_and_prior_close(self):
        namespace["_tencent_get"] = Mock(return_value=Mock(json=lambda: {"data": {"sh600519": {"qfqday": [
            ["2026-09-01", "9", "10", "11", "8", "100"],
            ["2026-09-02", "11", "12", "13", "10", "120"],
            ["2026-09-09", "90", "99", "100", "89", "1000"]
        ]}}}))
        latest = Mock(return_value={"600519.SH": {"price": 99, "as_of": "2026-09-09"}})
        namespace["_fetch_tencent_quotes"] = latest
        result = namespace["_query_tencent_history"]("600519.SH", "2026-09-02", "2026-09-02")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["date"], "2026-09-02")
        self.assertEqual(result[0]["close"], "12")
        self.assertEqual(result[0]["high"], "13")
        self.assertEqual(result[0]["pctChg"], "20.0000")
        self.assertEqual(result[0]["adjustflag"], "2")
        latest.assert_not_called()

    def test_adjustment_flags_do_not_silently_switch_to_qfq(self):
        import threading
        namespace["_baostock_lock"] = threading.Lock()
        namespace["_ensure_baostock_login"] = lambda: None
        result = Mock(error_code="0")
        result.next.return_value = False
        bs = Mock()
        bs.query_history_k_data_plus.return_value = result
        namespace["bs"] = bs
        namespace["_query_history_with_provider"]("600519.SH", "2026-01-01", "2026-02-01", "d", "3")
        self.assertEqual(bs.query_history_k_data_plus.call_args.kwargs["adjustflag"], "3")
        with self.assertRaises(HttpError):
            namespace["_query_history_with_provider"]("600519.SH", "2026-02-02", "2026-01-01", "d", "3")

    def test_continuation_stops_at_the_last_non_positive_day(self):
        self.assertEqual(namespace["_consecutive_positive_days"]([{"change_percent": i} for i in [1, 2, -1, 1, 2]]), 2)
        self.assertEqual(namespace["_consecutive_positive_days"]([{"change_percent": 0}]), 0)

    def test_one_failed_topic_does_not_discard_other_topics(self):
        namespace["_topic_definitions"] = [{"id": "ok"}, {"id": "failed"}]
        def build(definition):
            if definition["id"] == "failed":
                raise RuntimeError("upstream offline")
            return {"id": "ok", "members": [{}]}
        namespace["_build_topic_snapshot"] = build
        result = namespace["_build_topics_payload"]()
        self.assertEqual([item["id"] for item in result["items"]], ["ok"])
        self.assertEqual(result["errors"], ["failed"])

if __name__ == "__main__":
    unittest.main()
