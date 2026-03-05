alter table if exists public.profiles
  add column if not exists cargo text;

update public.profiles
set cargo = coalesce(cargo, '')
where cargo is null;
