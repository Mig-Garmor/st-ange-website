// vercel dev sets VERCEL_ENV=development and plain node sets none; deployments set preview or production.
const isLocal = (env) => !env.VERCEL_ENV || env.VERCEL_ENV === "development";

// A number from the environment that only local development may use; deployments always get the fallback.
export function localOverride(name, fallback, env = process.env) {
  if (!isLocal(env) || env[name] === undefined || env[name] === "") return fallback;
  const value = Number(env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const FLAGS = { true: true, "1": true, false: false, "0": false };

// An on/off switch from the environment that only local development may flip; anything unrecognised keeps the fallback.
export function localFlag(name, fallback, env = process.env) {
  if (!isLocal(env)) return fallback;
  const value = FLAGS[String(env[name] ?? "").trim().toLowerCase()];
  return value ?? fallback;
}
