const { test, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "development";
process.env.DATABASE_URL = "";
process.env.MUCHEN_DATA_MODE = "free-data";
const market = require("../lib/market.ts");
const originalFetch = global.fetch;
const historyRow = {date: '2026-09-10', close: '90', preclose: '89', high: '92', low: '88', pctChg: '1.12'};
test('adjusted historical fallback is labeled in the saved quote basis', async () => {
  global.fetch = async (url) => Response.json(String(url).includes('/history') ? {provider: 'tencent-finance', items: [historyRow]} : {items: []});
  const stock = await market.getStockDetailAsync('688981.SH');
  assert.equal(stock.priceLabel, '历史收盘价（前复权）');
});
test('valid latest quotes remain usable when history fails', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/history')) throw new Error('history offline');
    return Response.json({provider: 'tencent-finance', items: String(url).includes('/api/quotes') ? [{code: '688981.SH', price: 91, change: 1, change_percent: 1.11, amount: 100, as_of: '2026-09-10'}] : []});
  };
  const stock = await market.getStockDetailAsync('688981.SH');
  assert.equal(stock.availability, 'live');
  assert.equal(stock.price, 91);
  assert.deepEqual(stock.history, []);
});
test('future-dated execution quotes are rejected', async () => {
  global.fetch = async () => Response.json({provider: 'tencent-finance', items: [{code: '688981.SH', price: 91, as_of: new Date(Date.now() + 86400000).toISOString()}]});
  await assert.rejects(market.getExecutionQuote('688981.SH'), /时间/);
});
test('empty or unknown live topics do not introduce demo leaders or discard valid topics', async () => {
  const { fetchFreeTopics } = require('../lib/free-data.ts');
  const topic = {id: 'semiconductor', name: '半导体', members: [{code: '688981.SH', name: '中芯国际', price: 91, change_percent: 1, amount: '100', status: '观察', rank: 1}], history: []};
  global.fetch = async () => Response.json({items: [{...topic, id: 'ai-compute', members: []}, {...topic, id: 'unknown-topic'}, topic]});
  const topics = await fetchFreeTopics();
  assert.deepEqual(topics.map(item => item.id), ['semiconductor']);
  assert.equal(topics[0].leader.code, '688981.SH');
});
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
test('invalid, missing and expired quotes cannot fill orders', async () => {
  for (const quote of [null, {price: 0, as_of: new Date().toISOString()}, {price: 91, as_of: 'invalid'}, {price: 91, as_of: new Date(Date.now() - 8 * 86400000).toISOString()}]) {
    global.fetch = async () => Response.json({provider: 'tencent-finance', items: quote ? [{code: '688981.SH', ...quote}] : []});
    await assert.rejects(market.getExecutionQuote('688981.SH'), error => error.status === 503);
  }
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
