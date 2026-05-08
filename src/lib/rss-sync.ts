/**
 * rss-sync.ts
 * Core RSS sync engine — shared between:
 *   - Manual trigger (admin panel button)
 *   - Cloudflare Cron Trigger (scheduled handler in server.ts)
 *   - API endpoint (POST /api/sync)
 */

import Parser from 'rss-parser'
import { OpenAI } from 'openai'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_RSS_FEEDS } from './rss-config'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSupabaseAdmin(): SupabaseClient {
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
    .replace(/^-|-$/g, '')
    .slice(0, 90)
}

function estimateReadingTime(paragraphs: string[]): string {
  const words = paragraphs.join(' ').split(/\s+/).length
  const minutes = Math.max(2, Math.ceil(words / 200))
  return `${minutes} min`
}

// ── AI Processing ─────────────────────────────────────────────────────────────

async function enrichWithAI(
  openai: OpenAI | null,
  config: Record<string, any>,
  item: Parser.Item,
  feedName: string,
): Promise<{ summary: string[]; opinion: string; category: string }> {
  const rawText = item.contentSnippet || item.content || item.title || ''

  const fallback = {
    summary: rawText
      ? rawText.match(/.{1,500}/gs)?.slice(0, 4) ?? [rawText.slice(0, 1500)]
      : ['Conteúdo disponível em breve.'],
    opinion: 'Análise disponível em breve.',
    category: inferCategory(item.title || '', rawText),
  }

  if (!openai || !rawText) return fallback

  try {
    const prompt = `
${config.ai_prompt_prefix || 'Você é Luiz Felipe Michelin, consultor independente credenciado pela CVM.'}
Tom de voz: ${config.ai_tone || 'Analítico, direto e pragmático.'}
Fonte da notícia: ${feedName}

NOTÍCIA:
Título: ${item.title}
Conteúdo: ${rawText.slice(0, 4000)}

TAREFA — responda SOMENTE em JSON válido, sem markdown:
{
  "summary": [
    "parágrafo 1 — contexto completo da notícia (mínimo 100 palavras)",
    "parágrafo 2 — análise macroeconômica aprofundada (mínimo 100 palavras)",
    "parágrafo 3 — impacto prático no investidor brasileiro (mínimo 80 palavras)",
    "parágrafo 4 — perspectivas e próximos passos (mínimo 60 palavras)"
  ],
  "opinion": "Opinião do Luiz em 1-2 frases impactantes, máximo 280 caracteres, na primeira pessoa.",
  "category": "uma das opções: Política Monetária | Câmbio | Bolsa | Renda Fixa | Fiscal | Internacional | Commodities | Mercado | Conjuntura"
}
`.trim()

    const response = await openai.chat.completions.create({
      model: config.openai_model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1800,
      temperature: 0.7,
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')

    return {
      summary: Array.isArray(parsed.summary) && parsed.summary.length > 0
        ? parsed.summary
        : fallback.summary,
      opinion: typeof parsed.opinion === 'string' && parsed.opinion.length > 10
        ? parsed.opinion
        : fallback.opinion,
      category: typeof parsed.category === 'string'
        ? parsed.category
        : fallback.category,
    }
  } catch (err: any) {
    console.error('[rss-sync] AI error:', err?.message)
    return fallback
  }
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

// ── Cover images por categoria ─────────────────────────────────────────────

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

function getCover(category: string): string {
  return CATEGORY_COVERS[category] || CATEGORY_COVERS['Mercado']
}

// ── Main sync function ────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean
  message: string
  created: number
  skipped: number
  errors: number
  items: string[]
  triggeredBy: string
  durationMs: number
}

export async function runRssSync(triggeredBy: 'manual' | 'cron' | 'api' = 'manual'): Promise<SyncResult> {
  const startTime = Date.now()
  console.log(`[rss-sync] Starting sync (${triggeredBy})`)

  // Validate env
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    const msg = `Supabase credentials missing. URL: ${!!supabaseUrl}, KEY: ${!!serviceKey}`
    console.error('[rss-sync]', msg)
    throw new Error(msg)
  }

  const supabase = getSupabaseAdmin()
  const parser = new Parser({ timeout: 15000 })

  const openaiKey = process.env.OPENAI_API_KEY
  const openai = openaiKey && openaiKey.startsWith('sk-')
    ? new OpenAI({ apiKey: openaiKey })
    : null

  if (!openai) console.log('[rss-sync] OpenAI not configured — skipping AI enrichment')

  // Load config from DB (graceful — não bloqueia se config não existir)
  const { data: config, error: configError } = await supabase.from('config').select('*').single()
  if (configError) console.warn('[rss-sync] Config not found:', configError.message)

  // Determine feeds: use DB config if set, otherwise use defaults
  let feedUrls: string[] = config?.rss_feeds?.filter(Boolean) || []
  let feedSources = DEFAULT_RSS_FEEDS

  if (feedUrls.length > 0) {
    feedSources = feedUrls.map((url: string) => ({
      url,
      name: DEFAULT_RSS_FEEDS.find(f => f.url === url)?.name || new URL(url).hostname,
    }))
  }

  // Limites configuráveis (novos campos em config)
  const maxPostsPerSync: number = config?.max_posts_per_sync ?? 10
  const postsPerFeed: number = config?.posts_per_feed ?? 6

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
        if (totalCreated >= maxPostsPerSync) break outer
        if (!item.title?.trim()) continue

        const slug = slugify(item.title)
        if (!slug) continue

        // Dedup check
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

        if (existing) {
          totalSkipped++
          continue
        }

        // AI enrichment
        const { summary, opinion, category } = await enrichWithAI(openai, config || {}, item, feed.name)

        const postPayload = {
          title: item.title.trim(),
          slug,
          excerpt: (item.contentSnippet || item.title).slice(0, 400).trim(),
          category,
          date: new Date().toISOString().split('T')[0],
          reading_time: estimateReadingTime(summary),
          source: {
            name: feed.name,
            url: item.link || feed.url,
          },
          cover: getCover(category),
          body: summary,
          opinion,
          published: config?.auto_publish ?? false,
          featured: false,
        }

        const { error: insertError } = await supabase.from('posts').insert([postPayload])

        if (!insertError) {
          totalCreated++
          createdTitles.push(item.title)
        } else {
          console.error(`[rss-sync] Insert error (${item.title}):`, insertError.message)
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

  // Log to DB (não-bloqueante — falha silenciosa se tabela não existir)
  try {
    await supabase.from('sync_logs').insert([{
      triggered_by: triggeredBy,
      posts_created: totalCreated,
      posts_skipped: totalSkipped,
      status: totalErrors > 0 && totalCreated === 0 ? 'error' : 'success',
      message: logMessage,
    }])
  } catch (logErr: any) {
    console.warn('[rss-sync] Log insert skipped:', logErr?.message)
  }

  return {
    success: true,
    message: totalCreated > 0
      ? `${totalCreated} novo(s) post(s) criado(s) em ${Math.round(durationMs / 1000)}s.`
      : `Nenhuma notícia nova. ${totalSkipped} já existentes.`,
    created: totalCreated,
    skipped: totalSkipped,
    errors: totalErrors,
    items: createdTitles,
    triggeredBy,
    durationMs,
  }
}
