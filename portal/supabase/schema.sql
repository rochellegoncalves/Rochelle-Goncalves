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
  add column if not exists admin_profession text,
  add column if not exists active boolean not null default true,
  add column if not exists plano_acao_sheet_url text;

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

alter table public.documents
  add column if not exists autentique_document_id text;

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

-- Timesheet: horas trabalhadas por cliente, via cronômetro em tempo
-- real ou lançamento manual retroativo. ended_at nulo = cronômetro
-- rodando nesse registro.
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  description text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.time_entries enable row level security;
-- Sem policy de leitura pro cliente -- só acessível via chave de
-- serviço nas rotas /api/admin/timesheet.

-- Indicadores da própria consultoria: um check-in por semana, cobrindo
-- as áreas da rotina dela (Estratégica/Estudo, Posicionamento,
-- Produção) que não têm outra fonte de dados -- Relacionamentos já é
-- coberto pelo CRM (aba Relacionamentos da planilha).
create table if not exists public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  objetivo_semana text,
  objetivo_status text,
  estudo_count integer,
  posicionamento_count integer,
  producao_count integer,
  revisao_feita boolean not null default false,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.weekly_checkins enable row level security;

-- Autoauditoria: os itens do checklist "Aplicação Consultoria" (o que
-- ela normalmente monta pros clientes), aplicados ao próprio negócio.
create table if not exists public.methodology_checklist (
  item_key text primary key,
  done boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.methodology_checklist enable row level security;

-- Conteúdo escrito de cada item da autoauditoria (o Canvas dela de
-- verdade, o SWOT dela de verdade etc.), não só um checkbox.
create table if not exists public.methodology_pages (
  item_key text primary key,
  content text,
  updated_at timestamptz not null default now()
);

alter table public.methodology_pages enable row level security;

-- Registro de atividades do CRM (contato feito, reunião realizada,
-- virou cliente) -- ao contrário da coluna "Data Contato" da planilha
-- (que é sobrescrita a cada atualização), aqui cada evento fica
-- guardado, então dá pra contar quantos contatos/reuniões por dia ou
-- semana e calcular quanto tempo um contato levou até virar cliente.
create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  contact_nome text not null,
  tipo text not null,
  data date not null,
  obs text,
  created_at timestamptz not null default now()
);

alter table public.crm_activities enable row level security;

-- Tokens OAuth de integrações externas (hoje só Contatos do Google no
-- CRM). Uma linha por provider -- só ela mesma autoriza, então não
-- precisa de uma linha por usuário.
create table if not exists public.oauth_tokens (
  provider text primary key,
  access_token text,
  refresh_token text,
  expiry timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.oauth_tokens enable row level security;

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
