"""网关输入白名单回归测试：只从源码提取纯函数，无需安装第三方依赖。"""
import ast
import pathlib
import re
import unittest
from datetime import date, timedelta

source = pathlib.Path("services/muchen_free_data.py").read_text(encoding="utf-8")
tree = ast.parse(source)


class HttpError(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        super().__init__(detail)


body = [
    ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0),
    ast.Import(names=[ast.alias(name="re")]),
]
names = {"_normalise_stock_code", "_parse_iso_date"}
for item in tree.body:
    if isinstance(item, ast.Assign) and any(
        isinstance(target, ast.Name) and target.id == "_STOCK_CODE_PATTERN" for target in item.targets
    ):
        body.append(item)
    if isinstance(item, ast.FunctionDef) and item.name in names:
        body.append(item)

namespace = {"HTTPException": HttpError, "date": date, "timedelta": timedelta}
exec(compile(ast.fix_missing_locations(ast.Module(body=body, type_ignores=[])), "gateway-security", "exec"), namespace)


class GatewayInputTests(unittest.TestCase):
    def test_rejects_url_query_injection_and_path_traversal(self):
        for bad in [
            "600000&q=sh000001",
            "600000#fragment",
            "600000.SH?x=1",
            "../etc/passwd",
            "SH.600000;ls",
            "6" * 50,
            "",
        ]:
            with self.subTest(bad=bad), self.assertRaises(HttpError):
                namespace["_normalise_stock_code"](bad)

    def test_accepts_standard_code_formats(self):
        normalise = namespace["_normalise_stock_code"]
        self.assertEqual(normalise("600519.SH"), "sh.600519")
        self.assertEqual(normalise("SH.600519"), "sh.600519")
        self.assertEqual(normalise("600519"), "sh.600519")
        self.assertEqual(normalise("000001.SZ"), "sz.000001")

    def test_rejects_invalid_date_parameters(self):
        parse = namespace["_parse_iso_date"]
        with self.assertRaises(HttpError):
            parse("2026-01-01&x=1", "start_date")
        with self.assertRaises(HttpError):
            parse("2099-01-01", "start_date")
        with self.assertRaises(HttpError):
            parse("not-a-date", "start_date")
        self.assertEqual(parse("2026-01-01", "start_date"), date(2026, 1, 1))


if __name__ == "__main__":
    unittest.main()
