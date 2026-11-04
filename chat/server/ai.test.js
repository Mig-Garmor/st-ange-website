import { describe, it, expect, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { createAi, createProposeRequest, openRouter, reasoningEffortFor, reportedCostUsd } from "./ai.js";

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

const setup = (model, options = {}) =>
  createAi({ apiKey: "k", model: "openai/m", reasoningEffort: "none", provider: () => model, ...options });

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
    expect(call.providerOptions.openrouter).toEqual({
      usage: { include: true },
      reasoning: { effort: "none", exclude: true },
    });
    expect(call.prompt[0]).toEqual({ role: "system", content: "Rules" });
    expect(call.prompt[0].providerOptions).toBeUndefined();
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

  const settleOrder = async (doStream) => {
    const order = [];
    const res = setup(new MockLanguageModelV4({ doStream })).streamReply({
      system: "Rules",
      messages: [{ role: "user", content: "Hello" }],
      maxOutputTokens: 150,
      tools: {},
      onFinish: async ({ text, usage }) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(["finish", text, usage.outputTokens]);
      },
      onError: () => order.push(["error"]),
      onSettled: () => order.push(["settled"]),
      errorText: "Unavailable.",
    });
    await res.text().catch(() => {});
    await vi.waitFor(() => expect(order.at(-1)).toEqual(["settled"]), { timeout: 2000 });
    return order;
  };

  it("onSettled runs after onFinish has recorded the usage of a stream that errors partway", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const order = await settleOrder(async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: "Partial" },
          { type: "error", error: new Error("provider down") },
          { type: "finish", finishReason: { unified: "error", raw: undefined }, usage },
        ],
      }),
    }));
    expect(order).toEqual([["error"], ["finish", "Partial", 12], ["settled"]]);
    error.mockRestore();
  });

  it("onSettled runs when the model call fails or the stream breaks, without onFinish", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await settleOrder(async () => { throw new Error("provider down"); })).toEqual([["error"], ["settled"]]);
    const broken = await settleOrder(async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "t" });
          controller.error(new Error("socket closed"));
        },
      }),
    }));
    expect(broken).toEqual([["settled"]]);
    error.mockRestore();
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
    expect(model.doGenerateCalls[0].providerOptions.openrouter.usage).toEqual({ include: true });
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

const costMetadata = (cost) => ({ openrouter: { usage: { promptTokens: 1500, completionTokens: 12, totalTokens: 1512, cost } } });

const costStream = (providerMetadata) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: "Hi." },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage, providerMetadata },
        ],
      }),
    }),
  });

const reply = async (ai, system = "Rules") => {
  const onFinish = vi.fn();
  const res = ai.streamReply({ system, messages: [{ role: "user", content: "Hello" }], maxOutputTokens: 150, tools: {}, onFinish });
  await res.text();
  return onFinish.mock.calls[0][0].usage;
};

const generateModel = (text, providerMetadata) =>
  new MockLanguageModelV4({
    doGenerate: { content: [{ type: "text", text }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [], providerMetadata },
  });

describe("OpenRouter cost, caching and reasoning", () => {
  it("streamReply surfaces the reported cost as costUsd", async () => {
    expect(await reply(setup(costStream(costMetadata(0.000123))))).toEqual({
      inputTokens: 1500, cachedInputTokens: 1000, cacheWriteTokens: 300, outputTokens: 12, costUsd: 0.000123,
    });
  });

  it("streamReply leaves costUsd out when no cost is reported", async () => {
    expect(await reply(setup(costStream(undefined)))).not.toHaveProperty("costUsd");
    expect(await reply(setup(costStream({ openrouter: { usage: { promptTokens: 1 } } })))).not.toHaveProperty("costUsd");
  });

  it("marks a cache breakpoint on the stable part only for anthropic models", async () => {
    const anthropic = costStream();
    await reply(setup(anthropic, { model: "anthropic/claude-haiku-5.5" }), ["Stable", "Variable"]);
    const [stable, variable] = anthropic.doStreamCalls[0].prompt;
    expect(stable).toEqual({
      role: "system", content: "Stable", providerOptions: { openrouter: { cacheControl: { type: "ephemeral" } } },
    });
    expect(variable).toEqual({ role: "system", content: "Variable" });
    expect(variable.providerOptions).toBeUndefined();

    const openai = costStream();
    await reply(setup(openai, { model: "openai/gpt-6-luna" }), ["Stable", "Variable"]);
    expect(openai.doStreamCalls[0].prompt.slice(0, 2).map((m) => m.providerOptions)).toEqual([undefined, undefined]);
  });

  it("sends no reasoning option when the model has no reasoning effort", async () => {
    const model = costStream();
    await reply(setup(model, { reasoningEffort: undefined }));
    expect(model.doStreamCalls[0].providerOptions.openrouter).toEqual({ usage: { include: true } });
  });

  it("generateInsights surfaces the reported cost, with and without a schema failure", async () => {
    const schema = z.object({ summary: z.string() });
    const ok = await setup(generateModel('{"summary":"Brakes"}', costMetadata(0.0002))).generateInsights({ system: "S", transcript: "t", schema });
    expect(ok.object).toEqual({ summary: "Brakes" });
    expect(ok.usage.costUsd).toBe(0.0002);

    const bad = await setup(generateModel('{"summary":42}', costMetadata(0.0003))).generateInsights({ system: "S", transcript: "t", schema });
    expect(bad.object).toBeNull();
    expect(bad.usage.costUsd).toBe(0.0003);

    const unreported = await setup(generateModel('{"summary":"Brakes"}')).generateInsights({ system: "S", transcript: "t", schema });
    expect(unreported.usage).not.toHaveProperty("costUsd");
  });

  it("generateInsights marks the cache breakpoint for anthropic models", async () => {
    const model = generateModel('{"summary":"Brakes"}');
    await setup(model, { model: "anthropic/claude-haiku-5.5" }).generateInsights({
      system: "S", transcript: "t", schema: z.object({ summary: z.string() }),
    });
    expect(model.doGenerateCalls[0].prompt[0].providerOptions).toEqual({ openrouter: { cacheControl: { type: "ephemeral" } } });
  });

  it("reasoningEffortFor uses the model's own entry, else the default", () => {
    const settings = {
      defaultReasoningEffort: "none",
      models: { "openai/a": { inputUsd: 1 }, "x/b": { reasoningEffort: "low" }, "openai/c": { reasoningEffort: null } },
    };
    expect(reasoningEffortFor(settings, "openai/a")).toBe("none");
    expect(reasoningEffortFor(settings, "anthropic/unpriced")).toBe("none");
    expect(reasoningEffortFor(settings, "nvidia/nemotron-3-ultra-550b-a55b:free")).toBe("none");
    expect(reasoningEffortFor(settings, "google/gemma-4-31b-it:free")).toBeUndefined();
    expect(reasoningEffortFor(settings, undefined)).toBeUndefined();
    expect(reasoningEffortFor(settings, "x/b")).toBe("low");
    expect(reasoningEffortFor(settings, "openai/c")).toBeNull();
  });

  it("reportedCostUsd sums every step and needs a cost on each", () => {
    expect(reportedCostUsd([{ providerMetadata: costMetadata(0.1) }, { providerMetadata: costMetadata(0.2) }])).toBeCloseTo(0.3);
    expect(reportedCostUsd([{ providerMetadata: costMetadata(0.1) }, {}])).toBeUndefined();
    expect(reportedCostUsd([{ providerMetadata: costMetadata(0) }])).toBe(0);
    expect(reportedCostUsd([{ providerMetadata: costMetadata(-1) }])).toBeUndefined();
    expect(reportedCostUsd([])).toBeUndefined();
  });
});

const sse = (events) =>
  new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream" },
  });

