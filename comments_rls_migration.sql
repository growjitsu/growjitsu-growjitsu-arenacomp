-- ARENA COMP - COMMENTS TABLE & RLS MIGRATION
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Garantir que a tabela de posts existe (necessária para a chave estrangeira)
-- Se você já tem a tabela posts, este comando não fará nada.
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar a tabela de comentários se ela não existir
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Comentários são visíveis para todos" ON comments;
DROP POLICY IF EXISTS "Usuários autenticados podem comentar" ON comments;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios comentários" ON comments;

-- 5. Criar novas políticas
CREATE POLICY "Comentários são visíveis para todos" 
ON comments FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem comentar" 
ON comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comentários" 
ON comments FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 6. Garantir que a coluna comments_count existe na tabela posts
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='comments_count') THEN
        ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 7. Trigger para atualizar automaticamente o contador de comentários na tabela posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_post_comments_count ON comments;
CREATE TRIGGER tr_update_post_comments_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();
