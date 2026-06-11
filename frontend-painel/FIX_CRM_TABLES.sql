-- =========================================================================
-- ATUALIZAÇÃO DAS TABELAS DO CRM PARA COMPATIBILIDADE COM N8N
-- Execute este script no SQL Editor do seu Supabase
-- =========================================================================

-- 1. Tabela CONVERSATIONS
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
ADD COLUMN IF NOT EXISTS client_id UUID;

-- 2. Tabela MESSAGES
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS conversation_id UUID,
ADD COLUMN IF NOT EXISTS content TEXT;

-- 3. Tabela PROFILES (Campos do Funil da IA)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS atendimento_ia TEXT,
ADD COLUMN IF NOT EXISTS conversation_stage TEXT,
ADD COLUMN IF NOT EXISTS score_confianca TEXT,
ADD COLUMN IF NOT EXISTS perfil_completo TEXT,
ADD COLUMN IF NOT EXISTS qtd_quartos TEXT,
ADD COLUMN IF NOT EXISTS budget_max TEXT,
ADD COLUMN IF NOT EXISTS interest TEXT,
ADD COLUMN IF NOT EXISTS bairros_preferencia TEXT,
ADD COLUMN IF NOT EXISTS tipo_imovel_p1 TEXT,
ADD COLUMN IF NOT EXISTS p2_quartos_suites TEXT,
ADD COLUMN IF NOT EXISTS p3_tamanho_imovel TEXT,
ADD COLUMN IF NOT EXISTS p4_localizacao TEXT,
ADD COLUMN IF NOT EXISTS p5_faixa_valor TEXT,
ADD COLUMN IF NOT EXISTS p6_perfil_familiar TEXT,
ADD COLUMN IF NOT EXISTS p7_necessidades_especiais TEXT,
ADD COLUMN IF NOT EXISTS p8_urgencia TEXT;

-- Criação das outras tabelas auxiliares que a IA usa
CREATE TABLE IF NOT EXISTS lead_flow_state (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  current_step TEXT,
  last_question_key TEXT,
  last_answer TEXT,
  flow_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela padrão do Postgres Chat Memory (LangChain) se não existir
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL
);

-- ATUALIZA O CACHE DO SUPABASE (MUITO IMPORTANTE PARA O N8N RECONHECER AS COLUNAS)
NOTIFY pgrst, 'reload schema';
