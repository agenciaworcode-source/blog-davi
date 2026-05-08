/**
 * Supabase Edge Function: rss-sync
 * ─────────────────────────────────────────────────────────────────────────────
 * Dispara a sincronização de RSS + enriquecimento com IA.
 * Chamada automaticamente via pg_cron + pg_net nos horários configurados.
 * Também pode ser chamada manualmente via POST com Authorization: Bearer <CRON_SECRET>
 *
 * Variáveis de ambiente necessárias (Supabase > Project Settings > Edge Functions):
 *   SUPABASE_URL           — URL do projeto Supabase (injetada automaticamente)
 *   SUPABASE_SERVICE_ROLE_KEY — chave de admin (injetada automaticamente)
 *   OPENAI_API_KEY         — chave da OpenAI
 *   CRON_SECRET            — segredo para autenticar chamadas do pg_cron
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import Parser from 'npm:rss-parser@3'
import OpenAI from 'npm:openai@4'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncResult {
  success: boolean
  message: string
  created: number
  skipped: number
  errors: number
  items: string[]
  triggeredBy: string
  durationMs: number
}

interface FeedSource {
  url: string
  name: string
}

// ── Default feeds (fallback quando config estiver vazia) ──────────────────────

const DEFAULT_RSS_FEEDS: FeedSource[] = [
  { url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml', name: 'Agência Brasil — Economia' },
  { url: 'https://g1.globo.com/rss/g1/economia/', name: 'G1 Economia' },
  { url: 'https://www.infomoney.com.br/feed/', name: 'InfoMoney' },
  { url: 'https://exame.com/feed/', name: 'Exame' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
}

function estimateReadingTime(paragraphs: string[]): string {
  const words = paragraphs.join(' ').split(/\s+/).length
  const minutes = Math.max(2, Math.ceil(words / 200))
  return `${minutes} min`
}

function inferCategory(title: string, content: string): string {
  const text = (title + ' ' + content).toLowerCase()
  if (/selic|copom|juro|taxa de juros|banco central/.test(text)) return 'Política Monetária'
  if (/dólar|câmbio|real|moeda|brl/.test(text)) return 'Câmbio'
  if (/ibovespa|bolsa|ação|ações|b3/.test(text)) return 'Bolsa'
  if (/tesouro|cdi|lci|lca|debênture|renda fixa/.test(text)) return 'Renda Fixa'
  if (/déficit|superávit|orçamento|fiscal|governo|lula|ministério/.test(text)) return 'Fiscal'
  if (/fed|eua|china|europa|global|mundial|exterior/.test(text)) return 'Internacional'
  if (/petróleo|soja|milho|minério|commodity|commodities/.test(text)) return 'Commodities'
  if (/pib|inflação|ipca|igp|desemprego|emprego/.test(text)) return 'Conjuntura'
  return 'Mercado'
}

const CATEGORY_COVERS: Record<string, string> = {
  'Política Monetária': 'https://images.unsplash.com/photo-1607863680198-23d4b2565df0?auto=format&fit=crop&w=1600&q=80',
  'Câmbio':            'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=1600&q=80',
  'Bolsa':             'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80',
  'Renda Fixa':        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80',
  'Fiscal':            'https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?auto=format&fit=crop&w=1600&q=80',
  'Internacional':     'https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=1600&q=80',
  'Commodities':       'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=1600&q=80',
  'Conjuntura':        'https://images.unsplash.com/photo-1543286386-2e659306cd6c?auto=format&fit=crop&w=1600&q=80',
  'Mercado':           'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80',
}

// ── AI Enrichment ─────────────────────────────────────────────────────────────

async function enrichWithAI(
  openai: OpenAI | null,
  config: Record<string, any>,
  item: any,
  feedName: string,
): Promise<{ summary: string[]; opinion: string; category: string }> {
  const rawText = item.contentSnippet || item.content || item.title || ''
  const fallback = {
    summary: [rawText.slice(0, 600)].filter(Boolean),
    opinion: 'Análise disponível em breve.',
    category: inferCategory(item.title || '', rawText),
  }
  if (!openai || !rawText) return fallback

  try {
    const prompt = `
${config.ai_prompt_prefix || 'Você é Luiz Felipe Michelin, consultor independente credenciado pela CVM.'}
Tom de voz: ${config.ai_tone || 'Analítico, direto e pragmático.'}
Fonte: ${feedName}

NOTÍCIA:
Título: ${item.title}
Conteúdo: ${rawText.slice(0, 1500)}

TAREFA — responda SOMENTE em JSON válido, sem markdown:
{
  "summary": ["parágrafo 1 (contexto)", "parágrafo 2 (análise macro)", "parágrafo 3 (impacto no investidor)"],
  "opinion": "Opinião em 1-2 frases, máx 250 chars, primeira pessoa.",
  "category": "uma de: Política Monetária | Câmbio | Bolsa | Renda Fixa | Fiscal | Internacional | Commodities | Mercado | Conjuntura"
}`.trim()

    const response = await openai.chat.completions.create({
      model: config.openai_model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 700,
      temperature: 0.7,
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')
    return {
      summary: Array.isArray(parsed.summary) && parsed.summary.length > 0
        ? parsed.summary : fallback.summary,
      opinion: typeof parsed.opinion === 'string' && parsed.opinion.length > 10
        ? parsed.opinion : fallback.opinion,
      category: typeof parsed.category === 'string' ? parsed.category : fallback.category,
    }
  } catch (err: any) {
    console.error('[rss-sync] AI error:', err?.message)
    return fallback
  }
}

// ── Main sync function ────────────────────────────────────────────────────────

async function runRssSync(triggeredBy: string): Promise<SyncResult> {
  const startTime = Date.now()
  console.log(`[rss-sync] Starting sync (${triggeredBy})`)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase credentials missing')

  const supabase = createClient(supabaseUrl, serviceKey)
  const parser = new Parser({ timeout: 15000 })

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const openai = openaiKey && openaiKey.startsWith('sk-')
    ? new OpenAI({ apiKey: openaiKey })
    : null

  if (!openai) console.log('[rss-sync] OpenAI not configured — skipping AI enrichment')

  const { data: config, error: configError } = await supabase.from('config').select('*').single()
  if (configError) console.warn('[rss-sync] Config not found:', configError.message)

  // Limite de posts por ciclo (configurável, padrão 10)
  const maxPostsPerSync: number = config?.max_posts_per_sync ?? 10
  const postsPerFeed: number = config?.posts_per_feed ?? 6

  // Feeds: usa config do DB ou defaults
  const feedUrls: string[] = config?.rss_feeds?.filter(Boolean) || []
  const feedSources: FeedSource[] = feedUrls.length > 0
    ? feedUrls.map((url: string) => ({
        url,
        name: DEFAULT_RSS_FEEDS.find(f => f.url === url)?.name || new URL(url).hostname,
      }))
    : DEFAULT_RSS_FEEDS

  let totalCreated = 0
  let totalSkipped = 0
  let totalErrors = 0
  const createdTitles: string[] = []

  outer:
  for (const feed of feedSources) {
    try {
      console.log(`[rss-sync] Fetching: ${feed.name}`)
      const parsed = await parser.parseURL(feed.url)
      const items = parsed.items.slice(0, postsPerFeed)

      for (const item of items) {
        // Respeita o limite total por ciclo
        if (totalCreated >= maxPostsPerSync) break outer

        if (!item.title?.trim()) continue
        const slug = slugify(item.title)
        if (!slug) continue

        const { data: existing } = await supabase
          .from('posts').select('id').eq('slug', slug).maybeSingle()

        if (existing) { totalSkipped++; continue }

        const { summary, opinion, category } = await enrichWithAI(openai, config || {}, item, feed.name)

        const { error: insertError } = await supabase.from('posts').insert([{
          title: item.title.trim(),
          slug,
          excerpt: (item.contentSnippet || item.title).slice(0, 200).trim(),
          category,
          date: new Date().toISOString().split('T')[0],
          reading_time: estimateReadingTime(summary),
          source: { name: feed.name, url: item.link || feed.url },
          cover: CATEGORY_COVERS[category] || CATEGORY_COVERS['Mercado'],
          body: summary,
          opinion,
          published: config?.auto_publish ?? false,
          featured: false,
        }])

        if (!insertError) {
          totalCreated++
          createdTitles.push(item.title)
        } else {
          console.error(`[rss-sync] Insert error:`, insertError.message)
          totalErrors++
        }
      }
    } catch (feedError: any) {
      console.error(`[rss-sync] Feed error (${feed.name}):`, feedError.message)
      totalErrors++
    }
  }

  const durationMs = Date.now() - startTime
  const logMessage = `${totalCreated} criados | ${totalSkipped} duplicados | ${totalErrors} erros | ${durationMs}ms`
  console.log(`[rss-sync] Done (${triggeredBy}): ${logMessage}`)

  try {
    await supabase.from('sync_logs').insert([{
      triggered_by: triggeredBy,
      posts_created: totalCreated,
      posts_skipped: totalSkipped,
      status: totalErrors > 0 && totalCreated === 0 ? 'error' : 'success',
      message: logMessage,
    }])
  } catch (_) { /* log silently */ }

  return {
    success: true,
    message: totalCreated > 0
      ? `${totalCreated} novo(s) post(s) em ${Math.round(durationMs / 1000)}s.`
      : `Nenhuma notícia nova. ${totalSkipped} já existentes.`,
    created: totalCreated,
    skipped: totalSkipped,
    errors: totalErrors,
    items: createdTitles,
    triggeredBy,
    durationMs,
  }
}

// ── HTTP Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
    })
  }

  // Auth check
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('Authorization') || ''
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'ok', info: 'POST /functions/v1/rss-sync' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const triggeredBy = body?.triggered_by || 'cron'
    const result = await runRssSync(triggeredBy)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
