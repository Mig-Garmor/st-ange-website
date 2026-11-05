const ASKS = /send (a|the|your) request|call you back|start a request/i;
// The whole message must be a plain yes: "yes my friend asked about..." is a new topic, not consent to the form.
const YES = "yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|sounds good|let'?s do it|absolutely|definitely";
const ONLY_AGREEMENT = new RegExp(`^(?:(?:${YES}|please|thanks|thank you)[\\s,.!]*)+$`, "i");
const HAS_YES = new RegExp(`\\b(?:${YES})\\b`, "i");
const agrees = (reply) => ONLY_AGREEMENT.test(reply) && HAS_YES.test(reply);
const EXPLICIT = /\b(send|start|open|make|submit) (a |the |my )?(quote |service )?request\b|\brequest a (quote|callback|call back)\b/i;
// The form only takes the visitor's own details; asking for someone else goes to the model, which follows the third-party rule.
const SOMEONE_ELSE = /\b(my |a |our )?(friend|friends|neighbou?r|coworker|co-worker|colleague|boss|client|customer|someone else|somebody else)\b|\bfor (him|her|them)\b/i;

// A small model sometimes says "please send the request" instead of opening the form; these replies must open it.
export function wantsForm(text, previousReply = "") {
  const reply = String(text ?? "").trim();
  if (SOMEONE_ELSE.test(reply)) return false;
  return EXPLICIT.test(reply) || (agrees(reply) && ASKS.test(String(previousReply ?? "")));
}
