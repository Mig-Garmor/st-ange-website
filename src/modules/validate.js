export function validateName(name) {
  return name.trim().length > 0 ? "" : "Name is required";
}

export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? "" : "Invalid email address";
}

export function validatePhone(phone) {
  const regex = /^\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})$/;
  return regex.test(phone) ? "" : "Invalid phone number";
}

export function validateMessage(message) {
  return message.trim().length > 0 ? "" : "Message is required";
}
