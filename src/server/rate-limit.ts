type AttemptState = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptState>();

function pruneExpired(now: number) {
  for (const [key, state] of attempts) {
    if (now > state.resetAt) attempts.delete(key);
  }
}

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || now > state.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  state.count += 1;
  if (attempts.size > 20000) pruneExpired(now);
  return state.count <= maxAttempts;
}

export function getRequestIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

