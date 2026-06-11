-- =========================================================================
-- TRIGGER PARA COPIAR A MENSAGEM DO USUÁRIO DO N8N PARA O CRM
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_user_message_to_crm()
RETURNS trigger AS $$
DECLARE
  v_phone text;
  v_content text;
  v_conversation_id uuid;
  v_client_id uuid;
BEGIN
  -- Apenas mensagens do tipo 'human' nos interessam aqui (a IA já é inserida pelo n8n direto)
  IF NEW.message->>'type' != 'human' THEN
    RETURN NEW;
  END IF;

  v_phone := NEW.session_id;
  v_content := NEW.message->>'content';

  -- Encontrar o cliente
  SELECT id INTO v_client_id FROM public.profiles WHERE phone = v_phone LIMIT 1;
  IF v_client_id IS NULL THEN RETURN NEW; END IF;

  -- Encontrar a conversa
  SELECT id INTO v_conversation_id FROM public.conversations WHERE contact_phone = v_phone AND status = 'open' LIMIT 1;
  
  IF v_conversation_id IS NOT NULL THEN
    -- Inserir a mensagem como sendo do usuário (sender_id = NULL)
    INSERT INTO public.messages (conversation_id, sender_id, content, type, created_at, updated_at)
    VALUES (v_conversation_id, NULL, v_content, 'text', NOW(), NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_user_msg ON public.n8n_chat_histories;
CREATE TRIGGER trigger_sync_user_msg
  AFTER INSERT ON public.n8n_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_message_to_crm();
