alter table requests add column consent_text text, add column consent_at timestamptz;
comment on column requests.consent_text is 'The exact call-and-text consent wording the visitor ticked, kept as proof of consent.';
