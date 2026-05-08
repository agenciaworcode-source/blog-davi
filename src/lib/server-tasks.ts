import { createServerFn } from '@tanstack/react-start'

// ── Supabase REST client (sem SDK — evita ERR_MODULE_NOT_FOUND no Vite SSR runner) ──

function db() {
  const base = `${process.env.VITE_SUPABASE_URL}/rest/v1`
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const h    = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

  return {
    async get(path: string, extra: Record<string, string> = {}) {
      const res = await fetch(`${base}/${path}`, { headers: { ...h, ...extra } })
      return res.ok ? res.json() : null
    },
    async post(path: string, body: unknown, extra: Record<string, string> = {}) {
      const res = await fetch(`${base}/${path}`, {
        method: 'POST',
        headers: { ...h, Prefer: 'return=representation', ...extra },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      return { data: res.ok ? data : null, error: res.ok ? null : data }
    },
    async patch(path: string, body: unknown) {
      const res = await fetch(`${base}/${path}`, {
        method: 'PATCH',
        headers: { ...h, Prefer: 'return=representation' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      return { data: res.ok ? data : null, error: res.ok ? null : data }
    },
    async delete(path: string) {
      const res = await fetch(`${base}/${path}`, { method: 'DELETE', headers: h })
      return res.ok
    },
    async count(path: string): Promise<number> {
      const res = await fetch(`${base}/${path}`, { method: 'HEAD', headers: { ...h, Prefer: 'count=exact' } })
      const range = res.headers.get('Content-Range') || '*/0'
      return parseInt(range.split('/')[1] ?? '0') || 0
    },
    async rpc(fn: string, body: unknown) {
      const res = await fetch(`${base}/rpc/${fn}`, {
        method: 'POST', headers: h, body: JSON.stringify(body),
      })
      const data = await res.json()
      return { data: res.ok ? data : null, error: res.ok ? null : { message: String(data) } }
    },
  }
}

// ── Manual RSS Sync ───────────────────────────────────────────────────────────

export const syncNewsAction = createServerFn({ method: 'POST' }).handler(async () => {
  const { runRssSync } = await import('./rss-sync')
  return await runRssSync('manual')
})

// ── Publicar todos os rascunhos ───────────────────────────────────────────────

export const publishPendingAction = createServerFn({ method: 'POST' }).handler(async () => {
  const { data, error } = await db().patch('posts?published=eq.false', { published: true })
  if (error) return { success: false, message: String(error) }
  return { success: true, message: `${data?.length ?? 0} post(s) publicado(s).`, count: data?.length ?? 0 }
})

// ── Stats do dashboard ────────────────────────────────────────────────────────

export const getDashboardStatsAction = createServerFn({ method: 'GET' }).handler(async () => {
  const client = db()
  const [total, published, pending, subscribers, lastSyncArr] = await Promise.all([
    client.count('posts?select=*'),
    client.count('posts?select=*&published=eq.true'),
    client.count('posts?select=*&published=eq.false'),
    client.count('subscribers?select=*'),
    client.get('sync_logs?select=*&order=created_at.desc&limit=1'),
  ])
  return {
    total,
    published,
    pending,
    subscribers,
    lastSync: Array.isArray(lastSyncArr) ? lastSyncArr[0] ?? null : null,
  }
})

// ── Aplicar horários de automação via pg_cron ─────────────────────────────────

export const updateScheduleAction = createServerFn({ method: 'POST' }).handler(async () => {
  const client = db()
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const cronSecret  = process.env.CRON_SECRET || ''

  const configArr = await client.get('config?select=sync_times_brt,sync_enabled&limit=1')
  const config = Array.isArray(configArr) ? configArr[0] : null
  if (!config) return { success: false, message: 'Config não encontrada.' }

  const { data: result, error } = await client.rpc('reschedule_lfm_sync', {
    p_times_brt:   config.sync_times_brt  || ['07:00', '12:00', '18:00'],
    p_enabled:     config.sync_enabled    ?? true,
    p_edge_url:    `${supabaseUrl}/functions/v1/rss-sync`,
    p_cron_secret: cronSecret,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: result as string }
})

// ── Buscar status dos jobs pg_cron ────────────────────────────────────────────

export interface CronJob {
  jobname: string
  schedule: string
  active: boolean
  last_run: string | null
  next_run: string | null
}

export const getScheduleStatusAction = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await db().rpc('get_lfm_sync_jobs', {})
  if (error) return { jobs: [] as CronJob[], error: error.message }
  return { jobs: (data || []) as CronJob[], error: null }
})

// ── Newsletter: inscrever ─────────────────────────────────────────────────────

export const subscribeAction = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { email: string; name?: string } }) => {
    const { email, name } = data
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'E-mail inválido.' }
    }

    const client = db()
    const existingArr = await client.get(`subscribers?select=id,active&email=eq.${encodeURIComponent(email)}&limit=1`)
    const existing = Array.isArray(existingArr) ? existingArr[0] : null

    if (existing) {
      if (existing.active) return { success: false, message: 'Este e-mail já está inscrito.' }
      await client.patch(`subscribers?id=eq.${existing.id}`, { active: true, name: name || null })
      return { success: true, message: 'Inscrição reativada com sucesso!' }
    }

    const { data: inserted, error } = await client.post('subscribers', { email, name: name || null, active: true })
    if (error || !inserted?.[0]) return { success: false, message: 'Erro ao salvar inscrição.' }

    try {
      const { sendEmail }    = await import('./email')
      const { welcomeEmail } = await import('./email-templates')
      const token = Buffer.from(inserted[0].id).toString('base64url')
      const { subject, html } = welcomeEmail(email, token)
      await sendEmail({ to: email, subject, html })
    } catch (e: any) {
      console.error('[newsletter] Erro ao enviar boas-vindas:', e?.message)
    }

    return { success: true, message: 'Inscrição realizada! Verifique seu e-mail.' }
  }
)

