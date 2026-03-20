const tokenCache = new Map<string, number[]>();

export function rateLimit({
  interval,
  uniqueTokenPerInterval = 500,
}: {
  interval: number;
  uniqueTokenPerInterval?: number;
}) {
  return {
    check(limit: number, token: string): Promise<void> {
      const now = Date.now();
      const windowStart = now - interval;

      // Cleanup expired tokens periodically
      if (tokenCache.size > uniqueTokenPerInterval) {
        for (const [key, timestamps] of tokenCache) {
          const valid = timestamps.filter((t) => t > windowStart);
          if (valid.length === 0) {
            tokenCache.delete(key);
          } else {
            tokenCache.set(key, valid);
          }
        }
      }

      const timestamps = tokenCache.get(token) ?? [];
      const validTimestamps = timestamps.filter((t) => t > windowStart);

      if (validTimestamps.length >= limit) {
        return Promise.reject(new Error("Rate limit exceeded"));
      }

      validTimestamps.push(now);
      tokenCache.set(token, validTimestamps);
      return Promise.resolve();
    },
  };
}
