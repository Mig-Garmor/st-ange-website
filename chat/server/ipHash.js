import { createHash } from "node:crypto";

export function hashIp(ip, salt) {
  return createHash("sha256").update(salt + ip).digest("hex");
}

export function clientIp(request) {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return first || "unknown";
}
