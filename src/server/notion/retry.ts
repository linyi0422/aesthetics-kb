function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatusCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const maybeStatus = (err as { status?: unknown }).status;
  if (typeof maybeStatus === "number") return maybeStatus;
  const maybeCode = (err as { code?: unknown }).code;
  if (maybeCode === "rate_limited") return 429;
  return null;
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const status = getStatusCode(err);
      const retryable = status === 429 || (status !== null && status >= 500 && status < 600);
      const lastAttempt = attempt >= maxRetries - 1;
      if (!retryable || lastAttempt) throw err;
      const delayMs = Math.min(1000 * 2 ** attempt, 10000);
      await wait(delayMs);
    }
  }
  throw new Error("retry_exhausted");
}

