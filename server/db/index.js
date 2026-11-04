import { leadsDb } from "./leads.js";
import { requestsDb } from "./requests.js";
import { conversationsDb } from "./conversations.js";
import { usageDb } from "./usage.js";
import { playbooksDb } from "./playbooks.js";

export function createDb(sql) {
  return { ...leadsDb(sql), ...requestsDb(sql), ...conversationsDb(sql), ...usageDb(sql), ...playbooksDb(sql) };
}
