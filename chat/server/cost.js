const PER_MILLION = 1_000_000;

export function costEur(usage, price, eurPerUsd) {
  const { inputTokens, cachedInputTokens, cacheWriteTokens, outputTokens } = normaliseUsage(usage);
  const uncached = Math.max(0, inputTokens - cachedInputTokens - cacheWriteTokens);
  const usd =
    (uncached * price.inputUsd +
      cachedInputTokens * price.cachedInputUsd +
      cacheWriteTokens * (price.cacheWriteUsd ?? price.inputUsd) +
      outputTokens * price.outputUsd) /
    PER_MILLION;
  return usd * eurPerUsd;
}

export function normaliseUsage(usage = {}) {
  const count = (n) => (Number.isFinite(n) && n > 0 ? n : 0);
  return {
    inputTokens: count(usage.inputTokens),
    cachedInputTokens: count(usage.cachedInputTokens),
    cacheWriteTokens: count(usage.cacheWriteTokens),
    outputTokens: count(usage.outputTokens),
  };
}
