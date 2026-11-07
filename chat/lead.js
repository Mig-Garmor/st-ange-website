// One copy for the chat, the server and the website forms, so whatever one of them accepts the others accept too.
export const MAX_LENGTH = { name: 100, phone: 30, email: 200, vehicle: 100, notes: 1000 };

export function normalizePhone(input) {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export const orList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items.at(-1)}` : items.join(""));

export const formatPhone = (digits) => `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
