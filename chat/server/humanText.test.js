import { describe, expect, it } from "vitest";
import { humanize, humanizeTransform } from "./humanText.js";

describe("humanize", () => {
  it("turns an em dash between words into a comma", () => {
    expect(humanize("We can help — just bring it in.")).toBe("We can help, just bring it in.");
  });

  it("turns a dash without spaces into a comma", () => {
    expect(humanize("Brakes—pads and rotors")).toBe("Brakes, pads and rotors");
  });

  it("keeps number ranges as a plain hyphen", () => {
    expect(humanize("It takes 1–2 hours")).toBe("It takes 1-2 hours");
  });

  it("does not leave a comma before punctuation", () => {
    expect(humanize("Open late —.")).toBe("Open late.");
  });

  it("leaves text without dashes unchanged", () => {
    expect(humanize("Call us at 832-572-7121.")).toBe("Call us at 832-572-7121.");
  });
});

async function run(chunks) {
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  }).pipeThrough(humanizeTransform()({ tools: {}, stopStream: () => {} }));
  const out = [];
  for await (const chunk of stream) out.push(chunk);
  return out;
}

describe("humanizeTransform", () => {
  it("removes a dash split across chunks without leaving a stray space", async () => {
    const out = await run([
      { type: "text-delta", id: "t", text: "Sure " },
      { type: "text-delta", id: "t", text: "— bring it by." },
      { type: "text-end", id: "t" },
    ]);
    const text = out.filter((c) => c.type === "text-delta").map((c) => c.text).join("");
    expect(text).toBe("Sure, bring it by.");
    expect(out.at(-1).type).toBe("text-end");
  });

  it("passes other chunks through and keeps trailing spaces before them", async () => {
    const out = await run([
      { type: "text-delta", id: "t", text: "Hello " },
      { type: "tool-call", toolName: "proposeRequest" },
    ]);
    expect(out.map((c) => c.type)).toEqual(["text-delta", "text-delta", "tool-call"]);
    expect(out.slice(0, 2).map((c) => c.text).join("")).toBe("Hello ");
  });
});
