-- ARENACOMP: REPAIR SCHEMA SCRIPT
-- Execute este script no SQL Editor do seu projeto Supabase para corrigir erros de tabelas ausentes.

-- 1. Garantir que a tabela user_modalities exista
CREATE TABLE IF NOT EXISTS public.user_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    modality TEXT NOT NULL,
    belt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garantir que a tabela team_members exista
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('representative', 'member')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 3. Adicionar coluna team_leader em profiles se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_leader TEXT DEFAULT 'false';

-- 4. Habilitar RLS
ALTER TABLE public.user_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para user_modalities
DROP POLICY IF EXISTS "Modalities are viewable by everyone" ON public.user_modalities;
CREATE POLICY "Modalities are viewable by everyone" ON public.user_modalities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own modalities" ON public.user_modalities;
CREATE POLICY "Users can manage their own modalities" ON public.user_modalities FOR ALL USING (auth.uid() = user_id);

-- 6. Políticas para team_members
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
CREATE POLICY "team_members_select_policy" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
CREATE POLICY "team_members_insert_policy" ON public.team_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
CREATE POLICY "team_members_update_policy" ON public.team_members FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
CREATE POLICY "team_members_delete_policy" ON public.team_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- 7. Recarregar o cache do PostgREST (MUITO IMPORTANTE)
NOTIFY pgrst, 'reload schema';
