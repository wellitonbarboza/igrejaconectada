create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.authenticate_profile(email_input text, password_input text)
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  return query
  select p.id, p.full_name, p.email, p.role
  from public.profiles p
  where p.email = email_input
    and p.password_hash = extensions.crypt(password_input, p.password_hash);
end;
$$;

create or replace function public.create_profile(
  email_input text,
  password_input text,
  full_name_input text,
  role_input text default 'usuario'
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  insert into public.profiles (email, password_hash, full_name, role)
  values (
    email_input,
    extensions.crypt(password_input, extensions.gen_salt('bf')),
    full_name_input,
    coalesce(role_input, 'usuario')
  )
  returning public.profiles.id, public.profiles.full_name, public.profiles.email, public.profiles.role;
end;
$$;
