import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, isStepCount, NoObjectGeneratedError, Output, streamText, tool } from "ai";
import { z } from "zod";
import { humanize, humanizeTransform } from "./humanText.js";
import { checkProposal } from "./proposal.js";

export const toUsage = (usage = {}, costUsd) => ({
  inputTokens: usage.inputTokens,
  cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
  cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens,
  outputTokens: usage.outputTokens,
  ...(costUsd !== undefined && { costUsd }),
});

const add = (a, b) => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));

// Summed from the steps because totalUsage comes back empty when a later step fails.
export function sumUsage(steps = []) {
  const usages = steps.map((step) => step?.usage).filter(Boolean);
  if (!usages.length) return undefined;
  return usages.reduce((sum, u) => ({
    inputTokens: add(sum.inputTokens, u.inputTokens),
    outputTokens: add(sum.outputTokens, u.outputTokens),
    inputTokenDetails: {
      cacheReadTokens: add(sum.inputTokenDetails?.cacheReadTokens, u.inputTokenDetails?.cacheReadTokens),
      cacheWriteTokens: add(sum.inputTokenDetails?.cacheWriteTokens, u.inputTokenDetails?.cacheWriteTokens),
    },
  }));
}

// A call billed over several steps only has a known cost if every step reported one.
export function reportedCostUsd(steps = []) {
  const costs = steps.map((step) => step?.providerMetadata?.openrouter?.usage?.cost);
  if (!costs.length || !costs.every((c) => Number.isFinite(c) && c >= 0)) return undefined;
  return costs.reduce((sum, c) => sum + c, 0);
}

const REASONING_DEFAULT = /^(openai|anthropic|nvidia)\//;

// A model's own entry wins (null sends nothing); the default goes only to families known to accept effort "none".
export const reasoningEffortFor = (settings, model) => {
  const entry = settings.models?.[model];
  if (entry && "reasoningEffort" in entry) return entry.reasoningEffort;
  return REASONING_DEFAULT.test(model ?? "") ? settings.defaultReasoningEffort : undefined;
};

// A prompt cache lives at one provider; preferring one keeps cache reads, and fallbacks keep the chat up if it is down.
export const providerOrderFor = (settings, model) => settings.models?.[model]?.providerOrder;

const loose = () => z.union([z.string(), z.number()]).nullish().transform((v) => (v == null ? v : String(v)));

export function createProposeRequest(serviceSlugs, { validateLead, known = null } = {}) {
  return tool({
    description:
      "Open the request form in the chat. Call it only after the visitor agreed to send a request, or asked outright for a quote, booking or callback. Pass the service, the car problem in the visitor's words as notes, and any name, phone, email or vehicle they already gave; leave the rest empty. The form asks for what is missing in three short steps.",
    // Lenient on purpose: an input that fails the schema skips execute, so the model's reply can claim a card that never renders.
    inputSchema: z.object({
      service: loose().describe(`One of: ${serviceSlugs.join(", ")}`),
      name: loose(),
      phone: loose(),
      email: loose(),
      vehicle: loose(),
      notes: loose().describe(
        "Only the car's problem or the work wanted, in a few words from the customer (e.g. pulls to the right since hitting a pothole), plus any timing they asked for. Never their questions, that they agreed to a request, today's date or anything about this chat.",
      ),
    }),
    ...(validateLead && { execute: async (input) => checkProposal(input, { slugs: serviceSlugs, validateLead, known }) }),
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

// zdr routes only to providers that keep no prompts and never train on them; a model with no such provider fails instead.
// require_parameters skips providers that would silently drop the request form's tool (CoreWeave and SiliconFlow for Qwen3.6, 2026-11-05).
export const ZDR_ROUTING = { zdr: true, data_collection: "deny", require_parameters: true };

export function createAi({ apiKey, model, reasoningEffort, zdr = true, providerOrder, provider = openRouter({ apiKey }) }) {
  const providerOptions = {
    openrouter: {
      usage: { include: true },
      ...(reasoningEffort && { reasoning: { effort: reasoningEffort, exclude: true } }),
      ...((zdr || providerOrder) && {
        provider: { ...(zdr && ZDR_ROUTING), ...(providerOrder && { order: providerOrder, allow_fallbacks: true }) },
      }),
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
    streamReply({ system, messages, maxOutputTokens, tools, forceTool, onFinish, onError, onSettled, errorText }) {
      const result = streamText({
        model: provider(model),
        instructions: instructions(system),
        messages,
        maxOutputTokens,
        tools,
        // Step two lets the model react to the tool's verdict; it may not propose again in the same turn.
        stopWhen: isStepCount(2),
        prepareStep: ({ stepNumber }) =>
          stepNumber > 0 ? { toolChoice: "none" } : forceTool ? { toolChoice: { type: "tool", toolName: forceTool } } : {},
        providerOptions,
        experimental_transform: humanizeTransform(),
        onError: ({ error }) => {
          console.error("Chat stream failed", error);
          onError?.(error);
        },
        onEnd: async (event) => {
          const steps = event.steps ?? [];
          const results = steps.flatMap((s) => s.toolResults ?? []);
          const calls = steps
            .flatMap((s) => s.toolCalls ?? [])
            .filter((c) => c.toolName === "proposeRequest")
            .map((c) => ({ ...c, output: results.find((r) => r.toolCallId === c.toolCallId)?.output ?? null }));
          const call = calls.findLast((c) => c.output?.ok) ?? calls.at(-1);
          const text = steps.length ? steps.map((s) => s.text ?? "").filter(Boolean).join(" ") : (event.text ?? "");
          await onFinish?.({
            text: humanize(text),
            toolCall: call ? { toolName: call.toolName, input: call.input, output: call.output } : null,
            usage: toUsage(sumUsage(steps) ?? event.totalUsage ?? event.usage, reportedCostUsd(event.steps)),
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
