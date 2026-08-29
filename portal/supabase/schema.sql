-- Rochelle Gonçalves | Área do Cliente
-- Cole este arquivo inteiro no Supabase: SQL Editor -> New query -> Run

-- Tabela de clientes (um registro por empresa/cliente)
create table if not exists public.clients (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "Cliente vê apenas o próprio registro"
  on public.clients for select
  using (auth.uid() = id);

-- Dados adicionais do cliente, usados para preencher o contrato
-- automaticamente no futuro (nome/razão social já está em company_name).
alter table public.clients
  add column if not exists cpf_cnpj text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists monthly_value numeric,
  add column if not exists contract_start_date date,
  add column if not exists admin_name text,
  add column if not exists admin_cpf text,
  add column if not exists admin_rg text,
  add column if not exists admin_email text,
  add column if not exists admin_nationality text,
  add column if not exists admin_marital_status text,
  add column if not exists admin_profession text;

-- cpf_cnpj/address/phone acima são da EMPRESA (o cliente/CONTRATANTE).
-- admin_name/admin_cpf/admin_rg/admin_email são da PESSOA que representa
-- a empresa (sócio-administrador), quando o cliente é pessoa jurídica --
-- são dados diferentes, cada um com seu próprio CPF/e-mail.

-- Tabela de documentos
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  category text,
  file_path text not null,
  created_at timestamptz default now()
);

alter table public.documents enable row level security;

create policy "Cliente vê apenas os próprios documentos"
  on public.documents for select
  using (auth.uid() = client_id);

-- Bucket de armazenamento para os arquivos dos documentos
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Cliente baixa apenas os próprios arquivos"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------------
-- Como adicionar um cliente novo (por enquanto, manual, até termos o
-- painel de administração pronto):
--
-- 1. Authentication -> Users -> Add user -> digite o e-mail do cliente
--    (marque "Auto Confirm User")
-- 2. Copie o UUID gerado para esse usuário
-- 3. Table Editor -> clients -> Insert row:
--    id = (o UUID copiado), company_name = "Nome da Empresa"
-- 4. Para subir um documento: Storage -> bucket "documents" -> crie uma
--    pasta com o mesmo UUID do cliente -> suba o arquivo lá dentro
-- 5. Table Editor -> documents -> Insert row:
--    client_id = (o UUID do cliente), name = "Nome do arquivo",
--    category = "Financeiro" (por exemplo),
--    file_path = "UUID_DO_CLIENTE/nome-do-arquivo.pdf"
-- ------------------------------------------------------------------
