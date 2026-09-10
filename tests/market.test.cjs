const { test, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "development";
process.env.DATABASE_URL = "";
process.env.MUCHEN_DATA_MODE = "free-data";
const market = require("../lib/market.ts");
const originalFetch = global.fetch;
test("partial live quotes never inherit demo prices, scores or valuation", async () => {
  global.fetch = async () => Response.json({ provider: "tencent-finance", items: [{ code: "600519.SH", as_of: "2026-09-09", price: 1234, change: 1, change_percent: 0.2, amount: 100 }] });
  const snapshot = await market.getMarketSnapshot();
  assert.equal(snapshot.watchlistQuotes.length, 1);
  assert.equal(snapshot.screenerUniverse[0].score, null);
  assert.equal(snapshot.screenerUniverse[0].valuation, "未评估");
  const quotes = await market.getQuotesForCodes(["600519.SH", "688981.SH"]);
  assert.equal(quotes[1].availability, "missing");
});
test("outages show missing data instead of fabricated demo values", async () => {
  global.fetch = async () => { throw new Error("offline"); };
  assert.equal((await market.getMarketSnapshot()).watchlistQuotes.length, 0);
  assert.equal((await market.getStockDetailAsync("600519.SH")).availability, "missing");
  await assert.rejects(market.getExecutionQuote("600519.SH"));
});
test("iFinD connection configuration does not claim live data or allow demo fills", async () => {
  process.env.MUCHEN_DATA_MODE = "ifind-mcp";
  process.env.IFIND_MCP_URL = "https://example.test";
  process.env.IFIND_MCP_AUTH_KEY = "test-key";
  assert.equal(market.getProviderInfo().mode, "demo");
  assert.match(market.getProviderInfo().note, /尚未接通/);
  await assert.rejects(market.getExecutionQuote("600519.SH"));
});
after(() => { global.fetch = originalFetch; });
