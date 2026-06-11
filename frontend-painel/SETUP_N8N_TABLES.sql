-- =========================================================================
-- SETUP COMPLETO DAS TABELAS QUE O FLUXO DO N8N ESPERA ENCONTRAR
-- Execute este script no SQL Editor do seu Supabase
-- =========================================================================

-- Habilitar extensão pgvector (necessária para busca vetorial)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. TABELA DE DOCUMENTOS DA IA
CREATE TABLE IF NOT EXISTS documents (
  id bigserial primary key,
  content text, 
  metadata jsonb, 
  embedding vector(1536) 
);

-- 2. TABELA DE CHATS (SESSÕES) DO N8N
CREATE TABLE IF NOT EXISTS chats (
  id bigserial primary key,
  created_at TIMESTAMPTZ DEFAULT NOW(), 
  phone text UNIQUE,
  updated_at text
);

-- 3. TABELA DE MENSAGENS MANUAIS DO N8N
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(), 
  phone TEXT,
  nomewpp TEXT, 
  bot_message TEXT,
  user_message TEXT, 
  message_type TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- 4. TABELA DE CONTROLE DE FLUXO E PASSOS DA IA
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

-- 5. TABELA DE PERFIL DE CLIENTES (ONDE A IA SALVA OS PRE-REQUISITOS)
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  
  -- Preferências
  prioridade_dia_dia TEXT,
  imagem_novo_lar TEXT,
  situacao_moradia VARCHAR(50), 
  qtd_pessoas INTEGER,
  tem_criancas BOOLEAN DEFAULT false,
  tem_idosos BOOLEAN DEFAULT false,
  tem_necessidades_especiais BOOLEAN DEFAULT false,
  necessidades_detalhes TEXT,
  qtd_quartos INTEGER,
  criterios_localizacao TEXT,
  bairros_preferencia TEXT[],
  
  -- Comercial
  orcamento_min DECIMAL(12,2),
  orcamento_max DECIMAL(12,2),
  orcamento_nota TEXT,
  tipo_negocio VARCHAR(20), 
  urgencia VARCHAR(20), 
  prazo_mudanca VARCHAR(50), 
  
  -- Tracking
  viewed_properties UUID[],
  scheduled_visits JSONB, 
  favorite_properties UUID[],
  broker_notes TEXT[],
  
  -- Status
  current_stage VARCHAR(20) DEFAULT 'INTRO',
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_interaction TIMESTAMP,
  source VARCHAR(50), 
  campaign VARCHAR(100),
  qualification_score INTEGER DEFAULT 0,
  
  total_messages INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  engagement_level VARCHAR(20)
);

-- 6. TABELA DE IMOVEIS (USADA PELA IA PARA MATCHING)
CREATE TABLE IF NOT EXISTS imoveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) CHECK (tipo IN ('apartamento', 'casa', 'terreno', 'cobertura', 'studio', 'comercial')),
  finalidade VARCHAR(20) CHECK (finalidade IN ('venda', 'aluguel', 'ambos')),
  endereco TEXT,
  bairro VARCHAR(100),
  cidade VARCHAR(100) DEFAULT 'São Paulo',
  estado VARCHAR(2) DEFAULT 'SP',
  quartos INTEGER,
  suites INTEGER DEFAULT 0,
  banheiros INTEGER,
  vagas_garagem INTEGER DEFAULT 0,
  area_total DECIMAL(10, 2),
  area_util DECIMAL(10, 2),
  valor DECIMAL(12, 2),
  condominio DECIMAL(10, 2) DEFAULT 0,
  iptu DECIMAL(10, 2) DEFAULT 0,
  features JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'disponivel',
  codigo_imovel VARCHAR(50) UNIQUE,
  fotos JSONB DEFAULT '[]',
  destaque BOOLEAN DEFAULT false
);

-- Criar a tabela padrão do Postgres Chat Memory (LangChain) se não existir
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL
);
