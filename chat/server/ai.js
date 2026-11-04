import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, NoObjectGeneratedError, Output, streamText, tool } from "ai";
import { z } from "zod";

export const toUsage = (usage = {}, costUsd) => ({
  inputTokens: usage.inputTokens,
  cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
  cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens,
  outputTokens: usage.outputTokens,
  ...(costUsd !== undefined && { costUsd }),
});

// A call billed over several steps only has a known cost if every step reported one.
export function reportedCostUsd(steps = []) {
  const costs = steps.map((step) => step?.providerMetadata?.openrouter?.usage?.cost);
  if (!costs.length || !costs.every((c) => Number.isFinite(c) && c >= 0)) return undefined;
  return costs.reduce((sum, c) => sum + c, 0);
}

const REASONING_DEFAULT = /^(openai|anthropic)\//;

// A model's own entry wins (null sends nothing); the default goes only to families known to accept effort "none".
export const reasoningEffortFor = (settings, model) => {
  const entry = settings.models?.[model];
  if (entry && "reasoningEffort" in entry) return entry.reasoningEffort;
  return REASONING_DEFAULT.test(model ?? "") ? settings.defaultReasoningEffort : undefined;
};

export function createProposeRequest(serviceSlugs) {
  return tool({
    description:
      "Show the visitor a request card to confirm and send. Use once you have their name, phone and vehicle.",
    inputSchema: z.object({
      service: z.enum(serviceSlugs).nullable(),
      name: z.string(),
      phone: z.string(),
      email: z.string().nullable(),
      vehicle: z.string(),
      notes: z.string(),
    }),
  });
}

export const openRouter = ({ apiKey, fetch }) =>
  createOpenRouter({
    apiKey,
    fetch,
    // "compatible" mode omits stream_options, so streamed replies would come back without usage or cost.
    compatibility: "strict",
    appName: "St Ange Auto Service",
    appUrl: "https://www.stangeautoservice.com",
  });

export function createAi({ apiKey, model, reasoningEffort, provider = openRouter({ apiKey }) }) {
  const providerOptions = {
    openrouter: {
      usage: { include: true },
      ...(reasoningEffort && { reasoning: { effort: reasoningEffort, exclude: true } }),
    },
  };
  const cacheBreakpoint = model?.startsWith("anthropic/")
    ? { openrouter: { cacheControl: { type: "ephemeral" } } }
    : undefined;
  // The first part is the stable prefix; Anthropic caches up to the breakpoint placed on it.
  const instructions = (system) =>
    [system].flat().map((content, i) => ({
      role: "system",
      content,
      ...(i === 0 && cacheBreakpoint && { providerOptions: cacheBreakpoint }),
    }));

  return {
    streamReply({ system, messages, maxOutputTokens, tools, onFinish, onError, onSettled, errorText }) {
      const result = streamText({
        model: provider(model),
        instructions: instructions(system),
        messages,
        maxOutputTokens,
        tools,
        providerOptions,
        onError: ({ error }) => {
          console.error("Chat stream failed", error);
          onError?.(error);
        },
        onEnd: async (event) => {
          const call = event.toolCalls?.find((c) => c.toolName === "proposeRequest");
          await onFinish?.({
            text: event.text,
            toolCall: call ? { toolName: call.toolName, input: call.input } : null,
            usage: toUsage(event.totalUsage ?? event.usage, reportedCostUsd(event.steps)),
          });
        },
      });
      // Without this, a client disconnect stops the stream before onEnd, so billed tokens are never recorded.
      // It resolves only after onEnd has finished, or once onEnd can no longer run (even after an error).
      result
        .consumeStream({ onError: (error) => console.error("Chat stream failed", error) })
        .finally(() => onSettled?.());
      return result.toUIMessageStreamResponse({ sendReasoning: false, ...(errorText && { onError: () => errorText }) });
    },

    async generateInsights({ system, transcript, schema }) {
      const steps = [];
      try {
        const result = await generateText({
          model: provider(model),
          instructions: instructions(system),
          prompt: transcript,
          output: Output.object({ schema }),
          providerOptions,
          onStepEnd: (step) => {
            steps.push(step);
          },
        });
        return { object: result.output ?? null, usage: toUsage(result.usage, reportedCostUsd(result.steps)) };
      } catch (error) {
        // Billed even though the output failed the schema; the error itself carries no provider metadata.
        if (NoObjectGeneratedError.isInstance(error)) {
          return { object: null, usage: toUsage(error.usage, reportedCostUsd(steps)) };
        }
        throw error;
      }
    },
  };
}
