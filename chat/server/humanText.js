// Em and en dashes read as machine-written in a front-desk chat.
export function humanize(text) {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*([.,!?;:])/g, "$1")
    .replace(/,\s{2,}/g, ", ");
}

// The raw tail a later chunk could still change (digits, spaces, commas, dashes) is held back unconverted.
export function humanizeTransform() {
  return () => {
    let pending = "";
    let pendingId;
    const flush = (controller) => {
      if (pending) controller.enqueue({ type: "text-delta", id: pendingId, text: humanize(pending) });
      pending = "";
    };
    return new TransformStream({
      transform(chunk, controller) {
        if (chunk.type !== "text-delta") {
          flush(controller);
          controller.enqueue(chunk);
          return;
        }
        const raw = pending + chunk.text;
        const tail = raw.match(/[\d\s,–—]*$/)[0];
        const body = humanize(raw.slice(0, raw.length - tail.length));
        pending = tail;
        pendingId = chunk.id;
        if (body) controller.enqueue({ ...chunk, text: body });
      },
      flush,
    });
  };
}
