-- =========================================================================
-- GATILHO DE SINCRONIZAÇÃO: n8n_chat_histories -> messages
-- Este script copia automaticamente as mensagens (do Humano e da IA) 
-- geradas pelo n8n direto para o painel do CRM.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_n8n_chat_to_messages()
RETURNS trigger AS $$
DECLARE
  v_content text;
  v_type text;
  v_phone text;
  v_conversation_id uuid;
  v_client_id uuid;
  v_sender_id uuid;
BEGIN
  -- 1. Extrair os dados de dentro do JSON complexo do n8n
  v_content := NEW.message->>'content';
  v_type := NEW.message->>'type';
  v_phone := NEW.session_id;

  -- Se for alguma mensagem de sistema que não é humana nem da IA, ignora
  IF v_type NOT IN ('human', 'ai') THEN
    RETURN NEW;
  END IF;

  -- 2. Encontrar qual é a conversa ABERTA no painel CRM que pertence a este telefone
  -- Ele limpa os caracteres especiais do telefone para ter certeza que acha o contato
  SELECT c.id, c.client_id INTO v_conversation_id, v_client_id
  FROM public.conversations c
  JOIN public.profiles p ON p.id = c.client_id
  WHERE regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
  ORDER BY c.created_at DESC 
  LIMIT 1;

  -- Se o contato/conversa não existir ainda no CRM, não faz nada
  IF v_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 3. Definir se a mensagem veio do Cliente (human) ou do Robô (ai)
  IF v_type = 'human' THEN
    v_sender_id := v_client_id;
  ELSE
    -- Mensagem da IA (deixamos NULO para o painel reconhecer como Assistente/IA)
    v_sender_id := NULL; 
  END IF;

  -- 4. Inserir a mensagem final limpa na tabela 'messages' do CRM
  INSERT INTO public.messages (
    conversation_id, 
    sender_id, 
    content, 
    message_type
  ) VALUES (
    v_conversation_id, 
    v_sender_id, 
    v_content, 
    'text'
  );

  -- 5. Atualizar a data do último contato na conversa (para ela subir na lista do CRM)
  UPDATE public.conversations SET last_message_at = now() WHERE id = v_conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o gatilho antigo para evitar duplicidade caso o script seja rodado duas vezes
DROP TRIGGER IF EXISTS trigger_sync_n8n_chat ON public.n8n_chat_histories;

-- Cria o gatilho que fica "escutando" a tabela do n8n 24 horas por dia
CREATE TRIGGER trigger_sync_n8n_chat
AFTER INSERT ON public.n8n_chat_histories
FOR EACH ROW EXECUTE FUNCTION public.sync_n8n_chat_to_messages();
