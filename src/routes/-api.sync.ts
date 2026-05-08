import { createAPIFileRoute } from '@tanstack/react-start/api'
import Parser from 'rss-parser'
import { OpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'

// ── This endpoint can be called by external cron services ──────────────────
// Cloudflare Workers Cron, GitHub Actions, cron-job.org, etc.
//
// POST /api/sync
// Header: Authorization: Bearer <CRON_SECRET>
//
// Set CRON_SECRET in your .env to protect this endpoint.
// ──────────────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials missing')
  return createClient(url, key)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

async function runSync(triggeredBy: string) {
  const supabase = getSupabaseAdmin()
  const parser = new Parser()

  const openaiKey = process.env.OPENAI_API_KEY
  const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null

  const { data: config } = await supabase.from('config').select('*').single()
  if (!config) return { success: false, message: 'Config not found', created: 0 }

  const feeds: string[] = config.rss_feeds || []
  if (feeds.length === 0) return { success: false, message: 'No RSS feeds configured', created: 0 }

  let totalCreated = 0
  let totalSkipped = 0

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl)
      const items = feed.items.slice(0, 8)

      for (const item of items) {
        if (!item.title) continue
        const slug = slugify(item.title)

        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

        if (existing) { totalSkipped++; continue }

        let summary = [item.contentSnippet || item.title]
        let opinion = 'Análise em processamento...'

        if (openai) {
          try {
            const prompt = `
${config.ai_prompt_prefix || 'Você é Luiz Felipe Michelin, consultor CVM.'}
Tom: ${config.ai_tone || 'Analítico e pragmático.'}
Notícia: ${item.title}
Conteúdo: ${item.contentSnippet || ''}
Responda em JSON: { "summary": ["p1","p2","p3"], "opinion": "texto" }
`
            const resp = await openai.chat.completions.create({
              model: config.openai_model || 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
              max_tokens: 800,
            })
            const parsed = JSON.parse(resp.choices[0].message.content || '{}')
            if (Array.isArray(parsed.summary)) summary = parsed.summary
            if (parsed.opinion) opinion = parsed.opinion
          } catch (_) {}
        }

        await supabase.from('posts').insert([{
          title: item.title,
          slug,
          excerpt: item.contentSnippet?.slice(0, 180) || item.title,
          category: 'Mercado',
          date: new Date().toISOString().split('T')[0],
          reading_time: '4 min',
          source: { name: feed.title || 'RSS', url: item.link || feedUrl },
          cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80',
          body: summary,
          opinion,
          published: config.auto_publish ?? false,
          featured: false,
        }])

        totalCreated++
      }
    } catch (e: any) {
      console.error(`[cron] Feed error (${feedUrl}):`, e.message)
    }
  }

  await supabase.from('sync_logs').insert([{
    triggered_by: triggeredBy,
    posts_created: totalCreated,
    posts_skipped: totalSkipped,
    status: 'success',
    message: `${totalCreated} criados, ${totalSkipped} ignorados`,
  }])

  return { success: true, created: totalCreated, skipped: totalSkipped }
}

export const APIRoute = createAPIFileRoute('/api/sync')({
  POST: async ({ request }) => {
    // Auth check
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const auth = request.headers.get('Authorization') || ''
      if (auth !== `Bearer ${cronSecret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    try {
      const result = await runSync('cron')
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },

  GET: async ({ request }) => {
    return new Response(
      JSON.stringify({ status: 'ok', endpoint: 'POST /api/sync', info: 'LFM RSS Sync' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  },
})
