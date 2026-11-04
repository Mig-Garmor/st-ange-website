const PER_MILLION = 1_000_000;

export function costEur({ inputTokens, cachedInputTokens, outputTokens }, price, eurPerUsd) {
  const uncached = inputTokens - cachedInputTokens;
  const usd =
    (uncached * price.inputUsd + cachedInputTokens * price.cachedInputUsd + outputTokens * price.outputUsd) /
    PER_MILLION;
  return usd * eurPerUsd;
}
