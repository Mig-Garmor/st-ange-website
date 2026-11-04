// Em and en dashes read as machine-written in a front-desk chat.
export function humanize(text) {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*([.,!?;:])/g, "$1");
}

// Trailing whitespace is held back so a dash split across chunks still loses the space before it.
export function humanizeTransform() {
  return () => {
    let pending = "";
    let pendingId;
    const flush = (controller) => {
      if (pending) controller.enqueue({ type: "text-delta", id: pendingId, text: pending });
      pending = "";
    };
    return new TransformStream({
      transform(chunk, controller) {
        if (chunk.type !== "text-delta") {
          flush(controller);
          controller.enqueue(chunk);
          return;
        }
        const joined = humanize(pending + chunk.text);
        const body = joined.trimEnd();
        pending = joined.slice(body.length);
        pendingId = chunk.id;
        if (body) controller.enqueue({ ...chunk, text: body });
      },
      flush,
    });
  };
}
