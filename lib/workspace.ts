import { getDb } from "@/lib/db";
import { AppError } from "@/lib/access";

export type ResearchNote = {
  id: string; code: string; question: string; conclusion: string; confidence: string;
  positives: string[]; risks: string[]; dataStatus: string; asOf: string;
  generatedAt: string; method: string; evidence: Array<{ label: string; value: string; source: string; asOf: string }>;
};
export type PaperPosition = { code: string; shares: number; costCents: number };
export type PaperOrder = { id: string; code: string; side: "BUY" | "SELL"; shares: number; price: number; amountCents: number; asOf: string; source: string; createdAt: string };
export type PaperAccount = { cashCents: number; positions: PaperPosition[]; orders: PaperOrder[] };
export const initialCashCents = 10_000_000;
const globals = globalThis as typeof globalThis & { muchenWorkspaces?: Map<string, { watchlist: string[]; reports: ResearchNote[]; account: PaperAccount }> };
const workspaces = globals.muchenWorkspaces ??= new Map<string, { watchlist: string[]; reports: ResearchNote[]; account: PaperAccount }>();
function memory(userId: string) {
  if (process.env.NODE_ENV === "production") throw new AppError("生产环境需要配置数据库", 503);
  if (!workspaces.has(userId)) workspaces.set(userId, { watchlist: [], reports: [], account: { cashCents: initialCashCents, positions: [], orders: [] } });
  return workspaces.get(userId)!;
}

export async function listWatchlist(userId: string): Promise<string[]> {
  const db = getDb();
  return db ? (await db.query<{ code: string }>("SELECT code FROM watchlist_items WHERE user_id = $1 ORDER BY created_at DESC", [userId])).rows.map((row) => row.code) : [...memory(userId).watchlist];
}
export async function changeWatchlist(userId: string, code: string, saved: boolean) {
  const db = getDb();
  if (db) {
    if (saved) await db.query("INSERT INTO watchlist_items(user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, code]);
    else await db.query("DELETE FROM watchlist_items WHERE user_id = $1 AND code = $2", [userId, code]);
  } else {
    const workspace = memory(userId);
    workspace.watchlist = workspace.watchlist.filter((item) => item !== code);
    if (saved) workspace.watchlist.unshift(code);
  }
}
export async function saveReport(userId: string, report: ResearchNote) {
  const db = getDb();
  if (db) await db.query("INSERT INTO research_reports(id, user_id, code, question, report) VALUES ($1, $2, $3, $4, $5)", [report.id, userId, report.code, report.question, JSON.stringify(report)]);
  else memory(userId).reports.unshift(structuredClone(report));
}
export async function listReports(userId: string): Promise<ResearchNote[]> {
  const db = getDb();
  return db ? (await db.query<{ report: ResearchNote }>("SELECT report FROM research_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId])).rows.map((row) => row.report) : structuredClone(memory(userId).reports.slice(0, 100));
}

type Queryable = { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };
async function readAccount(db: Queryable, userId: string): Promise<PaperAccount> {
  const cash = await db.query("SELECT cash_cents FROM paper_accounts WHERE user_id = $1", [userId]);
  const positions = await db.query("SELECT code, shares, cost_cents FROM paper_positions WHERE user_id = $1 ORDER BY code", [userId]);
  const orders = await db.query("SELECT id, code, side, shares, price, amount_cents, quote_as_of, source, created_at FROM paper_orders WHERE user_id = $1 AND status = 'FILLED' ORDER BY created_at DESC", [userId]);
  return {
    cashCents: Number(cash.rows[0]?.cash_cents ?? initialCashCents),
    positions: positions.rows.map((row) => ({ code: String(row.code), shares: Number(row.shares), costCents: Number(row.cost_cents) })),
    orders: orders.rows.map((row) => ({ id: String(row.id), code: String(row.code), side: row.side as "BUY" | "SELL", shares: Number(row.shares), price: Number(row.price), amountCents: Number(row.amount_cents), asOf: String(row.quote_as_of), source: String(row.source), createdAt: (row.created_at as Date).toISOString() }))
  };
}
export async function getPaperAccount(userId: string): Promise<PaperAccount> {
  const db = getDb();
  if (!db) return structuredClone(memory(userId).account);
  const client = await db.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const account = await readAccount(client, userId);
    await client.query("COMMIT");
    return account;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export function applyPaperOrder(account: PaperAccount, order: PaperOrder) {
  const duplicate = account.orders.find((item) => item.id === order.id);
  if (duplicate) {
    if (duplicate.code !== order.code || duplicate.side !== order.side || duplicate.shares !== order.shares) throw new AppError("同一订单编号不能用于不同订单", 409);
    return duplicate;
  }
  if (!Number.isSafeInteger(order.shares) || order.shares < 100 || order.shares % 100 || order.shares > 1_000_000 || !Number.isFinite(order.price) || order.price <= 0) throw new AppError("订单参数无效");
  order.amountCents = Math.round(order.price * 100) * order.shares;
  if (!Number.isSafeInteger(order.amountCents) || order.amountCents <= 0) throw new AppError("订单金额无效");
  let position = account.positions.find((item) => item.code === order.code);
  if (order.side === "BUY") {
    if (order.amountCents > account.cashCents) throw new AppError("可用模拟资金不足", 409);
    if (!position) { position = { code: order.code, shares: 0, costCents: 0 }; account.positions.push(position); }
    position.shares += order.shares;
    position.costCents += order.amountCents;
    account.cashCents -= order.amountCents;
  } else {
    if (!position || position.shares < order.shares) throw new AppError("可卖持仓不足", 409);
    position.costCents -= Math.round(position.costCents * order.shares / position.shares);
    position.shares -= order.shares;
    account.cashCents += order.amountCents;
    account.positions = account.positions.filter((item) => item.shares > 0);
  }
  account.orders.unshift(order);
  return order;
}

export async function executePaperOrder(userId: string, order: PaperOrder): Promise<PaperOrder> {
  const db = getDb();
  if (!db) return structuredClone(applyPaperOrder(memory(userId).account, order));
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO paper_accounts(user_id, cash_cents) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, initialCashCents]);
    await client.query("SELECT user_id FROM paper_accounts WHERE user_id = $1 FOR UPDATE", [userId]);
    const account = await readAccount(client, userId);
    const existing = account.orders.some((item) => item.id === order.id);
    const result = applyPaperOrder(account, order);
    if (!existing) {
      await client.query("UPDATE paper_accounts SET cash_cents = $2 WHERE user_id = $1", [userId, account.cashCents]);
      await client.query("DELETE FROM paper_positions WHERE user_id = $1 AND code = $2", [userId, order.code]);
      const position = account.positions.find((item) => item.code === order.code);
      if (position) await client.query("INSERT INTO paper_positions(user_id, code, shares, cost_cents) VALUES ($1, $2, $3, $4)", [userId, position.code, position.shares, position.costCents]);
      await client.query(`INSERT INTO paper_orders(id, user_id, code, side, shares, price, status, amount_cents, quote_as_of, source)
        VALUES ($1, $2, $3, $4, $5, $6, 'FILLED', $7, $8, $9)`,
        [order.id, userId, order.code, order.side, order.shares, order.price, order.amountCents, order.asOf, order.source]);
    }
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
