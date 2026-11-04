const PER_MILLION = 1_000_000;

export function costEur(usage, price, eurPerUsd) {
  const { inputTokens, cachedInputTokens, outputTokens } = normaliseUsage(usage);
  const uncached = inputTokens - cachedInputTokens;
  const usd =
    (uncached * price.inputUsd + cachedInputTokens * price.cachedInputUsd + outputTokens * price.outputUsd) /
    PER_MILLION;
  return usd * eurPerUsd;
}

export function normaliseUsage(usage = {}) {
  const count = (n) => (Number.isFinite(n) && n > 0 ? n : 0);
  return {
    inputTokens: count(usage.inputTokens),
    cachedInputTokens: count(usage.cachedInputTokens),
    outputTokens: count(usage.outputTokens),
  };
}