// ── Newsletter: desinscrever ──────────────────────────────────────────────────

export const unsubscribeAction = createServerFn({ method: 'POST' }).handler(
  async ({ data: token }: { data: string }) => {
    let id: string
    try { id = Buffer.from(token, 'base64url').toString('utf-8') }
    catch { return { success: false, message: 'Link inválido.' } }

    const { error } = await db().patch(`subscribers?id=eq.${id}`, { active: false })
    if (error) return { success: false, message: 'Erro ao processar solicitação.' }
    return { success: true, message: 'Inscrição cancelada com sucesso.' }
  }
)

// ── Newsletter: stats ─────────────────────────────────────────────────────────

export const getSubscriberStatsAction = createServerFn({ method: 'GET' }).handler(async () => {
  const client = db()
  const [total, active] = await Promise.all([
    client.count('subscribers?select=*'),
    client.count('subscribers?select=*&active=eq.true'),
  ])
  return { total, active, inactive: total - active }
})

// ── Newsletter: toggle ativo/inativo ─────────────────────────────────────────

export const toggleSubscriberAction = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string; active: boolean } }) => {
    const { error } = await db().patch(`subscribers?id=eq.${data.id}`, { active: data.active })
    if (error) return { success: false, message: String(error) }
    return { success: true }
  }
)

// ── Newsletter: enviar digest ─────────────────────────────────────────────────

export const sendNewsletterAction = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { subject: string; editorial: string; postSlugs: string[] } }) => {
    const client = db()

    const slugFilter = data.postSlugs.map(s => `slug=eq.${encodeURIComponent(s)}`).join('&')
    const [postsArr, subscribersArr] = await Promise.all([
      client.get(`posts?select=title,slug,category,excerpt,opinion,reading_time&published=eq.true&or=(${data.postSlugs.map(s => `slug.eq.${s}`).join(',')})`),
      client.get('subscribers?select=id,email&active=eq.true'),
    ])

    const posts = Array.isArray(postsArr) ? postsArr : []
    const subscribers = Array.isArray(subscribersArr) ? subscribersArr : []

    if (!posts.length)       return { success: false, message: 'Nenhum post encontrado.' }
    if (!subscribers.length) return { success: false, message: 'Nenhum inscrito ativo.' }

    const recipients = subscribers.map((s: any) => ({
      email: s.email,
      token: Buffer.from(s.id).toString('base64url'),
    }))

    try {
      const { sendBatch }         = await import('./email')
      const { newsletterDigest }  = await import('./email-templates')
      const sent = await sendBatch(recipients, (token) =>
        newsletterDigest(posts, data.subject, data.editorial, token)
      )
      return { success: true, message: `Newsletter enviada para ${sent} inscritos.`, sent }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erro ao enviar.' }
    }
  }
)
