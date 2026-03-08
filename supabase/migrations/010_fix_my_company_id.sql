-- ============================================================
-- Migration: 010_fix_my_company_id
--
-- Torna my_company_id() segura durante execução de migrations:
-- verifica se public.profiles existe antes de consultá-la.
-- Se a tabela ainda não existir, retorna NULL sem erro.
--
-- Usa PL/pgSQL em vez de SQL puro para permitir a verificação
-- condicional via information_schema.
-- ============================================================

create or replace function public.my_company_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  -- Verifica se a tabela profiles existe antes de consultá-la.
  -- Evita erros durante execução sequencial de migrations.
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'profiles'
  ) then
    return null;
  end if;

  select company_id
    into v_company_id
    from public.profiles
   where id = auth.uid();

  return v_company_id;
end;
$$;

grant execute on function public.my_company_id() to authenticated;
