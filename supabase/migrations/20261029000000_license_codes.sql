create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  installation_id text,
  constraint activation_codes_redemption_pair check (
    (redeemed_at is null and installation_id is null)
    or (redeemed_at is not null and installation_id is not null)
  )
);

alter table public.activation_codes enable row level security;
revoke all on table public.activation_codes from anon, authenticated;
grant all on table public.activation_codes to service_role;

create or replace function public.redeem_activation_code(
  p_code_hash text,
  p_installation_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  redeemed_id uuid;
begin
  if p_code_hash !~ '^[a-f0-9]{64}$'
    or p_installation_id !~ '^[A-Za-z0-9_-]{20,128}$' then
    return 'invalid';
  end if;

  update public.activation_codes
  set redeemed_at = coalesce(redeemed_at, now()),
      installation_id = coalesce(installation_id, p_installation_id)
  where code_hash = p_code_hash
    and (redeemed_at is null or installation_id = p_installation_id)
  returning id into redeemed_id;

  if found then
    return 'activated';
  end if;

  if exists (
    select 1
    from public.activation_codes
    where code_hash = p_code_hash
  ) then
    return 'used';
  end if;

  return 'invalid';
end;
$$;

revoke all on function public.redeem_activation_code(text, text) from public, anon, authenticated;
grant execute on function public.redeem_activation_code(text, text) to service_role;
