-- =====================================================
-- LFM Economy Insight - Supabase Schema Setup
-- IDEMPOTENTE: pode rodar multiplas vezes sem erro
-- =====================================================

-- =====================================================
-- TABELA: posts
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    category TEXT DEFAULT 'Mercado',
    date TEXT,
    reading_time TEXT DEFAULT '5 min',
    source JSONB,
    cover TEXT,
    opinion TEXT,
    body TEXT[],
    published BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona colunas que podem estar faltando (caso tabela ja exista)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Mercado';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_time TEXT DEFAULT '5 min';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS opinion TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS body TEXT[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Indices
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts(published);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts(slug);

-- =====================================================
-- TABELA: subscribers
-- =====================================================
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- =====================================================
-- TABELA: config
-- =====================================================
CREATE TABLE IF NOT EXISTS config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ai_tone TEXT,
    ai_prompt_prefix TEXT,
    rss_feeds TEXT[],
    auto_publish BOOLEAN DEFAULT false,
    newsletter_active BOOLEAN DEFAULT true,
    openai_model TEXT DEFAULT 'gpt-4o-mini',
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE config ADD COLUMN IF NOT EXISTS rss_feeds TEXT[];
ALTER TABLE config ADD COLUMN IF NOT EXISTS openai_model TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE config ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;
ALTER TABLE config ADD COLUMN IF NOT EXISTS sync_times_brt TEXT[] DEFAULT ARRAY['07:00', '12:00', '18:00'];
ALTER TABLE config ADD COLUMN IF NOT EXISTS max_posts_per_sync INTEGER DEFAULT 10;
ALTER TABLE config ADD COLUMN IF NOT EXISTS posts_per_feed INTEGER DEFAULT 6;
ALTER TABLE config ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE config ADD COLUMN IF NOT EXISTS email_templates JSONB DEFAULT '{}'::jsonb;
ALTER TABLE config ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb;

-- Remove coluna antiga rss_feed_url se existir (era string, agora e array)
-- ALTER TABLE config DROP COLUMN IF EXISTS rss_feed_url;

-- =====================================================
-- TABELA: sync_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    triggered_by TEXT DEFAULT 'manual',
    posts_created INTEGER DEFAULT 0,
    posts_skipped INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- CONFIG INICIAL
-- =====================================================
INSERT INTO config (ai_tone, ai_prompt_prefix, rss_feeds, auto_publish, newsletter_active, openai_model, sync_enabled, sync_times_brt, max_posts_per_sync, posts_per_feed)
SELECT
    'Sofisticado, analitico e pragmatico. Foco em impacto real para o investidor de varejo brasileiro.',
    'Voce e Luiz Felipe Michelin, consultor independente credenciado pela CVM. Sua analise deve ser direta, conectando a macroeconomia a carteira do investidor comum.',
    ARRAY['https://feeds.valor.com.br/rss/economiaenegocios'],
    false,
    true,
    'gpt-4o-mini',
    true,
    ARRAY['07:00', '12:00', '18:00'],
    10,
    6
WHERE NOT EXISTS (SELECT 1 FROM config LIMIT 1);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_public_read ON posts;
DROP POLICY IF EXISTS posts_admin_all ON posts;

CREATE POLICY posts_public_read ON posts
    FOR SELECT USING (published = true);

CREATE POLICY posts_admin_all ON posts
    FOR ALL USING (auth.role() = 'authenticated');

-- subscribers
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscribers_public_insert ON subscribers;
DROP POLICY IF EXISTS subscribers_admin_all ON subscribers;

CREATE POLICY subscribers_public_insert ON subscribers
    FOR INSERT WITH CHECK (true);

CREATE POLICY subscribers_admin_all ON subscribers
    FOR ALL USING (auth.role() = 'authenticated');

-- config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS config_admin_all ON config;
DROP POLICY IF EXISTS config_public_read ON config;

-- Leitura pública (site exibe social links, categorias etc. sem autenticação)
CREATE POLICY config_public_read ON config
    FOR SELECT USING (true);

-- Escrita/edição apenas para usuários autenticados (admin)
CREATE POLICY config_admin_all ON config
    FOR ALL USING (auth.role() = 'authenticated');

-- sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_logs_admin_all ON sync_logs;

CREATE POLICY sync_logs_admin_all ON sync_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGER updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS config_updated_at ON config;
CREATE TRIGGER config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
