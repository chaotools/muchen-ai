// 邮箱验证码接口的全局 / 按 IP 限流。lib/email-login.ts 里的按邮箱限流只防止
// 单个收件箱被轰炸，攻击者换邮箱（或 user+tag 变体）即可无限触发 Resend 发信。
import { AppError } from "@/lib/access";

const WINDOW_MS = 60 * 60_000;
const MAX_PER_IP = 20;
const MAX_GLOBAL = 100;
const MAX_TRACKED_IPS = 5_000;
const OVERFLOW_KEY = "__shared__";

type Bucket = { stamps: number[] };
const buckets = new Map<string, Bucket>();
let globalStamps: number[] = [];

function prune(stamps: number[], now: number) {
  while (stamps.length && now - stamps[0] >= WINDOW_MS) stamps.shift();
  return stamps;
}

function sweep(now: number) {
  if (buckets.size < MAX_TRACKED_IPS) return;
  for (const [key, bucket] of buckets) {
    if (!prune(bucket.stamps, now).length) buckets.delete(key);
  }
}

export function assertEmailSendAllowed(clientIp: string) {
  const now = Date.now();
  prune(globalStamps, now);
  if (globalStamps.length >= MAX_GLOBAL) throw new AppError("邮件验证服务繁忙，请稍后再试", 429);

  sweep(now);
  let key = (clientIp || "unknown").trim().slice(0, 128) || "unknown";
  // 桶数量有上限；超限后新 IP 共用同一个桶，既保证内存有界，也保留全局限速。
  if (!buckets.has(key) && buckets.size >= MAX_TRACKED_IPS) key = OVERFLOW_KEY;
  const bucket = buckets.get(key) ?? { stamps: [] };
  buckets.set(key, bucket);
  const stamps = prune(bucket.stamps, now);
  if (stamps.length >= MAX_PER_IP) throw new AppError("邮件验证请求过于频繁，请稍后再试", 429);
  stamps.push(now);
  globalStamps.push(now);
}

/** 仅供测试隔离用例状态。 */
export function resetEmailSendRateLimit() {
  buckets.clear();
  globalStamps = [];
}
