import { describe, it, expect, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { createAi, createProposeRequest } from "./ai.js";

const usage = {
  inputTokens: { total: 1200, noCache: 200, cacheRead: 1000, cacheWrite: undefined },
  outputTokens: { total: 12, text: 12, reasoning: undefined },
};

const streamModel = (chunks) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [...chunks, { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage }],
      }),
    }),
  });

const setup = (model) => createAi({ apiKey: "k", model: "m", cacheKey: "site", reasoningEffort: "none", provider: () => model });

describe("createAi", () => {
  it("streamReply streams UI chunks and reports text and usage on finish", async () => {
    const model = streamModel([
      { type: "text-start", id: "t" },
      { type: "text-delta", id: "t", delta: "Hi there." },
      { type: "text-end", id: "t" },
    ]);
    const onFinish = vi.fn();
    const res = setup(model).streamReply({
      system: "Rules",
      messages: [{ role: "user", content: "Hello" }],
      maxOutputTokens: 150,
      tools: { proposeRequest: createProposeRequest(["brakes"]) },
      onFinish,
    });
    expect(await res.text()).toContain("Hi there.");
    expect(onFinish).toHaveBeenCalledExactlyOnceWith({
      text: "Hi there.",
      toolCall: null,
      usage: { inputTokens: 1200, cachedInputTokens: 1000, outputTokens: 12 },
    });

    const [call] = model.doStreamCalls;
    expect(call.maxOutputTokens).toBe(150);
    expect(call.providerOptions.openai).toEqual({ promptCacheKey: "site", reasoningEffort: "none" });
    expect(call.prompt[0]).toEqual({ role: "system", content: "Rules" });
    expect(call.tools.map((t) => t.name)).toEqual(["proposeRequest"]);
  });

  it("streamReply reports the proposeRequest call", async () => {
    const input = { service: "brakes", name: "Ann", phone: "8325550100", email: null, vehicle: "2019 Civic", notes: "" };
    const model = streamModel([
      { type: "tool-call", toolCallId: "c1", toolName: "proposeRequest", input: JSON.stringify(input) },
    ]);
    const onFinish = vi.fn();
    const res = setup(model).streamReply({
      system: "Rules",
      messages: [{ role: "user", content: "Book me" }],
      maxOutputTokens: 150,
      tools: { proposeRequest: createProposeRequest(["brakes"]) },
      onFinish,
    });
    expect(await res.text()).toContain("tool-input-available");
    expect(onFinish.mock.calls[0][0].toolCall).toEqual({ toolName: "proposeRequest", input });
  });

  it("generateInsights returns the parsed object and usage", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: '{"summary":"Asked about brakes"}' }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      },
    });
    const result = await setup(model).generateInsights({
      system: "Summarise",
      transcript: "user: brakes?",
      schema: z.object({ summary: z.string() }),
    });
    expect(result).toEqual({
      object: { summary: "Asked about brakes" },
      usage: { inputTokens: 1200, cachedInputTokens: 1000, outputTokens: 12 },
    });
    expect(model.doGenerateCalls[0].providerOptions.openai.promptCacheKey).toBe("site");
  });
});

describe("createProposeRequest", () => {
  it("has no execute and validates the service enum", async () => {
    const tool = createProposeRequest(["brakes", "tires"]);
    expect(tool.execute).toBeUndefined();
    const schema = await tool.inputSchema;
    const valid = { service: null, name: "Ann", phone: "8325550100", email: null, vehicle: "Civic", notes: "" };
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, service: "tires" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, service: "oil" }).success).toBe(false);
  });
});
