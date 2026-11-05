alter table conversations add column carry_details jsonb;
comment on column conversations.carry_details is 'Car and contact details from the earlier chat, kept only when the visitor chose to continue it.';
