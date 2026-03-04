create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  email        text not null,
  role         text not null default 'seller' check (role in ('admin', 'seller')),
  meta_mensal  numeric(12,2) not null default 0,
  team_id      uuid,
  created_at   timestamptz not null default now()
);

create table if not exists public.sales (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null references public.profiles(id) on delete cascade,
  banco            text not null,
  tipo_operacao    text not null,
  valor            numeric(12,2) not null default 0,
  status           text not null default 'pendente' check (status in ('pendente','aprovado','recusado','cancelado')),
  data_fechamento  date not null,
  created_at       timestamptz not null default now()
);

create index if not exists sales_seller_id_idx       on public.sales (seller_id);
create index if not exists sales_data_fechamento_idx on public.sales (data_fechamento);
create index if not exists sales_status_idx          on public.sales (status);
create index if not exists sales_seller_data_idx     on public.sales (seller_id, data_fechamento desc);

alter table public.profiles enable row level security;
alter table public.sales     enable row level security;

create policy "profiles: admin vê tudo"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles: seller vê próprio"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: owner atualiza próprio"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles: insert próprio ou admin"
  on public.profiles for insert
  with check (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "sales: admin vê tudo"
  on public.sales for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "sales: seller vê próprias"
  on public.sales for select
  using (seller_id = auth.uid());

create policy "sales: seller insere próprias"
  on public.sales for insert
  with check (seller_id = auth.uid());

create policy "sales: seller atualiza próprias"
  on public.sales for update
  using (seller_id = auth.uid());

create policy "sales: admin deleta tudo"
  on public.sales for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'seller'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