describe("the real OpenRouter provider", () => {
  const provider = (fetch) => openRouter({ apiKey: "k", fetch });

  it("sends usage accounting, reasoning and the anthropic cache breakpoint, and reads the streamed cost", async () => {
    const fetch = vi.fn(async () =>
      sse([
        { id: "1", model: "anthropic/claude-haiku-5.5", choices: [{ index: 0, delta: { role: "assistant", content: "Hi." } }] },
        { id: "1", model: "anthropic/claude-haiku-5.5", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
        {
          id: "1", model: "anthropic/claude-haiku-5.5", choices: [],
          usage: { prompt_tokens: 1500, completion_tokens: 12, total_tokens: 1512, cost: 0.00042,
            prompt_tokens_details: { cached_tokens: 1000, cache_write_tokens: 300 } },
        },
      ]),
    );
    const ai = createAi({ model: "anthropic/claude-haiku-5.5", reasoningEffort: "none", provider: provider(fetch) });
    expect(await reply(ai, ["Stable", "Variable"])).toEqual({
      inputTokens: 1500, cachedInputTokens: 1000, cacheWriteTokens: 300, outputTokens: 12, costUsd: 0.00042,
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers).toMatchObject({ "http-referer": "https://www.stangeautoservice.com", "x-openrouter-title": "St Ange Auto Service" });
    const body = JSON.parse(init.body);
    expect(body.usage).toEqual({ include: true });
    expect(body.reasoning).toEqual({ effort: "none", exclude: true });
    expect(body.stream_options).toEqual({ include_usage: true });
    expect(body.messages[0]).toEqual({ role: "system", content: [{ type: "text", text: "Stable", cache_control: { type: "ephemeral" } }] });
    expect(JSON.stringify(body.messages[1])).not.toContain("cache_control");
  });

  it("a :free model sends no reasoning or cache options and reports a cost of 0", async () => {
    const model = "google/gemma-4-31b-it:free";
    const fetch = vi.fn(async () =>
      sse([
        { id: "1", model, choices: [{ index: 0, delta: { role: "assistant", content: "Hi." } }] },
        { id: "1", model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
        { id: "1", model, choices: [], usage: { prompt_tokens: 900, completion_tokens: 5, total_tokens: 905, cost: 0 } },
      ]),
    );
    const settings = { defaultReasoningEffort: "none", models: {} };
    const ai = createAi({ model, reasoningEffort: reasoningEffortFor(settings, model), provider: provider(fetch) });
    expect((await reply(ai, ["Stable", "Variable"])).costUsd).toBe(0);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.model).toBe(model);
    expect(body.usage).toEqual({ include: true });
    expect(body).not.toHaveProperty("reasoning");
    expect(JSON.stringify(body)).not.toContain("cache_control");
  });

  it("reads the cost of a non-streamed insights call", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        id: "1", model: "openai/gpt-6-luna",
        choices: [{ index: 0, message: { role: "assistant", content: '{"summary":"Brakes"}' }, finish_reason: "stop" }],
        usage: { prompt_tokens: 800, completion_tokens: 20, total_tokens: 820, cost: 0.00009 },
      }),
    );
    const ai = createAi({ model: "openai/gpt-6-luna", reasoningEffort: "none", provider: provider(fetch) });
    const result = await ai.generateInsights({ system: "S", transcript: "t", schema: z.object({ summary: z.string() }) });
    expect(result).toEqual({
      object: { summary: "Brakes" },
      usage: { inputTokens: 800, cachedInputTokens: 0, cacheWriteTokens: undefined, outputTokens: 20, costUsd: 0.00009 },
    });
    expect(JSON.stringify(JSON.parse(fetch.mock.calls[0][1].body).messages)).not.toContain("cache_control");
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
