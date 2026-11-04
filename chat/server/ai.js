import { createOpenAI } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, Output, streamText, tool } from "ai";
import { z } from "zod";

export const toUsage = (usage = {}) => ({
  inputTokens: usage.inputTokens,
  cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
  cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens,
  outputTokens: usage.outputTokens,
});

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

export function createAi({ apiKey, model, cacheKey, reasoningEffort, provider = createOpenAI({ apiKey }) }) {
  const openai = { promptCacheKey: cacheKey, ...(reasoningEffort && { reasoningEffort }) };

  return {
    streamReply({ system, messages, maxOutputTokens, tools, onFinish, onError, onSettled, errorText }) {
      const result = streamText({
        model: provider(model),
        instructions: system,
        messages,
        maxOutputTokens,
        tools,
        providerOptions: { openai },
        onError: ({ error }) => {
          console.error("Chat stream failed", error);
          onError?.(error);
        },
        onEnd: async (event) => {
          const call = event.toolCalls?.find((c) => c.toolName === "proposeRequest");
          await onFinish?.({
            text: event.text,
            toolCall: call ? { toolName: call.toolName, input: call.input } : null,
            usage: toUsage(event.totalUsage ?? event.usage),
          });
        },
      });
      // Without this, a client disconnect stops the stream before onEnd, so billed tokens are never recorded.
      // It resolves only after onEnd has finished, or once onEnd can no longer run (even after an error).
      result
        .consumeStream({ onError: (error) => console.error("Chat stream failed", error) })
        .finally(() => onSettled?.());
      return result.toUIMessageStreamResponse(errorText ? { onError: () => errorText } : undefined);
    },

    async generateInsights({ system, transcript, schema }) {
      try {
        const result = await generateText({
          model: provider(model),
          instructions: system,
          prompt: transcript,
          output: Output.object({ schema }),
          providerOptions: { openai },
        });
        return { object: result.output ?? null, usage: toUsage(result.usage) };
      } catch (error) {
        // The call was billed even though the output failed the schema.
        if (NoObjectGeneratedError.isInstance(error)) return { object: null, usage: toUsage(error.usage) };
        throw error;
      }
    },
  };
}
