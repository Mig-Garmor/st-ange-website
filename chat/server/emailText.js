export const CUSTOMER_HEADER =
  "Everything below was typed on the website by a visitor or written by the chat assistant. The shop's systems never ask you to click a link, sign in or move money.";

// Links are kept readable but not clickable, so a visitor cannot plant a phishing link in the shop's inbox.
export const defang = (text) => String(text ?? "").replace(/\bhttp(s?):\/\//gi, "hxxp$1://").replace(/\bwww\./gi, "www[.]");

export const oneLine = (text) => defang(text).replace(/\s*[\r\n]+\s*/g, " / ").trim();

export const quoted = (text) =>
  defang(text)
    .split(/\r?\n|\r/)
    .map((line) => `> ${line}`)
    .join("\n");
