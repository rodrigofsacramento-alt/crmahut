create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  display_name text,
  external_account_id text,
  external_account_email text,
  oauth_secret_ref text,
  scopes text[] not null default '{}',
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz,
  access_token_expires_at timestamptz,
  last_sync_at timestamptz,
  error_message text,
  is_default boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_integrations_provider_check check (provider in ('google_drive', 'manual_upload', 'website', 'other')),
  constraint tenant_integrations_status_check check (status in ('disconnected', 'connecting', 'connected', 'error', 'revoked'))
);

create unique index if not exists tenant_integrations_default_provider_idx
  on public.tenant_integrations (tenant_id, provider)
  where is_default is true;

create index if not exists tenant_integrations_tenant_provider_idx
  on public.tenant_integrations (tenant_id, provider, status);

create table if not exists public.tenant_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid references public.tenant_integrations(id) on delete set null,
  source_type text not null,
  name text not null,
  external_id text,
  external_url text,
  sync_status text not null default 'pending',
  sync_frequency text not null default 'manual',
  sync_cursor text,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_knowledge_sources_type_check check (source_type in ('google_drive_folder', 'google_drive_file', 'manual_upload', 'website', 'system')),
  constraint tenant_knowledge_sources_status_check check (sync_status in ('pending', 'syncing', 'synced', 'error', 'paused')),
  constraint tenant_knowledge_sources_frequency_check check (sync_frequency in ('manual', 'hourly', 'daily', 'weekly'))
);

create unique index if not exists tenant_knowledge_sources_external_idx
  on public.tenant_knowledge_sources (tenant_id, source_type, external_id)
  where external_id is not null;

create index if not exists tenant_knowledge_sources_tenant_status_idx
  on public.tenant_knowledge_sources (tenant_id, sync_status, next_sync_at);

create table if not exists public.tenant_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid not null references public.tenant_knowledge_sources(id) on delete cascade,
  external_file_id text,
  document_id bigint references public.documents(id) on delete set null,
  name text not null,
  mime_type text,
  content_hash text,
  size_bytes bigint,
  version text,
  status text not null default 'pending',
  indexed_at timestamptz,
  last_seen_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_knowledge_documents_status_check check (status in ('pending', 'indexed', 'stale', 'deleted', 'error'))
);

create unique index if not exists tenant_knowledge_documents_external_idx
  on public.tenant_knowledge_documents (tenant_id, source_id, external_file_id)
  where external_file_id is not null;

create index if not exists tenant_knowledge_documents_tenant_status_idx
  on public.tenant_knowledge_documents (tenant_id, status, indexed_at);

alter table public.documents
  add column if not exists knowledge_document_id uuid references public.tenant_knowledge_documents(id) on delete set null;

create index if not exists documents_tenant_knowledge_document_idx
  on public.documents (tenant_id, knowledge_document_id);

drop trigger if exists trg_tenant_integrations_tenant on public.tenant_integrations;
create trigger trg_tenant_integrations_tenant
  before insert on public.tenant_integrations
  for each row execute function public.auto_set_tenant_id();

drop trigger if exists trg_tenant_knowledge_sources_tenant on public.tenant_knowledge_sources;
create trigger trg_tenant_knowledge_sources_tenant
  before insert on public.tenant_knowledge_sources
  for each row execute function public.auto_set_tenant_id();

drop trigger if exists trg_tenant_knowledge_documents_tenant on public.tenant_knowledge_documents;
create trigger trg_tenant_knowledge_documents_tenant
  before insert on public.tenant_knowledge_documents
  for each row execute function public.auto_set_tenant_id();

drop trigger if exists trg_tenant_integrations_updated_at on public.tenant_integrations;
create trigger trg_tenant_integrations_updated_at
  before update on public.tenant_integrations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tenant_knowledge_sources_updated_at on public.tenant_knowledge_sources;
create trigger trg_tenant_knowledge_sources_updated_at
  before update on public.tenant_knowledge_sources
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tenant_knowledge_documents_updated_at on public.tenant_knowledge_documents;
create trigger trg_tenant_knowledge_documents_updated_at
  before update on public.tenant_knowledge_documents
  for each row execute function public.set_updated_at();

alter table public.tenant_integrations enable row level security;
alter table public.tenant_knowledge_sources enable row level security;
alter table public.tenant_knowledge_documents enable row level security;

