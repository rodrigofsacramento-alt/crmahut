-- Tabela padrão exigida pelo n8n para armazenar o histórico de conversas da IA
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL
);

-- Criar um index para deixar as buscas da IA mais rápidas
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_session_id ON public.n8n_chat_histories(session_id);
