-- ==============================================================
-- 0. FORÇAR A EXISTÊNCIA DE COLUNAS NA TABELA PROFILES ANTIGA
-- ==============================================================
DO $$ 
BEGIN 
  BEGIN
    ALTER TABLE public.profiles ADD COLUMN email text;
  EXCEPTION WHEN duplicate_column THEN END;

  BEGIN
    ALTER TABLE public.profiles ADD COLUMN full_name text;
  EXCEPTION WHEN duplicate_column THEN END;

  BEGIN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'client';
  EXCEPTION WHEN duplicate_column THEN END;

  BEGIN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  EXCEPTION WHEN duplicate_column THEN END;

  BEGIN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- ==============================================================
-- 1. CORRIGIR USUÁRIOS CRIADOS ANTES DA ESTRUTURA ESTAR PRONTA
-- ==============================================================
DO $$
DECLARE
  v_user record;
  v_tenant_id uuid;
BEGIN
  -- Para cada usuário no Supabase Auth que não tem um Perfil na nossa tabela
  FOR v_user IN SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    -- Criar a Imobiliária dele
    INSERT INTO public.tenants (name, slug) 
    VALUES ('Sua Imobiliária', gen_random_uuid()::text) 
    RETURNING id INTO v_tenant_id;
    
    -- Criar o Perfil dele amarrado à Imobiliária
    INSERT INTO public.profiles (id, tenant_id, email, full_name, role) 
    VALUES (v_user.id, v_tenant_id, v_user.email, 'Corretor Principal', 'admin');
  END LOOP;
END;
$$;

-- ==============================================================
-- 2. HABILITAR PERMISSÕES DE LEITURA/ESCRITA (RLS)
-- ==============================================================
-- Obs: Como esse é o seu painel fechado, vamos liberar acesso total
-- para quem estiver logado (authenticated).

DROP POLICY IF EXISTS "auth_all" ON public.tenants;
CREATE POLICY "auth_all" ON public.tenants FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all" ON public.profiles;
CREATE POLICY "auth_all" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all" ON public.conversations;
CREATE POLICY "auth_all" ON public.conversations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all" ON public.messages;
CREATE POLICY "auth_all" ON public.messages FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all" ON public.whatsapp_sessions;
CREATE POLICY "auth_all" ON public.whatsapp_sessions FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all" ON public.whatsapp_contacts;
CREATE POLICY "auth_all" ON public.whatsapp_contacts FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all" ON public.whatsapp_messages;
CREATE POLICY "auth_all" ON public.whatsapp_messages FOR ALL USING (auth.role() = 'authenticated');
