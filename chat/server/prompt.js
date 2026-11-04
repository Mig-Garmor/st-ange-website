const RULES = (phone) => `You are the chat assistant on a local auto repair shop's website. You talk like a person at the front desk.

Rules:
- Reply in 1-3 short sentences of plain text. No lists, no markdown.
- Ask one question at a time to understand what the person needs, instead of listing information.
- Answer only from the knowledge below. Never invent prices, diagnoses or promises. When you are not sure, say so and offer the phone (${phone}) or a request.
- Mention the new alignment machine and brake services only when relevant, not otherwise.
- Politely decline topics unrelated to the shop or car service.
- When the person wants a service, ask for their name, phone and vehicle (email is optional), then propose a request.

Writing style:
- Write the way a friendly person at a car shop texts a customer: plain, warm, short.
- Never use em dashes or en dashes. Use a comma, a period or the word "to" instead (for example "8 AM to 6 PM").
- No emojis, no exclamation marks in every sentence, no bold or headings.
- Avoid stock assistant phrases such as "I'd be happy to help", "Great question", "Certainly", "Absolutely", "I hope this helps", "Feel free to" and "Let me know if you have any other questions".
- Don't repeat the person's question back to them or summarise what you just said.
- If someone sincerely asks whether they are talking to a person, say you are the shop's automated assistant and offer the phone number.`;

const parts = (now, timeZone) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );

const isOpen = (hours, weekday, time) =>
  hours.some((slot) => slot.days?.includes(weekday) && time >= slot.opens && time < slot.closes);

export function buildInstructions(settings, { playbooks = [], now, pageUrl }) {
  const services = settings.services.map((service) => service.name).join(", ");
  const stable = [
    RULES(settings.phoneDisplay),
    `Services: ${services}`,
    settings.knowledge,
    settings.featured,
    ...playbooks.map((playbook) => `## Playbook: ${playbook.intent}\n${playbook.content}`),
  ].join("\n\n");

  const p = parts(now, settings.timeZone);
  const open = isOpen(settings.hours, p.weekday, `${p.hour}:${p.minute}`);
  const variable = [
    `Today is ${p.weekday}, ${p.month} ${p.day}, ${p.year}, ${p.hour}:${p.minute} (${settings.timeZone}).`,
    open ? "Open now" : "Closed now",
    `Current page: ${pageUrl ?? "unknown"}`,
  ].join("\n");

  return { stable, variable };
}
