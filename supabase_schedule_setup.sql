-- =====================================================================
-- LFM Economy Insight — Supabase Schedule Setup
-- Agendamento via pg_cron + pg_net (sem Cloudflare)
-- =====================================================================
-- PASSO 1: Ative as extensões no Supabase Dashboard
--   Database > Extensions > habilitar: pg_cron e pg_net
-- =====================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================================
-- Novas colunas na tabela config
-- =====================================================================
ALTER TABLE config ADD COLUMN IF NOT EXISTS sync_enabled       BOOLEAN  DEFAULT true;
ALTER TABLE config ADD COLUMN IF NOT EXISTS sync_times_brt     TEXT[]   DEFAULT ARRAY['07:00', '12:00', '18:00'];
ALTER TABLE config ADD COLUMN IF NOT EXISTS max_posts_per_sync INTEGER  DEFAULT 10;
ALTER TABLE config ADD COLUMN IF NOT EXISTS posts_per_feed     INTEGER  DEFAULT 6;

-- Atualiza linha existente com os novos valores padrão
UPDATE config SET
  sync_enabled       = COALESCE(sync_enabled, true),
  sync_times_brt     = COALESCE(sync_times_brt, ARRAY['07:00', '12:00', '18:00']),
  max_posts_per_sync = COALESCE(max_posts_per_sync, 10),
  posts_per_feed     = COALESCE(posts_per_feed, 6)
WHERE sync_enabled IS NULL OR sync_times_brt IS NULL;

-- =====================================================================
-- Função: reschedule_lfm_sync
-- Chamada pelo painel admin ao salvar a configuração de automação.
-- Remove jobs antigos e cria novos com os horários configurados.
-- =====================================================================
CREATE OR REPLACE FUNCTION reschedule_lfm_sync(
  p_times_brt   TEXT[],
  p_enabled     BOOLEAN,
  p_edge_url    TEXT,
  p_cron_secret TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_time      TEXT;
  v_parts     TEXT[];
  v_hour_brt  INTEGER;
  v_hour_utc  INTEGER;
  v_min       INTEGER;
  v_cron_expr TEXT;
  v_job_name  TEXT;
  v_idx       INTEGER := 1;
  v_result    TEXT := '';
  v_headers   TEXT;
BEGIN
  -- Remove todos os jobs de sync existentes
  FOR v_job_name IN
    SELECT jobname FROM cron.job WHERE jobname LIKE 'lfm-sync-%'
  LOOP
    PERFORM cron.unschedule(v_job_name);
  END LOOP;

  IF NOT p_enabled THEN
    RETURN 'Automação desativada — todos os jobs removidos.';
  END IF;

  IF p_times_brt IS NULL OR array_length(p_times_brt, 1) = 0 THEN
    RETURN 'Nenhum horário configurado — jobs não criados.';
  END IF;

  v_headers := json_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer ' || p_cron_secret
  )::text;

  -- Cria um job para cada horário
  FOREACH v_time IN ARRAY p_times_brt LOOP
    v_parts    := string_to_array(trim(v_time), ':');
    v_hour_brt := v_parts[1]::INTEGER;
    v_min      := COALESCE(v_parts[2]::INTEGER, 0);

    -- Converte BRT (UTC-3) → UTC
    v_hour_utc  := (v_hour_brt + 3) % 24;
    v_cron_expr := v_min || ' ' || v_hour_utc || ' * * *';
    v_job_name  := 'lfm-sync-' || v_idx;

    PERFORM cron.schedule(
      v_job_name,
      v_cron_expr,
      format(
        $sql$SELECT net.http_post(
          url     := %L,
          headers := %L::jsonb,
          body    := '{"triggered_by":"cron"}'::jsonb
        ) AS req_id$sql$,
        p_edge_url,
        v_headers
      )
    );

    v_result := v_result
      || v_job_name
      || ' → '  || v_time || ' BRT'
      || ' ('   || lpad(v_hour_utc::text, 2, '0') || ':' || lpad(v_min::text, 2, '0') || ' UTC)'
      || ' [cron: ' || v_cron_expr || ']'
      || E'\n';

    v_idx := v_idx + 1;
  END LOOP;

  RETURN 'Jobs agendados com sucesso:' || E'\n' || v_result;
END;
$$;

-- =====================================================================
-- Função: get_lfm_sync_jobs
-- Retorna os jobs de sync ativos para exibição no painel admin.
-- Usa apenas colunas garantidas em todas as versões do pg_cron Supabase.
-- =====================================================================
CREATE OR REPLACE FUNCTION get_lfm_sync_jobs()
RETURNS TABLE(jobname TEXT, schedule TEXT, active BOOLEAN, last_run TIMESTAMPTZ, next_run TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::TEXT,
    j.schedule::TEXT,
    j.active,
    r.start_time AS last_run,
    NULL::TIMESTAMPTZ AS next_run
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT start_time
    FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY d.start_time DESC
    LIMIT 1
  ) r ON true
  WHERE j.jobname LIKE 'lfm-sync-%'
  ORDER BY j.jobname;

  -- Fallback: se job_run_details não existir, retorna sem last_run
  EXCEPTION WHEN undefined_table THEN
    RETURN QUERY
    SELECT
      j.jobname::TEXT,
      j.schedule::TEXT,
      j.active,
      NULL::TIMESTAMPTZ AS last_run,
      NULL::TIMESTAMPTZ AS next_run
    FROM cron.job j
    WHERE j.jobname LIKE 'lfm-sync-%'
    ORDER BY j.jobname;
END;
$$;

-- =====================================================================
-- RLS: permitir que usuários autenticados chamem as funções via RPC
-- =====================================================================
GRANT EXECUTE ON FUNCTION reschedule_lfm_sync(TEXT[], BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lfm_sync_jobs() TO authenticated;

-- =====================================================================
-- INSTRUÇÕES DE DEPLOY
-- =====================================================================
-- 1. Deploy da Edge Function:
--    supabase functions deploy rss-sync --no-verify-jwt
--
-- 2. Setar variáveis na Edge Function:
--    supabase secrets set OPENAI_API_KEY=sk-...
--    supabase secrets set CRON_SECRET=sua-senha-segura
--
-- 3. Rodar este SQL no Supabase > SQL Editor
--
-- 4. No painel admin (/admin/settings), clique em "Aplicar Horários"
--    para criar os primeiros jobs pg_cron.
--
-- URL da Edge Function:
--   https://<seu-projeto>.supabase.co/functions/v1/rss-sync
-- =====================================================================
