-- Add profession field to clients table
alter table public.clients
  add column if not exists profession text default null;
