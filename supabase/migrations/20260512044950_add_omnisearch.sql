-- ============================================
-- FUNÇÃO: omni_search (Versão Leve - Sem Travamentos)
-- Busca unificada no conteúdo usando ILIKE para não sobrecarregar a CPU
-- ============================================

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION omni_search(
    p_search_term TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    type TEXT,
    slug TEXT,
    thumbnail_url TEXT,
    snippet TEXT,
    rank REAL
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_search TEXT;
BEGIN
    -- Prepara o termo de busca para o ILIKE (%termo%)
    v_search := '%' || unaccent(p_search_term) || '%';

    RETURN QUERY
    
    -- ========================================
    -- BUSCA EM PUBLICAÇÕES
    -- ========================================
    SELECT 
        p.id,
        p.title,
        'article'::TEXT as type,
        '/dashboard?tab=create&id=' || p.id::TEXT as slug,
        p.image_url as thumbnail_url,
        SUBSTRING(COALESCE(p.content, '') FROM 1 FOR 100) as snippet,
        1.0::REAL as rank
    FROM publications p
    WHERE p.status = 'published'
        AND (unaccent(COALESCE(p.title, '')) ILIKE v_search OR unaccent(COALESCE(p.content, '')) ILIKE v_search)

    UNION ALL

    -- ========================================
    -- BUSCA EM VÍDEOS
    -- ========================================
    SELECT 
        v.id,
        v.title,
        'video'::TEXT as type,
        '/dashboard?tab=stories&id=' || v.id::TEXT as slug,
        v.thumbnail_url,
        SUBSTRING(COALESCE(v.description, '') FROM 1 FOR 100) as snippet,
        1.0::REAL as rank
    FROM videos v
    WHERE v.status = 'published'
        AND (unaccent(COALESCE(v.title, '')) ILIKE v_search OR unaccent(COALESCE(v.description, '')) ILIKE v_search)

    UNION ALL

    -- ========================================
    -- BUSCA EM AGENDAMENTOS
    -- ========================================
    SELECT 
        s.id,
        s.title,
        'schedule'::TEXT as type,
        '/dashboard?tab=calendar&id=' || s.id::TEXT as slug,
        NULL::TEXT as thumbnail_url,
        SUBSTRING(COALESCE(s.description, '') FROM 1 FOR 100) as snippet,
        1.0::REAL as rank
    FROM schedules s
    WHERE (unaccent(COALESCE(s.title, '')) ILIKE v_search OR unaccent(COALESCE(s.description, '')) ILIKE v_search)

    UNION ALL

    -- ========================================
    -- BUSCA EM DOCUMENTOS / ARQUIVOS
    -- ========================================
    SELECT 
        d.id,
        d.name as title,
        'page'::TEXT as type,
        '/dashboard?tab=documents&id=' || d.id::TEXT as slug,
        NULL::TEXT as thumbnail_url,
        'Arquivo: ' || COALESCE(d.file_type, 'Desconhecido') as snippet,
        0.9::REAL as rank
    FROM documents d
    WHERE (unaccent(COALESCE(d.name, '')) ILIKE v_search)

    UNION ALL

    -- ========================================
    -- BUSCA EM MENSAGENS (CONVERSAS)
    -- ========================================
    SELECT 
        m.id,
        COALESCE(m.recipient_name, 'Mensagem') as title,
        'menu'::TEXT as type,
        '/dashboard?tab=messaging&id=' || m.id::TEXT as slug,
        m.media_url as thumbnail_url,
        SUBSTRING(COALESCE(m.content, '') FROM 1 FOR 100) as snippet,
        0.8::REAL as rank
    FROM messages m
    WHERE (unaccent(COALESCE(m.content, '')) ILIKE v_search OR unaccent(COALESCE(m.recipient_name, '')) ILIKE v_search)

    UNION ALL

    -- ========================================
    -- BUSCA EM TENDÊNCIAS (RADAR)
    -- ========================================
    SELECT 
        t.id,
        t.keyword as title,
        'action'::TEXT as type,
        '/dashboard?tab=analytics&subtab=trends&id=' || t.id::TEXT as slug,
        t.thumbnail_url,
        'Fonte: ' || COALESCE(t.source, 'Radar') || ' - Score: ' || COALESCE(t.score, 0)::TEXT as snippet,
        0.9::REAL as rank
    FROM trends t
    WHERE (unaccent(COALESCE(t.keyword, '')) ILIKE v_search OR unaccent(COALESCE(t.source, '')) ILIKE v_search)

    UNION ALL

    -- ========================================
    -- BUSCA EM STORIES E LIVES
    -- ========================================
    SELECT 
        sl.id,
        sl.title,
        'video'::TEXT as type,
        '/dashboard?tab=stories&id=' || sl.id::TEXT as slug,
        sl.thumbnail_url,
        SUBSTRING(COALESCE(sl.description, '') FROM 1 FOR 100) as snippet,
        1.0::REAL as rank
    FROM stories_lives sl
    WHERE (unaccent(COALESCE(sl.title, '')) ILIKE v_search OR unaccent(COALESCE(sl.description, '')) ILIKE v_search)

    LIMIT p_limit;

END;
$$;

-- Não criaremos índices pesados aqui para evitar timeout na Supabase
-- A função acima usará a busca de texto simples do Postgres (ILIKE).
