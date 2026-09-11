const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const StockChart = require('../components/stock-chart.tsx').default;
const props = {code: '688981.SH', price: 91.03, high52: 100, low52: 60};
test('missing or single-bar live history never renders a simulated curve', () => {
  for (const history of [[], [{date: '2026-09-10', close: 91.03, changePercent: 1}]]) {
    const html = renderToStaticMarkup(React.createElement(StockChart, {...props, history}));
    assert.match(html, /历史行情不足/);
    assert.doesNotMatch(html, /<svg|（模拟）/);
  }
});
test('live history offers only real daily and weekly charts', () => {
  const history = [{date: '2026-09-09', close: 90, changePercent: 0}, {date: '2026-09-10', close: 91.03, changePercent: 1.14}];
  const html = renderToStaticMarkup(React.createElement(StockChart, {...props, history}));
  assert.match(html, /日收盘线 · 前复权/);
  assert.doesNotMatch(html, /分时|（模拟）/);
});
test('demo history remains explicitly labeled', () => {
  assert.match(renderToStaticMarkup(React.createElement(StockChart, props)), /日收盘线（模拟）/);
});
