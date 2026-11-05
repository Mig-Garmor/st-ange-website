alter table conversations add column previous_id uuid references conversations(id), add column carry_over text;
comment on column conversations.carry_over is 'Short context from the same visitor''s chat in the previous 24 hours, captured when this one started.';
