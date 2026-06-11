-- =========================================================================
-- NOVO GATILHO DE SINCRONIZAÇÃO: n8n (chat_messages) -> painel (messages)
-- =========================================================================

-- 1. Apaga o gatilho antigo (se existir)
DROP TRIGGER IF EXISTS trigger_sync_n8n_chat ON public.n8n_chat_histories;
DROP FUNCTION IF EXISTS public.sync_n8n_chat_to_messages();

-- 2. Cria a nova função que escuta a tabela do n8n (chat_messages)
CREATE OR REPLACE FUNCTION public.sync_n8n_chat_to_messages()
RETURNS trigger AS $$
DECLARE
  v_content text;
  v_phone text;
  v_conversation_id uuid;
  v_client_id uuid;
  v_tenant_id uuid;
  v_admin_id uuid;
  v_is_bot boolean;
BEGIN
  -- Extrair telefone e conteúdo da mensagem do n8n
  v_phone := NEW.phone;
  
  IF NEW.bot_message IS NOT NULL AND NEW.bot_message <> '' THEN
    v_content := NEW.bot_message;
    v_is_bot := true;
  ELSIF NEW.user_message IS NOT NULL AND NEW.user_message <> '' THEN
    v_content := NEW.user_message;
    v_is_bot := false;
  ELSE
    RETURN NEW; -- Se for mensagem vazia, ignora
  END IF;

  -- 1. Encontrar o tenant principal
  SELECT tenant_id INTO v_tenant_id FROM public.whatsapp_sessions LIMIT 1;

  -- 2. Tentar encontrar o perfil no CRM (tabela profiles)
  SELECT id INTO v_client_id
  FROM public.profiles
  WHERE phone = v_phone AND role = 'client'
  LIMIT 1;
  
  -- Se o cliente não existir no CRM, cria um perfil básico
  IF v_client_id IS NULL THEN
     INSERT INTO public.profiles (name, phone, role, tenant_id)
     VALUES (COALESCE(NEW.nomewpp, 'Contato ' || v_phone), v_phone, 'client', v_tenant_id)
     RETURNING id INTO v_client_id;
  END IF;

  -- 3. Encontrar a conversa aberta
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE contact_phone = v_phone AND status = 'open'
  LIMIT 1;

  -- Se não existir conversa aberta, cria uma nova
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (tenant_id, client_id, channel, contact_phone, status)
    VALUES (v_tenant_id, v_client_id, 'whatsapp', v_phone, 'open')
    RETURNING id INTO v_conversation_id;
  END IF;

  -- 4. Encontrar um admin para associar a mensagem do bot
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

  -- 5. Inserir a mensagem no painel CRM
  INSERT INTO public.messages (conversation_id, sender_id, content, type)
  VALUES (
    v_conversation_id, 
    CASE WHEN v_is_bot THEN v_admin_id ELSE NULL END, -- NULL = veio do cliente, v_admin_id = veio do bot/IA
    v_content,
    'text'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplica o gatilho na tabela que o n8n acabou de criar
DROP TRIGGER IF EXISTS trigger_sync_chat_messages_n8n ON public.chat_messages;
CREATE TRIGGER trigger_sync_chat_messages_n8n
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_n8n_chat_to_messages();
  
-- =========================================================================
-- GATILHO PARA SINCRONIZAR client_profiles (n8n) -> profiles (painel)
-- Para que leads captados pela IA apareçam no funil do CRM
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_client_profiles_to_profiles()
RETURNS trigger AS $$
DECLARE
  v_tenant_id uuid;
  v_profile_exists boolean;
BEGIN
  -- Encontrar o tenant principal
  SELECT tenant_id INTO v_tenant_id FROM public.whatsapp_sessions LIMIT 1;

  -- Verifica se já existe
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE phone = NEW.phone) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
     INSERT INTO public.profiles (name, phone, email, role, tenant_id)
     VALUES (NEW.name, NEW.phone, NEW.email, 'client', v_tenant_id);
  ELSE
     -- Atualiza os dados
     UPDATE public.profiles 
     SET name = COALESCE(NEW.name, name), email = COALESCE(NEW.email, email)
     WHERE phone = NEW.phone;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_profiles_n8n ON public.client_profiles;
CREATE TRIGGER trigger_sync_profiles_n8n
  AFTER INSERT OR UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_profiles_to_profiles();
