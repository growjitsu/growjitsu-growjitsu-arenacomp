-- ARENACOMP: FIX TEAM REPRESENTATIVE RELATIONSHIP
-- Este script garante que a relação entre equipes e representantes seja salva corretamente

-- 1. Melhorar a restrição de unicidade para representantes
-- Garante que cada equipe tenha apenas um representante oficial
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_user_id_key;
DROP INDEX IF EXISTS idx_one_representative_per_team;
CREATE UNIQUE INDEX idx_one_representative_per_team ON team_members (team_id) WHERE (role = 'representative');

-- 2. Garantir que a restrição de unicidade (team_id, user_id) ainda exista para membros normais
-- Mas agora ela não deve conflitar com o índice parcial acima se o role for diferente
-- Na verdade, um usuário pode ser membro E representante? Geralmente não.
-- Vamos manter uma restrição simples de um registro por usuário por equipe.
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);

-- 3. Atualizar as políticas de RLS para serem mais explícitas (seguindo PASSO 3 do usuário)
DROP POLICY IF EXISTS "Allow insert team_members" ON team_members;
CREATE POLICY "Allow insert team_members" ON team_members FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete team_members" ON team_members;
CREATE POLICY "Allow delete team_members" ON team_members FOR DELETE TO authenticated USING (true);

-- 4. Garantir que a tabela profiles tenha as permissões corretas para busca
DROP POLICY IF EXISTS "Allow read profiles" ON profiles;
CREATE POLICY "Allow read profiles" ON profiles FOR SELECT USING (true);
