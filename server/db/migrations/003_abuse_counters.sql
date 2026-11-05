alter table conversations add column attempts int not null default 0, add column request_count int not null default 0;
update conversations c set attempts = c.message_count, request_count = (select count(*) from requests r where r.conversation_id = c.id);
comment on column conversations.attempts is 'Every chat call, re-sends included; message_count only moves when a message is stored.';
alter table requests add column ip_hash text;
create index requests_ip_recent on requests (ip_hash, created_at) where ip_hash is not null;
