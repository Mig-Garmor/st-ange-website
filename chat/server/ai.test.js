import { describe, it, expect, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { createAi, createProposeRequest } from "./ai.js";

const usage = {
  inputTokens: { total: 1500, noCache: 200, cacheRead: 1000, cacheWrite: 300 },
  outputTokens: { total: 12, text: 12, reasoning: undefined },
};

const streamModel = (chunks, chunkDelayInMs = null) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [...chunks, { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage }],
        chunkDelayInMs,
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
      usage: { inputTokens: 1500, cachedInputTokens: 1000, cacheWriteTokens: 300, outputTokens: 12 },
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

  it("finish still runs when the client cancels the response", async () => {
    const model = streamModel(
      [
        { type: "text-start", id: "t" },
        ...Array.from({ length: 5 }, () => ({ type: "text-delta", id: "t", delta: "word " })),
        { type: "text-end", id: "t" },
      ],
      5,
    );
    const onFinish = vi.fn();
    const res = setup(model).streamReply({
      system: "Rules",
      messages: [{ role: "user", content: "Hello" }],
      maxOutputTokens: 150,
      tools: {},
      onFinish,
    });
    await res.body.cancel();
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), { timeout: 2000 });
    expect(onFinish.mock.calls[0][0].text).toBe("word ".repeat(5));
    expect(onFinish.mock.calls[0][0].usage.outputTokens).toBe(12);
  });

  it("a stream error calls onError", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({ chunks: [{ type: "error", error: new Error("provider down") }] }),
      }),
    });
    const onError = vi.fn();
    const res = setup(model).streamReply({
      system: "Rules",
      messages: [{ role: "user", content: "Hello" }],
      maxOutputTokens: 150,
      tools: {},
      onFinish: vi.fn(),
      onError,
      errorText: "Unavailable.",
    });
    expect(await res.text()).toContain("Unavailable.");
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
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
      usage: { inputTokens: 1500, cachedInputTokens: 1000, cacheWriteTokens: 300, outputTokens: 12 },
    });
    expect(model.doGenerateCalls[0].providerOptions.openai.promptCacheKey).toBe("site");
  });

  it("generateInsights returns a null object with the billed usage when the output fails the schema", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: '{"summary":42}' }],
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
      object: null,
      usage: { inputTokens: 1500, cachedInputTokens: 1000, cacheWriteTokens: 300, outputTokens: 12 },
    });
  });

  it("generateInsights rethrows other errors", async () => {
    const model = new MockLanguageModelV4({ doGenerate: async () => { throw new Error("provider down"); } });
    await expect(
      setup(model).generateInsights({ system: "S", transcript: "t", schema: z.object({ summary: z.string() }) }),
    ).rejects.toThrow("provider down");
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
