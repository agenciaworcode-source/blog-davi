import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials missing')
  return createClient(url, key)
}

// ── Manual RSS Sync ───────────────────────────────────────────────────────────

export const syncNewsAction = createServerFn({ method: 'POST' }).handler(async () => {
  const { runRssSync } = await import('./rss-sync')
  return await runRssSync('manual')
})

// ── Publicar todos os rascunhos ───────────────────────────────────────────────

export const publishPendingAction = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('posts')
    .update({ published: true })
    .eq('published', false)
    .select('id, title')

  if (error) return { success: false, message: error.message }
  return {
    success: true,
    message: `${data?.length ?? 0} post(s) publicado(s).`,
    count: data?.length ?? 0,
  }
})

// ── Stats do dashboard ────────────────────────────────────────────────────────

export const getDashboardStatsAction = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseAdmin()

  const [postsTotal, postsPublished, postsPending, subscribers, lastSync] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', false),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
    supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  return {
    total:       postsTotal.count     ?? 0,
    published:   postsPublished.count ?? 0,
    pending:     postsPending.count   ?? 0,
    subscribers: subscribers.count    ?? 0,
    lastSync:    lastSync.data        ?? null,
  }
})

// ── Aplicar horários de automação via pg_cron ─────────────────────────────────

// Lê sync_times_brt e sync_enabled do DB (salvo previamente) e aplica no pg_cron
export const updateScheduleAction = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseAdmin()
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const cronSecret = process.env.CRON_SECRET || ''
  const edgeUrl = `${supabaseUrl}/functions/v1/rss-sync`

  const { data: config, error: configErr } = await supabase
    .from('config')
    .select('sync_times_brt, sync_enabled')
    .single()

  if (configErr) return { success: false, message: configErr.message }

  const { data: result, error } = await supabase.rpc('reschedule_lfm_sync', {
    p_times_brt:   config.sync_times_brt  || ['07:00', '12:00', '18:00'],
    p_enabled:     config.sync_enabled    ?? true,
    p_edge_url:    edgeUrl,
    p_cron_secret: cronSecret,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: result as string }
})

// ── Buscar posts publicados ───────────────────────────────────────────────────

export const getPublishedPostsAction = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('posts')
    .select('slug, title, excerpt, category, date, reading_time, source, cover, opinion, body, featured, published')
    .eq('published', true)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
})

// ── Buscar post por slug + relacionados ───────────────────────────────────────

export const getPostBySlugAction = createServerFn({ method: 'POST' }).handler(
  async ({ data: slug }: { data: string }) => {
    const supabase = getSupabaseAdmin()

    const [{ data: post, error }, { data: related }] = await Promise.all([
      supabase
        .from('posts')
        .select('slug, title, excerpt, category, date, reading_time, source, cover, opinion, body, featured, published')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle(),
      supabase
        .from('posts')
        .select('slug, title, excerpt, category, date, reading_time, source, cover, opinion, body, featured')
        .eq('published', true)
        .neq('slug', slug)
        .order('date', { ascending: false })
        .limit(3),
    ])

    if (error) throw new Error(error.message)
    return { post: post ?? null, related: related ?? [] }
  }
)

// ── Newsletter: inscrever ─────────────────────────────────────────────────────

export const subscribeAction = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { email: string; name?: string } }) => {
    const { email, name } = data
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'E-mail inválido.' }
    }

    const supabase = getSupabaseAdmin()

    // Verifica se já existe
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, active')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.active) return { success: false, message: 'Este e-mail já está inscrito.' }
      // Reativa inscrito que havia cancelado
      await supabase.from('subscribers').update({ active: true, name: name || null }).eq('id', existing.id)
      return { success: true, message: 'Inscrição reativada com sucesso!' }
    }

    const { data: inserted, error } = await supabase
      .from('subscribers')
      .insert([{ email, name: name || null, active: true }])
      .select('id')
      .single()

    if (error) return { success: false, message: 'Erro ao salvar inscrição.' }

    // Envia e-mail de boas-vindas
    try {
      const { sendEmail } = await import('./email')
      const { welcomeEmail } = await import('./email-templates')
      const token = Buffer.from(inserted.id).toString('base64url')
      const { subject, html } = welcomeEmail(email, token)
      await sendEmail({ to: email, subject, html })
    } catch (e: any) {
      console.error('[newsletter] Erro ao enviar boas-vindas:', e?.message)
      // Não bloqueia a inscrição se o e-mail falhar
    }

    return { success: true, message: 'Inscrição realizada! Verifique seu e-mail.' }
  }
)

// ── Newsletter: desinscrever ──────────────────────────────────────────────────

export const unsubscribeAction = createServerFn({ method: 'POST' }).handler(
  async ({ data: token }: { data: string }) => {
    let id: string
    try {
      id = Buffer.from(token, 'base64url').toString('utf-8')
    } catch {
      return { success: false, message: 'Link inválido.' }
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('subscribers')
      .update({ active: false })
      .eq('id', id)

    if (error) return { success: false, message: 'Erro ao processar solicitação.' }
    return { success: true, message: 'Inscrição cancelada com sucesso.' }
  }
)

// ── Newsletter: stats dos inscritos ──────────────────────────────────────────

export const getSubscriberStatsAction = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseAdmin()
  const [total, active] = await Promise.all([
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('active', true),
  ])
  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    inactive: (total.count ?? 0) - (active.count ?? 0),
  }
})

// ── Newsletter: toggle ativo/inativo ─────────────────────────────────────────

export const toggleSubscriberAction = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string; active: boolean } }) => {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('subscribers')
      .update({ active: data.active })
      .eq('id', data.id)
    if (error) return { success: false, message: error.message }
    return { success: true }
  }
)

// ── Newsletter: enviar digest ─────────────────────────────────────────────────

export const sendNewsletterAction = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { subject: string; editorial: string; postSlugs: string[] } }) => {
    const supabase = getSupabaseAdmin()

    // Busca posts selecionados
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('title, slug, category, excerpt, opinion, reading_time')
      .in('slug', data.postSlugs)
      .eq('published', true)

    if (postsErr || !posts?.length) return { success: false, message: 'Nenhum post encontrado.' }

    // Busca inscritos ativos com seus IDs (para gerar tokens de descadastro)
    const { data: subscribers, error: subErr } = await supabase
      .from('subscribers')
      .select('id, email')
      .eq('active', true)

    if (subErr || !subscribers?.length) return { success: false, message: 'Nenhum inscrito ativo.' }

    const recipients = subscribers.map((s) => ({
      email: s.email,
      token: Buffer.from(s.id).toString('base64url'),
    }))

    try {
      const { sendBatch } = await import('./email')
      const { newsletterDigest } = await import('./email-templates')
      const sent = await sendBatch(recipients, (token) =>
        newsletterDigest(posts, data.subject, data.editorial, token)
      )
      return { success: true, message: `Newsletter enviada para ${sent} inscritos.`, sent }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erro ao enviar.' }
    }
  }
)

// ── Buscar status dos jobs pg_cron ────────────────────────────────────────────

export interface CronJob {
  jobname: string
  schedule: string
  active: boolean
  last_run: string | null
  next_run: string | null
}

export const getScheduleStatusAction = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('get_lfm_sync_jobs')
  if (error) return { jobs: [] as CronJob[], error: error.message }
  return { jobs: (data || []) as CronJob[], error: null }
})
