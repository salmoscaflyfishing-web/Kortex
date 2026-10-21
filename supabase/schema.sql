-- Kortex : profils clients + compteur de 100 recherches par mois.
-- À coller une seule fois dans Supabase > SQL Editor, puis cliquer sur « Run ».
-- Basé sur la doc officielle Supabase : managing-user-data, row-level-security, functions.

-- 1. Table des profils : une ligne par client, liée à son compte.
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  searches_used integer not null default 0,
  period_start date not null default (date_trunc('month', now() at time zone 'Europe/Paris'))::date,
  created_at timestamptz not null default now(),

  primary key (id)
);

-- Le client peut seulement lire sa ligne. Il ne peut pas changer son compteur.
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Un client lit seulement son profil"
on public.profiles
for select
to authenticated
using ( (select auth.uid()) = id );

-- 2. Création automatique du profil à chaque inscription.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profils pour les comptes qui existent déjà (s'il y en a).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 3. Utiliser une recherche. Remet le compteur à 0 au début de chaque mois.
-- Renvoie le nombre de recherches restantes, ou -1 si les 100 sont utilisées.
create function public.consume_search()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  current_month date := (date_trunc('month', now() at time zone 'Europe/Paris'))::date;
  remaining integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Non connecté';
  end if;

  update public.profiles
  set
    searches_used = case when period_start < current_month then 1 else searches_used + 1 end,
    period_start = current_month
  where id = (select auth.uid())
    and (period_start < current_month or searches_used < 100)
  returning 100 - searches_used into remaining;

  if not found then
    return -1;
  end if;

  return remaining;
end;
$$;

-- Seuls les clients connectés peuvent appeler cette fonction.
revoke execute on function public.consume_search from public;
revoke execute on function public.consume_search from anon;
grant execute on function public.consume_search to authenticated;
