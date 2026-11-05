const ASKS = /send (a|the|your) request|call you back|start a request/i;
const AGREES = /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|sounds good|let'?s do it)\b/i;
const EXPLICIT = /\b(send|start|open|make|submit) (a |the |my )?(quote |service )?request\b|\brequest a (quote|callback|call back)\b/i;

// A small model sometimes says "please send the request" instead of opening the form; these replies must open it.
export function wantsForm(text, previousReply = "") {
  const reply = String(text ?? "").trim();
  return EXPLICIT.test(reply) || (AGREES.test(reply) && ASKS.test(String(previousReply ?? "")));
}
