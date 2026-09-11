const { test, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "development";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "";
process.env.MUCHEN_SESSION_SECRET = "test-session-key-".repeat(4);
process.env.MUCHEN_INVITE_CODE = "TEST-INVITE-ONLY";
process.env.MUCHEN_ADMIN_EMAILS = "admin@example.test";
process.env.RESEND_API_KEY = "test-mail-key";
process.env.MUCHEN_MAIL_FROM = "Test <login@example.test>";
process.env.MUCHEN_DATA_MODE = "demo";
const auth = require("../lib/auth.ts");
const email = require("../lib/email-login.ts");
const users = require("../lib/users.ts");
const invites = require("../lib/repository.ts");
const store = require("../lib/workspace.ts");
const access = require("../lib/access.ts");
const { getDb } = require("../lib/db.ts");
const login = require("../app/api/auth/login/route.ts");
const admin = require("../app/api/admin/provider/route.ts");
const orders = require("../app/api/paper/orders/route.ts");
const research = require("../app/api/research/route.ts");
const watchlist = require("../app/api/watchlist/route.ts");
const fs = require("node:fs");
const originalFetch = global.fetch;
let delivered = new Map();
global.fetch = async (url, init) => {
  if (url !== "https://api.resend.com/emails") throw new Error("Unexpected external request: " + url);
  const body = JSON.parse(init.body);
  delivered.set(body.to[0], body.text.match(/\d{6}/)[0]);
  return Response.json({ id: "test-mail" });
};
const request = (path, body, token) => new Request("http://localhost" + path, {
  method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { cookie: auth.sessionCookieName + "=" + token } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test("authenticated workflows and isolation", async (t) => {
  const db = getDb();
  if (db) {
    // Only the explicitly supplied, disposable TEST_DATABASE_URL is used.
    await db.query(fs.readFileSync("db/schema.sql", "utf8"));
    await db.query("TRUNCATE users, invite_codes, email_login_codes CASCADE");
    await db.query("INSERT INTO invite_codes(code, max_uses) VALUES ($1, 100)", [process.env.MUCHEN_INVITE_CODE]);
  }
  await t.test("an invite and self-declared admin email cannot log in without mailbox proof", async () => {
    const response = await login.POST(request("/api/auth/login", { email: "admin@example.test", inviteCode: process.env.MUCHEN_INVITE_CODE }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  });
  await t.test("old signed email-only sessions are invalid, including administrator emails", async () => {
    const token = await auth.createSignedSession("admin@example.test", process.env.MUCHEN_SESSION_SECRET);
    assert.equal(await auth.verifySession(token), null);
    assert.equal((await admin.POST(request("/api/admin/provider", {}, token))).status, 401);
  });
  await t.test("OTP is single use, email-bound and rate limited", async () => {
    await email.requestEmailCode("otp@example.test");
    const code = delivered.get("otp@example.test");
    assert.equal(await email.consumeEmailCode("another@example.test", code), false);
    await assert.rejects(email.requestEmailCode("otp@example.test"), (error) => error.status === 429);
    assert.equal(await email.consumeEmailCode("otp@example.test", code), true);
    assert.equal(await email.consumeEmailCode("otp@example.test", code), false);
  });
  await t.test("five failed OTP attempts invalidate even the correct code", async () => {
    await email.requestEmailCode("attempts@example.test");
    const code = delivered.get("attempts@example.test");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) assert.equal(await email.consumeEmailCode("attempts@example.test", wrong), false);
    assert.equal(await email.consumeEmailCode("attempts@example.test", code), false);
  });
  await t.test("concurrent OTP verification succeeds only once", async () => {
    await email.requestEmailCode("parallel@example.test");
    const code = delivered.get("parallel@example.test");
    assert.deepEqual((await Promise.all([email.consumeEmailCode("parallel@example.test", code), email.consumeEmailCode("parallel@example.test", code)])).sort(), [false, true]);
  });
  await t.test("mail delivery failure invalidates the generated code", async () => {
    const mailFetch = global.fetch;
    global.fetch = async (...args) => { await mailFetch(...args); return new Response(null, {status: 500}); };
    try {
      await assert.rejects(email.requestEmailCode("failed@example.test"), error => error.status === 503);
      assert.equal(await email.consumeEmailCode("failed@example.test", delivered.get("failed@example.test")), false);
    } finally { global.fetch = mailFetch; }
  });
  async function logIn(emailAddress) {
    await email.requestEmailCode(emailAddress);
    const response = await login.POST(request("/api/auth/login", { email: emailAddress, inviteCode: process.env.MUCHEN_INVITE_CODE, emailCode: delivered.get(emailAddress) }));
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie").split(";")[0].split("=")[1];
  }
  const token = await logIn("member@example.test");
  const token2 = await logIn("other@example.test");
  const uid = (await auth.verifySession(token)).userId;
  const uid2 = (await auth.verifySession(token2)).userId;
  await t.test("tampered and expired sessions cannot read personal data", async () => {
    const expired = await auth.createSignedSession("member@example.test", process.env.MUCHEN_SESSION_SECRET, -1, uid);
    const tampered = token.split(".")[0] + ".invalid-signature";
    for (const invalid of [expired, tampered]) {
      assert.equal((await watchlist.GET(request("/api/watchlist", null, invalid))).status, 401);
      assert.equal((await research.GET(request("/api/research", null, invalid))).status, 401);
    }
  });
  await t.test("member cannot access admin provider and verified administrator can", async () => {
    assert.equal((await admin.POST(request("/api/admin/provider", {}, token))).status, 403);
    const adminToken = await logIn("admin@example.test");
    assert.equal((await access.requireUser(request("/", null, adminToken), true)).role, "ADMIN");
  });
  await t.test("persisted watchlist uses the authenticated user, not a client user id", async () => {
    assert.equal((await watchlist.POST(request("/api/watchlist", { code: "600519.SH", saved: true, userId: uid2 }, token))).status, 200);
    assert.deepEqual(await store.listWatchlist(uid), ["600519.SH"]);
    assert.deepEqual(await store.listWatchlist(uid2), []);
    await watchlist.POST(request("/api/watchlist", { code: "600519.SH", saved: false }, token));
    assert.deepEqual(await store.listWatchlist(uid), []);
  });
  await t.test("research is saved with evidence and the user's question without invented confidence", async () => {
    const response = await research.POST(request("/api/research", { code: "688981.SH", question: "需要验证什么？" }, token));
    assert.equal(response.status, 200);
    const { report } = await response.json();
    assert.equal(report.confidence, "未评估");
    assert.equal(report.question, "需要验证什么？");
    assert.ok(report.evidence.length);
    assert.equal((await store.listReports(uid))[0].id, report.id);
    assert.deepEqual(await store.listReports(uid2), []);
  });
  await t.test("server prices override client input and duplicate orders charge once", async () => {
    const body = { code: "688981.SH", side: "BUY", shares: 100, price: 0.01, idempotencyKey: crypto.randomUUID() };
    const responses = await Promise.all([orders.POST(request("/api/paper/orders", body, token)), orders.POST(request("/api/paper/orders", body, token))]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    const account = await store.getPaperAccount(uid);
    assert.equal(account.orders.length, 1);
    assert.equal(account.orders[0].price, 91.03);
    assert.equal(account.cashCents, store.initialCashCents - 910300);
    assert.equal(account.positions[0].shares, 100);
    assert.equal((await store.getPaperAccount(uid2)).orders.length, 0);
    const altered = await orders.POST(request("/api/paper/orders", { ...body, shares: 200 }, token));
    assert.equal(altered.status, 409);
    process.env.MUCHEN_DATA_MODE = "free-data";
    try {
      // The test fetch rejects all quote requests, but a completed replay must still work.
      assert.equal((await orders.POST(request("/api/paper/orders", body, token))).status, 200);
      assert.deepEqual(await store.getPaperAccount(uid), account);
    } finally { process.env.MUCHEN_DATA_MODE = "demo"; }
  });
  await t.test("overselling and insufficient funds leave the account unchanged", async () => {
    const before = await store.getPaperAccount(uid);
    for (const body of [{ code: "688981.SH", side: "SELL", shares: 200 }, { code: "600519.SH", side: "BUY", shares: 100 }]) {
      assert.equal((await orders.POST(request("/api/paper/orders", { ...body, idempotencyKey: crypto.randomUUID() }, token))).status, 409);
    }
    assert.deepEqual(await store.getPaperAccount(uid), before);
    const response = await orders.POST(request("/api/paper/orders", { code: "688981.SH", side: "SELL", shares: 100, idempotencyKey: crypto.randomUUID() }, token));
    assert.equal(response.status, 200);
    const after = await store.getPaperAccount(uid);
    assert.equal(after.cashCents, store.initialCashCents);
    assert.equal(after.positions.length, 0);
  });
  await t.test("concurrent distinct buys cannot overdraw the same account", async () => {
    const responses = await Promise.all([1, 2].map(() => orders.POST(request("/api/paper/orders", { code: "688981.SH", side: "BUY", shares: 1000, idempotencyKey: crypto.randomUUID() }, token2))));
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    assert.equal((await store.getPaperAccount(uid2)).positions[0].shares, 1000);
  });
  await t.test("unknown stocks cannot create demo fills", async () => {
    const response = await orders.POST(request("/api/paper/orders", { code: "999999.SH", side: "BUY", shares: 100, idempotencyKey: crypto.randomUUID() }, token));
    assert.equal(response.status, 400);
  });
  await t.test("support-created demo invites can be redeemed once per user and respect revocation", () => {
    const invite = invites.createDemoInvite(1, 7);
    assert.equal(invites.redeemDemoInvite("first@example.test", invite.code).ok, true);
    assert.equal(invites.redeemDemoInvite("first@example.test", invite.code).ok, true);
    assert.equal(invites.redeemDemoInvite("second@example.test", invite.code).ok, false);
    invites.revokeDemoInvite(invite.code);
    assert.equal(invites.redeemDemoInvite("first@example.test", invite.code).ok, false);
  });
});
after(async () => { global.fetch = originalFetch; if (getDb()) await getDb().end(); });
