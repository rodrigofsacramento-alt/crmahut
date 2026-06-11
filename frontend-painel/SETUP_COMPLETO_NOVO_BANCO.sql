-- ============================================================
-- SCRIPT DE INICIALIZAÇÃO COMPLETO - ESTATE.IO (WhatsApp CRM)
-- Roda num Supabase totalmente vazio.
-- ============================================================

-- ==========================================
-- 1. TABELAS BASE (CRM FUNDAÇÃO)
-- ==========================================

-- Tabela: tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tabela: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name text,
    email text,
    phone text,
    avatar_url text,
    role text DEFAULT 'client',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(tenant_id, phone) 
);

-- Forçar a adição da coluna caso a tabela já existisse de um teste anterior
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='tenant_id') THEN 
    ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF; 
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Gatilho para criar profile automaticamente após sign up
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Cria um novo tenant para o usuario que acabou de se cadastrar
  INSERT INTO public.tenants (name, slug)
  VALUES (coalesce(NEW.raw_user_meta_data->>'full_name', 'Nova Imobiliária'), gen_random_uuid()::text)
  RETURNING id INTO v_tenant_id;

  -- Cria o profile
  INSERT INTO public.profiles (id, tenant_id, full_name, email, role)
  VALUES (NEW.id, v_tenant_id, NEW.raw_user_meta_data->>'full_name', NEW.email, 'admin');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();

-- ==========================================
-- 1.5 FUNÇÕES AUXILIARES DE TENANT (SaaS)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_my_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Tabela: conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject text DEFAULT 'Novo Atendimento',
    status text DEFAULT 'open',
    ai_enabled boolean DEFAULT true,
    ai_paused_at timestamp with time zone,
    ai_paused_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ai_enabled ON public.conversations(tenant_id, ai_enabled);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Tabela: messages (Faltava essa!)
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text',
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 3. MÓDULO DE INTEGRAÇÃO WHATSAPP
-- ==========================================

-- Tabela: whatsapp_sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_name text NOT NULL DEFAULT 'default',
  phone_number text,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  qr_expires_at timestamptz,
  auth_info jsonb DEFAULT '{}',
  last_connected_at timestamptz,
  last_error text,
  pairing_code text,
  ai_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, session_name)
);
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS auto_set_whatsapp_sessions_tenant ON public.whatsapp_sessions;
CREATE TRIGGER auto_set_whatsapp_sessions_tenant
  BEFORE INSERT ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Tabela: whatsapp_contacts
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  remote_jid text,
  remote_jid_alt text,
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

DROP TRIGGER IF EXISTS auto_set_whatsapp_contacts_tenant ON public.whatsapp_contacts;
CREATE TRIGGER auto_set_whatsapp_contacts_tenant
  BEFORE INSERT ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Tabela: whatsapp_messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  whatsapp_session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  remote_jid text NOT NULL,
  from_me boolean DEFAULT false,
  message_type text NOT NULL DEFAULT 'text',
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
  status text DEFAULT 'sent',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS auto_set_whatsapp_messages_tenant ON public.whatsapp_messages;
CREATE TRIGGER auto_set_whatsapp_messages_tenant
  BEFORE INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ==========================================
-- 4. FUNÇÕES DE IA E WHATSAPP (RPC)
-- ==========================================

-- Controle de IA do Lead
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

  RETURN jsonb_build_object('success', true, 'conversation_id', v_conversation.id, 'ai_enabled', v_conversation.ai_enabled);
END;
$$;

-- Disparar mensagem via whatsapp
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
BEGIN
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Usuario nao autenticado'; END IF;

  SELECT * INTO v_session FROM public.whatsapp_sessions WHERE tenant_id = v_tenant_id AND status = 'connected' LIMIT 1;
  IF v_session.id IS NULL THEN RAISE EXCEPTION 'Nenhuma sessao WhatsApp conectada'; END IF;

  SELECT * INTO v_conversation FROM public.conversations WHERE id = p_conversation_id AND tenant_id = v_tenant_id LIMIT 1;
  IF v_conversation.id IS NULL THEN RAISE EXCEPTION 'Conversa nao encontrada'; END IF;

  SELECT * INTO v_client FROM public.profiles WHERE id = v_conversation.client_id LIMIT 1;

  v_profile_phone := regexp_replace(coalesce(v_client.phone, ''), '\D', '', 'g');
  v_remote_jid := v_profile_phone || '@s.whatsapp.net';

  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, message_type)
  VALUES (p_conversation_id, v_sender_id, v_conversation.client_id, p_content, p_message_type)
  RETURNING id INTO v_message_id;

  INSERT INTO public.whatsapp_messages (
    tenant_id, whatsapp_session_id, conversation_id, remote_jid, from_me, message_type, content, whatsapp_message_id, status
  ) VALUES (
    v_tenant_id, v_session.id, p_conversation_id, v_remote_jid, true, p_message_type, p_content, 'estate:' || v_message_id::text, 'pending'
  );

  UPDATE public.conversations SET updated_at = now() WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$;

-- Gerar Sessão (com parametro unificado)
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

  RETURN jsonb_build_object('success', true, 'session_id', v_session.id, 'status', v_session.status, 'ai_enabled', v_session.ai_enabled);
END;
$$;

-- Desconectar Sessão
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
  SET status = 'disconnected', phone_number = null, qr_code = null, qr_expires_at = null, pairing_code = null, updated_at = now()
  WHERE tenant_id = v_tenant_id AND session_name = p_session_name;

  RETURN jsonb_build_object('success', true);
END;
$$;

NOTIFY pgrst, 'reload schema';
