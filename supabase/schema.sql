-- Catalogo de refrescos: esquema compartido para Supabase (PostgreSQL).
-- Ejecutar UNA vez en Supabase -> SQL Editor -> New query -> Run.
-- Despues crea la cuenta del administrador en Authentication -> Users y ejecuta el paso 5.

create extension if not exists pgcrypto;

-- 1) Cuentas con permiso real de administrador ---------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin lee su fila" on public.admins;
create policy "admin lee su fila" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.admins to authenticated;

-- 2) Catalogo compartido: una sola fila para todos los telefonos ---------------
create table if not exists public.refresco_catalog (
  id smallint primary key default 1 check (id = 1),
  products jsonb not null default '[]'::jsonb,
  brands jsonb not null default '["Pepsi","Coca-Cola","Fanta","Sprite","7Up","Otros"]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.refresco_catalog (id) values (1) on conflict (id) do nothing;

alter table public.refresco_catalog enable row level security;

drop policy if exists "catalogo lectura publica" on public.refresco_catalog;
create policy "catalogo lectura publica" on public.refresco_catalog
  for select to anon, authenticated
  using (true);

drop policy if exists "catalogo alta admin" on public.refresco_catalog;
create policy "catalogo alta admin" on public.refresco_catalog
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "catalogo edicion admin" on public.refresco_catalog;
create policy "catalogo edicion admin" on public.refresco_catalog
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.refresco_catalog to anon, authenticated;
grant insert, update on public.refresco_catalog to authenticated;

-- 3) Fotos de los productos ----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('refresco-images', 'refresco-images', true)
on conflict (id) do update set public = true;

drop policy if exists "imagenes lectura publica" on storage.objects;
create policy "imagenes lectura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'refresco-images');

drop policy if exists "imagenes alta admin" on storage.objects;
create policy "imagenes alta admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'refresco-images' and public.is_admin());

drop policy if exists "imagenes borrado admin" on storage.objects;
create policy "imagenes borrado admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'refresco-images' and public.is_admin());

-- 4) Aviso inmediato de cambios (opcional, acelera la sincronizacion) ----------
do $$
begin
  alter publication supabase_realtime add table public.refresco_catalog;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- 5) Convertir una cuenta en administrador ------------------------------------
-- Primero crea el usuario en Authentication -> Users (correo + contrasena).
-- Luego ejecuta esto cambiando el correo:
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'TU-CORREO@EJEMPLO.COM'
-- on conflict (user_id) do nothing;
