-- 1. Tabela de Sessões do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    session_name text PRIMARY KEY,
    status text NOT NULL DEFAULT 'disconnected',
    qr_code text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Opcional, mas recomendado se o Front-end for consumir direto)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Exemplo de política: Permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura de sessões" ON public.whatsapp_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Tabela de Mensagens Recebidas
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name text REFERENCES public.whatsapp_sessions(session_name) ON DELETE CASCADE,
    telefone_cliente text NOT NULL,
    nome_cliente text,
    texto text,
    enviado_por text NOT NULL DEFAULT 'cliente',
    timestamp bigint,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS nas mensagens
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de mensagens" ON public.messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Configurar Notificações Realtime do Supabase
-- Isso garante que o Frontend seja avisado automaticamente quando o QR mudar ou mensagem chegar!
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.whatsapp_sessions, public.messages;
COMMIT;
