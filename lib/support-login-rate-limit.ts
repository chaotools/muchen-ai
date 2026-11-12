import { trustedClientIp } from "@/lib/runtime";

const windowMs = 10 * 60 * 1000;
const maximumFailures = 5;
const MAX_TRACKED_KEYS = 10_000;
const OVERFLOW_KEY = "__shared__";

type Attempt = {
  failures: number;
  firstFailureAt: number;
};

const attempts = new Map<string, Attempt>();

/**
 * 之前取 X-Forwarded-For 的最左值（客户端可任意伪造），换一个值就能绕过锁。
 * 现在使用可信代理追加/覆盖的地址；同时给 Map 设硬上限，超限后新来源
 * 共用同一个桶，保证内存有界且仍保留全局限速。
 */
function resolveKey(request: Request) {
  const raw = trustedClientIp(request);
  if (attempts.has(raw) || attempts.size < MAX_TRACKED_KEYS) return raw;
  return OVERFLOW_KEY;
}

function pruneExpiredAttempts(now: number) {
  if (attempts.size < 1_000) return;
  for (const [key, attempt] of attempts) {
    if (now - attempt.firstFailureAt >= windowMs) attempts.delete(key);
  }
}

export function getSupportLoginRetryAfterSeconds(request: Request) {
  const now = Date.now();
  const key = resolveKey(request);
  const attempt = attempts.get(key);
  if (!attempt) return 0;
  const elapsed = now - attempt.firstFailureAt;
  if (elapsed >= windowMs) {
    attempts.delete(key);
    return 0;
  }
  if (attempt.failures < maximumFailures) return 0;
  return Math.ceil((windowMs - elapsed) / 1000);
}

export function recordSupportLoginFailure(request: Request) {
  const now = Date.now();
  pruneExpiredAttempts(now);
  const key = resolveKey(request);
  const attempt = attempts.get(key);
  if (!attempt || now - attempt.firstFailureAt >= windowMs) {
    attempts.set(key, { failures: 1, firstFailureAt: now });
    return;
  }
  attempt.failures += 1;
}

export function clearSupportLoginFailures(request: Request) {
  attempts.delete(resolveKey(request));
}
