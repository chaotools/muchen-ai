const windowMs = 10 * 60 * 1000;
const maximumFailures = 5;

type Attempt = {
  failures: number;
  firstFailureAt: number;
};

const attempts = new Map<string, Attempt>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function pruneExpiredAttempts(now: number) {
  if (attempts.size < 1_000) return;
  for (const [key, attempt] of attempts) {
    if (now - attempt.firstFailureAt >= windowMs) attempts.delete(key);
  }
}

export function getSupportLoginRetryAfterSeconds(request: Request) {
  const now = Date.now();
  const key = getClientKey(request);
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
  const key = getClientKey(request);
  const attempt = attempts.get(key);
  if (!attempt || now - attempt.firstFailureAt >= windowMs) {
    attempts.set(key, { failures: 1, firstFailureAt: now });
    return;
  }
  attempt.failures += 1;
}

export function clearSupportLoginFailures(request: Request) {
  attempts.delete(getClientKey(request));
}
