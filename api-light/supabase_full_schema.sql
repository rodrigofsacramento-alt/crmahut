-- ==========================================
-- ESTRUTURA DO CRM IMOBILIÁRIO & ATENDIMENTO
-- ==========================================

-- Extensão necessária para gerar UUIDs (geralmente ativa por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela: profiles (Identidade base do Cliente/Corretor)
-- Necessária para referenciar o client_id e ai_paused_by nas outras tabelas
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text,
    phone text,
    role text DEFAULT 'client'
);

-- 2. Tabela: conversations (Sessão de bate-papo)
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    ai_enabled boolean DEFAULT true,
    ai_paused_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    tenant_id uuid, -- ID da corretora (Multi-tenant)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: chat_messages (Conversa bruta)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    content text NOT NULL,
    message_type text DEFAULT 'text', -- text, image, audio
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela: leads (O Cérebro do Match / Perfil P1 a P8)
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id uuid, -- Para cruzar apenas com imóveis da mesma corretora
    name text NOT NULL,
    phone text NOT NULL,
    tipo_imovel_p1 text,
    p2_quartos_suites numeric, -- Parseado para número (ex: 2)
    p3_tamanho_imovel text,
    p4_localizacao text,
    p5_faixa_valor numeric, -- Parseado para número (ex: 800000)
    p6_perfil_familiar text,
    p7_necessidades text,
    p8_urgencia text,
    stage text DEFAULT 'Primeiro Atendimento',
    status text DEFAULT 'active',
    -- Campos automáticos/calculados para a View
    lead_text text GENERATED ALWAYS AS (
        COALESCE(p4_localizacao, '') || ' ' || 
        COALESCE(p6_perfil_familiar, '') || ' ' || 
        COALESCE(p7_necessidades, '') || ' ' || 
        COALESCE(p8_urgencia, '')
    ) STORED,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela: properties (O Catálogo de Imóveis)
CREATE TABLE IF NOT EXISTS public.properties (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id uuid, -- Para cruzar apenas com leads da mesma corretora
    type text, -- ex: residential, land
    price numeric,
    bedrooms integer,
    area numeric,
    title text,
    description text,
    location text,
    status text DEFAULT 'available',
    -- Campo calculado para pesquisa de texto
    property_text text GENERATED ALWAYS AS (
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(location, '')
    ) STORED,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- VIEW: lead_property_recommendations (A Calculadora Viva)
-- ==========================================
-- A lógica matemática exata descrita no fluxo
CREATE OR REPLACE VIEW public.lead_property_recommendations AS
SELECT 
    l.id AS lead_id,
    p.id AS property_id,
    l.tenant_id,
    p.title AS property_title,
    p.price AS property_price,
    p.location AS property_location,
    
    -- CÁLCULO DO MATCH SCORE
    (
        -- 1. Tipo do Imóvel (+28 pontos)
        CASE WHEN l.tipo_imovel_p1 ILIKE '%' || p.type || '%' THEN 28 ELSE 0 END
        +
        -- 2. Localização (+25 pontos bidirecional simples usando ILIKE)
        CASE WHEN p.location ILIKE '%' || l.p4_localizacao || '%' 
               OR l.p4_localizacao ILIKE '%' || p.location || '%' THEN 25 ELSE 0 END
        +
        -- 3. Quartos (+20 exato, +12 diferença de 1)
        CASE 
            WHEN l.p2_quartos_suites = p.bedrooms THEN 20
            WHEN abs(l.p2_quartos_suites - p.bedrooms) = 1 THEN 12
            ELSE 0 
        END
        +
        -- 4. Valor Financeiro (+20 menor igual, +10 até 15% acima, -8 estouro)
        CASE
            WHEN p.price <= l.p5_faixa_valor THEN 20
            WHEN p.price <= (l.p5_faixa_valor * 1.15) THEN 10
            ELSE -8
        END
        +
        -- 5. Match Semântico Básico (Procurando palavras do lead na descrição do imóvel)
        -- OBS: No Postgres puro, uma implementação complexa exigiria tsvector/tsquery, 
        -- aqui usamos uma lógica simples verificando se o texto longo compartilha termos.
        -- Para +12 pontos genéricos baseados na compatibilidade dos textos:
        CASE WHEN p.property_text ILIKE '%' || l.p7_necessidades || '%' THEN 12 ELSE 0 END
        +
        -- 6. Bônus de Novidade (+8 pontos se cadastrado hoje)
        CASE WHEN p.created_at >= CURRENT_DATE THEN 8 ELSE 0 END

    ) AS match_score

FROM 
    public.leads l
JOIN 
    public.properties p ON l.tenant_id = p.tenant_id
WHERE 
    l.status = 'active' AND 
    p.status = 'available';

-- ==========================================
-- VIEW: lead_best_property_recommendations
-- ==========================================
-- Pega o TOP 1 Match para cada Lead
CREATE OR REPLACE VIEW public.lead_best_property_recommendations AS
SELECT DISTINCT ON (lead_id)
    lead_id,
    property_id,
    property_title,
    property_price,
    match_score
FROM 
    public.lead_property_recommendations
WHERE 
    match_score > 45 -- Apenas Strong Matches
ORDER BY 
    lead_id, match_score DESC;

-- Habilitar o Realtime para o Chat funcionar
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.chat_messages, public.conversations, public.leads;
COMMIT;
