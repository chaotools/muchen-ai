const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "development";
process.env.DATABASE_URL = "";
process.env.MUCHEN_SESSION_SECRET = "x".repeat(48);
process.env.MUCHEN_INVITE_CODE = "TEST-INVITE-ONLY";
process.env.MUCHEN_SUPPORT_EMAILS = "support@example.test";
process.env.MUCHEN_SUPPORT_ACCESS_KEY = "s".repeat(48);
process.env.MUCHEN_SUPPORT_SESSION_SECRET = "y".repeat(48);
delete process.env.MUCHEN_SESSION_EPOCH;

const auth = require("../lib/auth.ts");
const supportAuth = require("../lib/support-auth.ts");
const runtime = require("../lib/runtime.ts");
const emailRate = require("../lib/email-send-rate-limit.ts");
const supportRate = require("../lib/support-login-rate-limit.ts");

test("M-01 会话密钥不再回退到公开仓库里的硬编码常量", async () => {
  const token = await auth.createSession("member@example.test", "user-1");
  const saved = process.env.MUCHEN_SESSION_SECRET;
  delete process.env.MUCHEN_SESSION_SECRET;
  try {
    assert.equal(await auth.verifySession(token), null);
    await assert.rejects(() => auth.createSession("member@example.test", "user-1"));
  } finally {
    process.env.MUCHEN_SESSION_SECRET = saved;
  }
  assert.ok(await auth.verifySession(token));
});

test("M-01 演示邀请码不再硬编码", () => {
  const saved = process.env.MUCHEN_INVITE_CODE;
  delete process.env.MUCHEN_INVITE_CODE;
  try {
    assert.equal(auth.getInviteCode(), "");
  } finally {
    process.env.MUCHEN_INVITE_CODE = saved;
  }
  assert.equal(auth.getInviteCode(), saved);
});

test("M-01 持久化运行形态不依赖 NODE_ENV", () => {
  const savedDb = process.env.DATABASE_URL;
  const savedNode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://u:p@db.example.test:5432/muchen";
    assert.equal(runtime.isProductionLike(), true);
    process.env.DATABASE_URL = "";
    assert.equal(runtime.isProductionLike(), false);
  } finally {
    process.env.NODE_ENV = savedNode;
    process.env.DATABASE_URL = savedDb;
  }
});

test("M-02 可信客户端 IP 忽略可伪造的最左 XFF", () => {
  const forwarded = new Request("http://localhost/", { headers: { "x-forwarded-for": "1.2.3.4, 9.9.9.9" } });
  assert.equal(runtime.trustedClientIp(forwarded), "9.9.9.9");
  const real = new Request("http://localhost/", { headers: { "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.2.3.4" } });
  assert.equal(runtime.trustedClientIp(real), "8.8.8.8");
});

test("M-04 发信限流按 IP 与全局生效", () => {
  emailRate.resetEmailSendRateLimit();
  for (let i = 0; i < 20; i++) emailRate.assertEmailSendAllowed("1.1.1.1");
  assert.throws(() => emailRate.assertEmailSendAllowed("1.1.1.1"), (error) => error.status === 429);
  assert.doesNotThrow(() => emailRate.assertEmailSendAllowed("2.2.2.2"));

  emailRate.resetEmailSendRateLimit();
  for (let i = 0; i < 100; i++) emailRate.assertEmailSendAllowed(`10.0.0.${i}`);
  assert.throws(() => emailRate.assertEmailSendAllowed("10.0.1.1"), (error) => error.status === 429);
  emailRate.resetEmailSendRateLimit();
});

test("M-07 用户会话与客服会话互不通用", async () => {
  const userToken = await auth.createSession("support@example.test", "user-1");
  const supportToken = await supportAuth.createSupportSession("support@example.test");
  assert.equal(await supportAuth.verifySupportSession(userToken), null);
  assert.equal(await auth.verifySession(supportToken), null);
  assert.ok(await auth.verifySession(userToken));
  assert.ok(await supportAuth.verifySupportSession(supportToken));
});

test("M-07 客服密钥与用户密钥相同时拒绝配置", () => {
  const saved = process.env.MUCHEN_SUPPORT_SESSION_SECRET;
  process.env.MUCHEN_SUPPORT_SESSION_SECRET = process.env.MUCHEN_SESSION_SECRET;
  try {
    assert.match(supportAuth.getSupportConfigurationError(), /不能与用户会话密钥相同/);
  } finally {
    process.env.MUCHEN_SUPPORT_SESSION_SECRET = saved;
  }
  assert.equal(supportAuth.getSupportConfigurationError(), null);
});

test("M-07 轮换会话 epoch 后旧会话失效", async () => {
  const token = await auth.createSession("member@example.test", "user-1");
  try {
    assert.ok(await auth.verifySession(token));
    process.env.MUCHEN_SESSION_EPOCH = "1";
    assert.equal(await auth.verifySession(token), null);
  } finally {
    delete process.env.MUCHEN_SESSION_EPOCH;
  }
});

test("M-07 移出客服名单后已签发会话立即失效", async () => {
  const token = await supportAuth.createSupportSession("support@example.test");
  const saved = process.env.MUCHEN_SUPPORT_EMAILS;
  try {
    process.env.MUCHEN_SUPPORT_EMAILS = "someone-else@example.test";
    assert.equal(await supportAuth.verifySupportSession(token), null);
  } finally {
    process.env.MUCHEN_SUPPORT_EMAILS = saved;
  }
  assert.ok(await supportAuth.verifySupportSession(token));
});

test("M-03 客服登录拒绝错误密钥并接受正确密钥", async () => {
  const supportLogin = require("../app/api/support/auth/login/route.ts");
  const make = (accessKey) => new Request("http://localhost/api/support/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "7.7.7.7" },
    body: JSON.stringify({ email: "support@example.test", accessKey })
  });
  const bad = await supportLogin.POST(make("wrong-key"));
  assert.equal(bad.status, 401);
  supportRate.clearSupportLoginFailures(make("wrong-key"));
  const good = await supportLogin.POST(make(process.env.MUCHEN_SUPPORT_ACCESS_KEY));
  assert.equal(good.status, 200);
  assert.match(good.headers.get("set-cookie") || "", /Secure/);
});

test("M-02 客服失败限流不能被伪造 XFF 绕过", () => {
  const make = () => new Request("http://localhost/", {
    headers: { "x-forwarded-for": `${Math.random()}, 9.9.9.9` }
  });
  for (let i = 0; i < 5; i++) supportRate.recordSupportLoginFailure(make());
  assert.ok(supportRate.getSupportLoginRetryAfterSeconds(make()) > 0);
});