drop policy if exists tenant_integrations_select on public.tenant_integrations;
create policy tenant_integrations_select
  on public.tenant_integrations for select
  using (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_integrations_insert on public.tenant_integrations;
create policy tenant_integrations_insert
  on public.tenant_integrations for insert
  with check (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_integrations_update on public.tenant_integrations;
create policy tenant_integrations_update
  on public.tenant_integrations for update
  using (tenant_id = public.get_my_tenant_id())
  with check (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_integrations_delete on public.tenant_integrations;
create policy tenant_integrations_delete
  on public.tenant_integrations for delete
  using (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_integrations_super_admin_all on public.tenant_integrations;
create policy tenant_integrations_super_admin_all
  on public.tenant_integrations for all
  using (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true));

drop policy if exists tenant_knowledge_sources_select on public.tenant_knowledge_sources;
create policy tenant_knowledge_sources_select
  on public.tenant_knowledge_sources for select
  using (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_sources_insert on public.tenant_knowledge_sources;
create policy tenant_knowledge_sources_insert
  on public.tenant_knowledge_sources for insert
  with check (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_sources_update on public.tenant_knowledge_sources;
create policy tenant_knowledge_sources_update
  on public.tenant_knowledge_sources for update
  using (tenant_id = public.get_my_tenant_id())
  with check (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_sources_delete on public.tenant_knowledge_sources;
create policy tenant_knowledge_sources_delete
  on public.tenant_knowledge_sources for delete
  using (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_sources_super_admin_all on public.tenant_knowledge_sources;
create policy tenant_knowledge_sources_super_admin_all
  on public.tenant_knowledge_sources for all
  using (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true));

drop policy if exists tenant_knowledge_documents_select on public.tenant_knowledge_documents;
create policy tenant_knowledge_documents_select
  on public.tenant_knowledge_documents for select
  using (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_documents_insert on public.tenant_knowledge_documents;
create policy tenant_knowledge_documents_insert
  on public.tenant_knowledge_documents for insert
  with check (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_documents_update on public.tenant_knowledge_documents;
create policy tenant_knowledge_documents_update
  on public.tenant_knowledge_documents for update
  using (tenant_id = public.get_my_tenant_id())
  with check (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_documents_delete on public.tenant_knowledge_documents;
create policy tenant_knowledge_documents_delete
  on public.tenant_knowledge_documents for delete
  using (tenant_id = public.get_my_tenant_id());

drop policy if exists tenant_knowledge_documents_super_admin_all on public.tenant_knowledge_documents;
create policy tenant_knowledge_documents_super_admin_all
  on public.tenant_knowledge_documents for all
  using (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true));

create or replace view public.tenant_knowledge_health
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  count(distinct i.id) filter (where i.status = 'connected') as connected_integrations,
  count(distinct s.id) as sources_count,
  count(distinct s.id) filter (where s.sync_status = 'error') as sources_with_error,
  count(distinct d.id) filter (where d.status = 'indexed') as indexed_documents,
  max(s.last_sync_at) as last_sync_at
from public.tenants t
left join public.tenant_integrations i on i.tenant_id = t.id
left join public.tenant_knowledge_sources s on s.tenant_id = t.id
left join public.tenant_knowledge_documents d on d.tenant_id = t.id
where t.id = public.get_my_tenant_id()
   or exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true)
group by t.id, t.name;

create or replace function public.match_documents_for_tenant(
  query_embedding vector(1536),
  match_count integer default 5,
  p_tenant_id uuid default null,
  filter jsonb default '{}'::jsonb
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  tenant_id uuid,
  knowledge_document_id uuid,
  similarity double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := coalesce(p_tenant_id, public.get_my_tenant_id());
begin
  if v_tenant_id is null then
    raise exception 'tenant_id is required';
  end if;

  if auth.uid() is not null
    and public.get_my_tenant_id() is not null
    and v_tenant_id <> public.get_my_tenant_id()
    and not exists (select 1 from public.super_admins sa where sa.user_id = auth.uid() and sa.is_active = true)
  then
    raise exception 'tenant_not_allowed';
  end if;

  return query
  select
    d.id,
    d.content,
    d.metadata,
    d.tenant_id,
    d.knowledge_document_id,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.tenant_id = v_tenant_id
    and d.embedding is not null
    and d.metadata @> filter
  order by d.embedding <=> query_embedding
  limit coalesce(match_count, 5);
end;
$$;

grant select on public.tenant_integrations to authenticated, service_role;
grant select on public.tenant_knowledge_sources to authenticated, service_role;
grant select on public.tenant_knowledge_documents to authenticated, service_role;
grant select on public.tenant_knowledge_health to authenticated, service_role;
grant insert, update, delete on public.tenant_integrations to authenticated, service_role;
grant insert, update, delete on public.tenant_knowledge_sources to authenticated, service_role;
grant insert, update, delete on public.tenant_knowledge_documents to authenticated, service_role;
grant execute on function public.match_documents_for_tenant(vector, integer, uuid, jsonb) to authenticated, service_role;

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count integer default null,
  filter jsonb default '{}'::jsonb
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity double precision
)
language plpgsql
stable
as $$
declare
  v_filter jsonb := coalesce(filter, '{}'::jsonb);
  v_tenant_id uuid := nullif(v_filter->>'tenant_id', '')::uuid;
  v_metadata_filter jsonb := v_filter - 'tenant_id';
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.embedding is not null
    and (v_tenant_id is null or d.tenant_id = v_tenant_id)
    and d.metadata @> v_metadata_filter
  order by d.embedding <=> query_embedding
  limit coalesce(match_count, 5);
end;
$$;

grant execute on function public.match_documents(vector, integer, jsonb) to authenticated, service_role;
-- ════════════════════════════════════════════════════════════════════════════
-- ApeXfy — Unificação do Banco de Dados (Projeto 2 → Projeto 1 Consolidado)
-- Executar via Supabase CLI (Management API)
-- ════════════════════════════════════════════════════════════════════════════

-- 0. LIMPAR TABELAS ANTIGAS DO ESCOPO DE TESTE (Para evitar conflitos de colunas ausentes)
DROP TABLE IF EXISTS public.client_profiles CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.dados_cliente CASCADE;
DROP TABLE IF EXISTS public.leads_sync_2_0 CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.n8n_chat_histories CASCADE;

-- 1. HABILITAR EXTENSÃO VETOR
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABELA client_profiles (Perfil Completo e Qualificação da IA)
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  
  -- Preferências e Respostas
  prioridade_dia_dia TEXT,
  imagem_novo_lar TEXT,
  situacao_moradia VARCHAR(50), -- 'aluguel' | 'proprio' | 'familia'
  qtd_pessoas INTEGER,
  tem_criancas BOOLEAN DEFAULT false,
  tem_idosos BOOLEAN DEFAULT false,
  tem_necessidades_especiais BOOLEAN DEFAULT false,
  necessidades_detalhes TEXT,
  qtd_quartos INTEGER,
  criterios_localizacao TEXT,
  bairros_preferencia TEXT[],
  
  -- Orçamento e comercial
  orcamento_min DECIMAL(12,2),
  orcamento_max DECIMAL(12,2),
  orcamento_nota TEXT,
  tipo_negocio VARCHAR(20),
  urgencia VARCHAR(20),
  prazo_mudanca VARCHAR(50),
  
  -- Relacionamentos e Notas
  viewed_properties UUID[],
  scheduled_visits JSONB,
  favorite_properties UUID[],
  broker_notes TEXT[],
  
  -- Controle de Fluxo
  current_stage VARCHAR(20) DEFAULT 'INTRO',
  status VARCHAR(20) DEFAULT 'active',
  
  -- Timestamps e Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ,
  source VARCHAR(50),
  campaign VARCHAR(100),
  qualification_score INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  engagement_level VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_client_prof_phone ON public.client_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_client_prof_tenant ON public.client_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_prof_status ON public.client_profiles(status);

-- RLS: client_profiles
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's client profiles" ON public.client_profiles;
CREATE POLICY "Users can view their tenant's client profiles"
  ON public.client_profiles FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can insert their tenant's client profiles" ON public.client_profiles;
CREATE POLICY "Users can insert their tenant's client profiles"
  ON public.client_profiles FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's client profiles" ON public.client_profiles;
CREATE POLICY "Users can update their tenant's client profiles"
  ON public.client_profiles FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can delete their tenant's client profiles" ON public.client_profiles;
CREATE POLICY "Users can delete their tenant's client profiles"
  ON public.client_profiles FOR DELETE
  USING (tenant_id = public.get_my_tenant_id());

-- Trigger tenant automático: client_profiles
DROP TRIGGER IF EXISTS trg_auto_set_client_profiles_tenant ON public.client_profiles;
CREATE TRIGGER trg_auto_set_client_profiles_tenant
  BEFORE INSERT ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();

-- 3. TABELA chats (Sessões de conversa da IA)
CREATE TABLE IF NOT EXISTS public.chats (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_phone ON public.chats(phone);
CREATE INDEX IF NOT EXISTS idx_chats_tenant ON public.chats(tenant_id);

-- RLS: chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's chats" ON public.chats;
CREATE POLICY "Users can view their tenant's chats"
  ON public.chats FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can insert their tenant's chats" ON public.chats;
CREATE POLICY "Users can insert their tenant's chats"
  ON public.chats FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's chats" ON public.chats;
CREATE POLICY "Users can update their tenant's chats"
  ON public.chats FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can delete their tenant's chats" ON public.chats;
CREATE POLICY "Users can delete their tenant's chats"
  ON public.chats FOR DELETE
  USING (tenant_id = public.get_my_tenant_id());

-- Trigger tenant automático: chats
DROP TRIGGER IF EXISTS trg_auto_set_chats_tenant ON public.chats;
CREATE TRIGGER trg_auto_set_chats_tenant
  BEFORE INSERT ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();


-- 4. TABELA chat_messages (Histórico de mensagens da IA)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  nomewpp TEXT,
  bot_message TEXT,
  user_message TEXT,
  message_type TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_phone ON public.chat_messages(phone);
CREATE INDEX IF NOT EXISTS idx_chat_msg_tenant ON public.chat_messages(tenant_id);

-- RLS: chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's chat messages" ON public.chat_messages;
CREATE POLICY "Users can view their tenant's chat messages"
  ON public.chat_messages FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can insert their tenant's chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert their tenant's chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's chat messages" ON public.chat_messages;
CREATE POLICY "Users can update their tenant's chat messages"
  ON public.chat_messages FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can delete their tenant's chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete their tenant's chat messages"
  ON public.chat_messages FOR DELETE
  USING (tenant_id = public.get_my_tenant_id());

-- Trigger tenant automático: chat_messages
DROP TRIGGER IF EXISTS trg_auto_set_chat_messages_tenant ON public.chat_messages;
CREATE TRIGGER trg_auto_set_chat_messages_tenant
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();


-- 5. TABELA documents (RAG / Base de Conhecimento Vetorial)
CREATE TABLE IF NOT EXISTS public.documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536)
);

-- RLS: documents (Acesso para usuários autenticados do SaaS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select on documents" ON public.documents;
CREATE POLICY "Allow authenticated select on documents"
  ON public.documents FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated all on documents" ON public.documents;
CREATE POLICY "Allow authenticated all on documents"
  ON public.documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 6. FUNÇÃO DE BUSCA VETORIAL match_documents
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(1536),
  match_count INT DEFAULT NULL,
  filter JSONB DEFAULT '{}'
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- 7. TABELA dados_cliente (Estado Rápido de IA)
CREATE TABLE IF NOT EXISTS public.dados_cliente (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  telefone TEXT NOT NULL UNIQUE,
  nomewpp TEXT,
  atendimento_ia TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dados_cli_phone ON public.dados_cliente(telefone);
CREATE INDEX IF NOT EXISTS idx_dados_cli_tenant ON public.dados_cliente(tenant_id);

-- RLS: dados_cliente
ALTER TABLE public.dados_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's dados_cliente" ON public.dados_cliente;
CREATE POLICY "Users can view their tenant's dados_cliente"
  ON public.dados_cliente FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can insert their tenant's dados_cliente" ON public.dados_cliente;
CREATE POLICY "Users can insert their tenant's dados_cliente"
  ON public.dados_cliente FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's dados_cliente" ON public.dados_cliente;
CREATE POLICY "Users can update their tenant's dados_cliente"
  ON public.dados_cliente FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());

-- Trigger tenant automático: dados_cliente
DROP TRIGGER IF EXISTS trg_auto_set_dados_cliente_tenant ON public.dados_cliente;
CREATE TRIGGER trg_auto_set_dados_cliente_tenant
  BEFORE INSERT ON public.dados_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();


-- 8. TABELA leads_sync_2_0 (Compatibilidade com nós do n8n)
CREATE TABLE IF NOT EXISTS public.leads_sync_2_0 (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  atendimento_ia TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_sync_phone ON public.leads_sync_2_0(phone);
CREATE INDEX IF NOT EXISTS idx_leads_sync_tenant ON public.leads_sync_2_0(tenant_id);

-- RLS: leads_sync_2_0
ALTER TABLE public.leads_sync_2_0 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's leads_sync" ON public.leads_sync_2_0;
CREATE POLICY "Users can view their tenant's leads_sync"
  ON public.leads_sync_2_0 FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can insert their tenant's leads_sync" ON public.leads_sync_2_0;
CREATE POLICY "Users can insert their tenant's leads_sync"
  ON public.leads_sync_2_0 FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's leads_sync" ON public.leads_sync_2_0;
CREATE POLICY "Users can update their tenant's leads_sync"
  ON public.leads_sync_2_0 FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());

-- Trigger tenant automático: leads_sync_2_0
DROP TRIGGER IF EXISTS trg_auto_set_leads_sync_tenant ON public.leads_sync_2_0;
CREATE TRIGGER trg_auto_set_leads_sync_tenant
  BEFORE INSERT ON public.leads_sync_2_0
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();


-- 9. TABELA n8n_chat_histories (Compatibilidade Langchain PostgreSQL Memory)
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_n8n_chat_sess ON public.n8n_chat_histories(session_id);

-- RLS: n8n_chat_histories (Autenticado geral para compatibilidade com biblioteca de memória)
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated on n8n_chat_histories" ON public.n8n_chat_histories;
CREATE POLICY "Allow authenticated on n8n_chat_histories"
  ON public.n8n_chat_histories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
-- ============================================================
-- Módulo de Integração WhatsApp (Baileys)
-- Tabelas para sessões, mensagens e contatos
-- ============================================================

-- 1. TABELA whatsapp_sessions
-- Armazena o estado da conexão WhatsApp por tenant
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_name text NOT NULL DEFAULT 'default',
  phone_number text,
  status text NOT NULL DEFAULT 'disconnected', -- 'disconnected', 'connecting', 'qr_ready', 'connected', 'error'
  qr_code text,
  qr_expires_at timestamptz,
  auth_info jsonb DEFAULT '{}',
  last_connected_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, session_name)
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's whatsapp sessions" ON public.whatsapp_sessions;
CREATE POLICY "Users can view their tenant's whatsapp sessions"
  ON public.whatsapp_sessions FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can insert their tenant's whatsapp sessions" ON public.whatsapp_sessions;
CREATE POLICY "Users can insert their tenant's whatsapp sessions"
  ON public.whatsapp_sessions FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's whatsapp sessions" ON public.whatsapp_sessions;
CREATE POLICY "Users can update their tenant's whatsapp sessions"
  ON public.whatsapp_sessions FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Users can delete their tenant's whatsapp sessions" ON public.whatsapp_sessions;
CREATE POLICY "Users can delete their tenant's whatsapp sessions"
  ON public.whatsapp_sessions FOR DELETE
  USING (tenant_id = public.get_my_tenant_id());

DROP TRIGGER IF EXISTS auto_set_whatsapp_sessions_tenant ON public.whatsapp_sessions;
CREATE TRIGGER auto_set_whatsapp_sessions_tenant
  BEFORE INSERT ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();

-- 2. TABELA whatsapp_contacts
-- Cache de contatos sincronizados do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  remote_jid text,
  phone_number text NOT NULL,
  name text,
  profile_pic_url text,
  profile_pic_status text NOT NULL DEFAULT 'pending',
  profile_pic_last_attempt_at timestamptz,
  profile_pic_last_success_at timestamptz,
  profile_pic_error text,
  profile_pic_attempts integer NOT NULL DEFAULT 0,
  is_group boolean DEFAULT false,
  is_business boolean DEFAULT false,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, phone_number)
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's whatsapp contacts" ON public.whatsapp_contacts;
CREATE POLICY "Users can view their tenant's whatsapp contacts"
  ON public.whatsapp_contacts FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP TRIGGER IF EXISTS auto_set_whatsapp_contacts_tenant ON public.whatsapp_contacts;
CREATE TRIGGER auto_set_whatsapp_contacts_tenant
  BEFORE INSERT ON public.whatsapp_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remote_jid text,
  ADD COLUMN IF NOT EXISTS remote_jid_alt text,
  ADD COLUMN IF NOT EXISTS profile_pic_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS profile_pic_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_pic_last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_pic_error text,
  ADD COLUMN IF NOT EXISTS profile_pic_attempts integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_contacts_profile_pic_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_contacts
      ADD CONSTRAINT whatsapp_contacts_profile_pic_status_check
      CHECK (profile_pic_status IN ('pending', 'syncing', 'synced', 'unavailable', 'failed', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON public.whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_profile ON public.whatsapp_contacts(profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_conversation ON public.whatsapp_contacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_remote_jid_alt ON public.whatsapp_contacts(remote_jid_alt);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_profile_pic_status
  ON public.whatsapp_contacts(tenant_id, profile_pic_status, profile_pic_last_attempt_at)
  WHERE is_group = false OR is_group IS NULL;

-- 3. TABELA whatsapp_messages
-- Mensagens sincronizadas do WhatsApp (espelho para atendimento)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  whatsapp_session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  remote_jid text NOT NULL,
  from_me boolean DEFAULT false,
  message_type text NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document', 'location'
  content text,
  media_url text,
  media_mime_type text,
  media_file_name text,
  media_size integer,
  whatsapp_message_id text,
  canonical_remote_jid text,
  source_event_type text,
  processing_status text NOT NULL DEFAULT 'processed',
  processing_error text,
  media_status text NOT NULL DEFAULT 'none',
  retry_count integer NOT NULL DEFAULT 0,
  status text DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users can view their tenant's whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP TRIGGER IF EXISTS auto_set_whatsapp_messages_tenant ON public.whatsapp_messages;
CREATE TRIGGER auto_set_whatsapp_messages_tenant
  BEFORE INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON public.whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON public.whatsapp_messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_pending ON public.whatsapp_messages(status, from_me, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processing ON public.whatsapp_messages(tenant_id, processing_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_media_status ON public.whatsapp_messages(tenant_id, media_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_canonical_jid ON public.whatsapp_messages(tenant_id, canonical_remote_jid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_session_wid_unique
  ON public.whatsapp_messages(whatsapp_session_id, whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_message_processing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  whatsapp_message_id text NOT NULL,
  remote_jid text NOT NULL,
  canonical_remote_jid text,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing', 'echo')),
  event_type text,
  message_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'duplicate', 'failed', 'ignored')),
  media_status text NOT NULL DEFAULT 'none' CHECK (media_status IN ('none', 'pending', 'downloaded', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  error text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_processing_session_message
  ON public.whatsapp_message_processing(whatsapp_session_id, whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_processing_tenant_status
  ON public.whatsapp_message_processing(tenant_id, status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_processing_media_status
  ON public.whatsapp_message_processing(tenant_id, media_status, last_seen_at DESC);

ALTER TABLE public.whatsapp_message_processing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_processing_super_admin_only ON public.whatsapp_message_processing;
CREATE POLICY whatsapp_processing_super_admin_only
  ON public.whatsapp_message_processing FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid() AND sa.is_active = true));

CREATE TABLE IF NOT EXISTS public.whatsapp_broker_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  session_name text NOT NULL DEFAULT 'default',
  status text NOT NULL DEFAULT 'unknown',
  broker_pid integer,
  last_event_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (whatsapp_session_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broker_health_tenant
  ON public.whatsapp_broker_health(tenant_id, updated_at DESC);

ALTER TABLE public.whatsapp_broker_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_broker_health_super_admin_only ON public.whatsapp_broker_health;
CREATE POLICY whatsapp_broker_health_super_admin_only
  ON public.whatsapp_broker_health FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid() AND sa.is_active = true));

-- Upgrades idempotentes para bancos onde a primeira versao ja foi aplicada
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remote_jid text,
  ADD COLUMN IF NOT EXISTS remote_jid_alt text;

-- 4. Função RPC para enviar mensagem via WhatsApp
CREATE OR REPLACE FUNCTION public.send_whatsapp_message(
  p_phone_number text,
  p_content text,
  p_message_type text DEFAULT 'text'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
  v_session public.whatsapp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM public.whatsapp_sessions
  WHERE tenant_id = v_tenant_id AND status = 'connected'
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma sessão WhatsApp conectada');
  END IF;

  INSERT INTO public.whatsapp_messages (
    tenant_id, whatsapp_session_id, remote_jid, from_me, message_type, content, status
  ) VALUES (
    v_tenant_id, v_session.id, p_phone_number || '@s.whatsapp.net', true, p_message_type, p_content, 'pending'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Mensagem enfileirada para envio');
END;
$$;

-- 5. Função RPC para iniciar sessão (gerar QR code)
-- Envia uma resposta a partir de uma conversa do Atendimento.
-- A mensagem fica visivel imediatamente no CRM e o broker envia pelo WhatsApp.
CREATE OR REPLACE FUNCTION public.send_whatsapp_message(
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
  v_sender_id uuid := auth.uid();
  v_session public.whatsapp_sessions%ROWTYPE;
  v_conversation public.conversations%ROWTYPE;
  v_client public.profiles%ROWTYPE;
  v_message_id uuid;
  v_remote_jid text;
  v_contact_phone text;
  v_profile_phone text;
  v_message_table_type text;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT * INTO v_session
  FROM public.whatsapp_sessions
  WHERE tenant_id = v_tenant_id AND status = 'connected'
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma sessao WhatsApp conectada';
  END IF;

  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = p_conversation_id AND tenant_id = v_tenant_id
  LIMIT 1;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'Conversa nao encontrada';
  END IF;

  SELECT * INTO v_client
  FROM public.profiles
  WHERE id = v_conversation.client_id AND tenant_id = v_tenant_id
  LIMIT 1;

  SELECT regexp_replace(phone_number, '\D', '', 'g') INTO v_contact_phone
  FROM public.whatsapp_contacts
  WHERE tenant_id = v_tenant_id
    AND conversation_id = p_conversation_id
    AND regexp_replace(coalesce(phone_number, ''), '\D', '', 'g') LIKE '55%'
  ORDER BY last_message_at DESC NULLS LAST, updated_at DESC NULLS LAST
  LIMIT 1;

  v_profile_phone := regexp_replace(coalesce(v_client.phone, ''), '\D', '', 'g');

  IF v_client.id IS NULL OR coalesce(v_contact_phone, v_profile_phone, '') = '' THEN
    RAISE EXCEPTION 'Cliente sem telefone para envio via WhatsApp';
  END IF;

  IF coalesce(v_contact_phone, '') <> '' THEN
    v_remote_jid := v_contact_phone || '@s.whatsapp.net';
  ELSE
    v_remote_jid := v_profile_phone || '@s.whatsapp.net';
  END IF;

  v_message_table_type := CASE
    WHEN p_message_type IN ('system', 'internal_note') THEN p_message_type
    ELSE 'text'
  END;

  INSERT INTO public.messages (
    conversation_id, sender_id, receiver_id, content, message_type
  ) VALUES (
    p_conversation_id, v_sender_id, v_conversation.client_id, p_content, v_message_table_type
  )
  RETURNING id INTO v_message_id;

  INSERT INTO public.whatsapp_messages (
    tenant_id, whatsapp_session_id, conversation_id, remote_jid, from_me, message_type, content, whatsapp_message_id, status
  ) VALUES (
    v_tenant_id, v_session.id, p_conversation_id, v_remote_jid, true, p_message_type, p_content, 'estate:' || v_message_id::text, 'pending'
  );

  UPDATE public.conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id, 'message', 'Mensagem enfileirada para envio');
END;
$$;

CREATE OR REPLACE FUNCTION public.start_whatsapp_session(
  p_session_name text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
  v_session public.whatsapp_sessions%ROWTYPE;
BEGIN
  INSERT INTO public.whatsapp_sessions (tenant_id, user_id, session_name, status)
  VALUES (v_tenant_id, auth.uid(), p_session_name, 'connecting')
  ON CONFLICT (tenant_id, session_name)
  DO UPDATE SET status = 'connecting', user_id = auth.uid(), updated_at = now(), qr_code = null, qr_expires_at = null
  RETURNING * INTO v_session;

  RETURN jsonb_build_object('success', true, 'session_id', v_session.id, 'status', v_session.status);
END;
$$;

-- 6. Função RPC para desconectar sessão
CREATE OR REPLACE FUNCTION public.disconnect_whatsapp_session(
  p_session_name text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
BEGIN
  UPDATE public.whatsapp_sessions
  SET status = 'disconnected', qr_code = null, qr_expires_at = null, updated_at = now()
  WHERE tenant_id = v_tenant_id AND session_name = p_session_name;

  RETURN jsonb_build_object('success', true, 'message', 'Sessão desconectada');
END;
$$;
-- Global and per-conversation AI controls for WhatsApp -> n8n automation.
-- When either switch is off, incoming client messages are still stored in the CRM,
-- but the n8n AI workflow is not triggered.

ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_paused_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_ai_enabled
  ON public.conversations(tenant_id, ai_enabled);

CREATE OR REPLACE FUNCTION public.set_whatsapp_ai_enabled(
  p_enabled boolean,
  p_session_name text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
  v_session public.whatsapp_sessions%ROWTYPE;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant nao encontrado para o usuario autenticado';
  END IF;

  INSERT INTO public.whatsapp_sessions (tenant_id, user_id, session_name, status, ai_enabled)
  VALUES (v_tenant_id, auth.uid(), p_session_name, 'disconnected', p_enabled)
  ON CONFLICT (tenant_id, session_name)
  DO UPDATE SET
    ai_enabled = excluded.ai_enabled,
    updated_at = now()
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'ai_enabled', v_session.ai_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_conversation_ai_enabled(
  p_conversation_id uuid,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
  v_conversation public.conversations%ROWTYPE;
  v_client_phone text;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant nao encontrado para o usuario autenticado';
  END IF;

  UPDATE public.conversations
  SET
    ai_enabled = p_enabled,
    ai_paused_at = CASE WHEN p_enabled THEN NULL ELSE now() END,
    ai_paused_by = CASE WHEN p_enabled THEN NULL ELSE auth.uid() END,
    updated_at = now()
  WHERE id = p_conversation_id
    AND tenant_id = v_tenant_id
  RETURNING * INTO v_conversation;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'Conversa nao encontrada';
  END IF;

  SELECT regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')
  INTO v_client_phone
  FROM public.profiles p
  WHERE p.id = v_conversation.client_id
    AND p.tenant_id = v_tenant_id;

  IF coalesce(v_client_phone, '') <> '' THEN
    UPDATE public.leads_sync_2_0
    SET atendimento_ia = CASE WHEN p_enabled THEN 'active' ELSE 'pause' END
    WHERE tenant_id = v_tenant_id
      AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_client_phone;

    UPDATE public.leads
    SET atendimento_ia = CASE WHEN p_enabled THEN 'active' ELSE 'pause' END
    WHERE tenant_id = v_tenant_id
      AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_client_phone;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation.id,
    'ai_enabled', v_conversation.ai_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_whatsapp_session(
  p_session_name text DEFAULT 'default',
  p_phone_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
  v_session public.whatsapp_sessions%ROWTYPE;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant nao encontrado para o usuario autenticado';
  END IF;

  INSERT INTO public.whatsapp_sessions (tenant_id, user_id, session_name, phone_number, status)
  VALUES (v_tenant_id, auth.uid(), p_session_name, p_phone_number, 'connecting')
  ON CONFLICT (tenant_id, session_name)
  DO UPDATE SET
    status = 'connecting',
    user_id = auth.uid(),
    phone_number = p_phone_number,
    updated_at = now(),
    qr_code = null,
    qr_expires_at = null,
    pairing_code = null,
    last_error = null
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'status', v_session.status,
    'ai_enabled', v_session.ai_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.disconnect_whatsapp_session(
  p_session_name text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid := public.get_my_tenant_id();
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant nao encontrado para o usuario autenticado';
  END IF;

  UPDATE public.whatsapp_sessions
  SET
    status = 'disconnected',
    phone_number = null,
    qr_code = null,
    qr_expires_at = null,
    pairing_code = null,
    last_error = null,
    updated_at = now()
  WHERE tenant_id = v_tenant_id
    AND session_name = p_session_name;

  RETURN jsonb_build_object('success', true, 'message', 'Sessao desconectada');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_client_message()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url text := 'https://bardendev-n8n-editor.pe9yob.easypanel.host/webhook/2748070d-3e55-4303-ac84-6833fd6701f9';
  v_secret_token text := nullif(current_setting('app.n8n_webhook_token', true), '');
  v_client_id uuid;
  v_tenant_id uuid;
  v_conversation_ai_enabled boolean;
  v_session_ai_enabled boolean;
  v_client_phone text;
  v_client_name text;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  IF NEW.is_read = true OR NEW.message_type <> 'text' THEN
    RETURN NEW;
  END IF;

  SELECT client_id, tenant_id, coalesce(ai_enabled, true)
  INTO v_client_id, v_tenant_id, v_conversation_ai_enabled
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_conversation_ai_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(bool_and(coalesce(ai_enabled, true)), true)
  INTO v_session_ai_enabled
  FROM public.whatsapp_sessions
  WHERE tenant_id = v_tenant_id
    AND session_name = 'default';

  IF coalesce(v_session_ai_enabled, true) IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT phone, full_name INTO v_client_phone, v_client_name
  FROM public.profiles
  WHERE id = v_client_id;

  IF coalesce(v_client_phone, '') = '' THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'id', NEW.id,
    'sender', regexp_replace(v_client_phone, '\D', '', 'g'),
    'name', coalesce(v_client_name, 'Cliente'),
    'content', NEW.content,
    'type', NEW.message_type,
    'datetime', NEW.created_at,
    'conversation_id', NEW.conversation_id,
    'tenant_id', v_tenant_id,
    'ai_enabled', true
  );

  SELECT net.http_post(
    url := v_webhook_url,
    body := v_payload,
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CASE WHEN v_secret_token IS NOT NULL THEN 'Bearer ' || v_secret_token ELSE NULL END
    ))
  ) INTO v_request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
