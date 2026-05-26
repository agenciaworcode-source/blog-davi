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
            // Usa o conteúdo mais completo disponível no feed
            const rawContent = (item as any).content || item.contentSnippet || item.title || ''

            const prompt = `${config.ai_prompt_prefix || 'Você é Luiz Felipe Michelin, consultor independente credenciado pela CVM.'}
Tom: ${config.ai_tone || 'Sofisticado, analítico e pragmático. Foco em impacto real para o investidor brasileiro.'}

Analise a notícia abaixo e escreva um artigo de blog CURTO, DIRETO e LEVE — máximo 5 parágrafos no total.
O leitor é o investidor brasileiro de varejo que quer entender rapidamente o que aconteceu e o que fazer.

Estruture o artigo cobrindo TODOS os tópicos abaixo, mas de forma CONDENSADA (cada tópico = 1 a 2 frases):
1. O que aconteceu e por que é relevante agora
2. Impacto macro: SELIC, inflação, câmbio ou PIB (só os que forem afetados)
3. Impacto nos investimentos: quais classes de ativos sobem, caem ou ficam em alerta
4. Leitura estratégica: o que a maioria não está vendo ainda
5. Conclusão: principal risco, principal oportunidade e o que observar daqui para frente

Use HTML semântico. Cada parágrafo regular = <p>...</p>. Títulos de seção = <h2>...</h2>.
NÃO use listas com bullet. NÃO repita informações. NÃO use linguagem genérica.
NUNCA corte uma frase no meio — sempre complete o pensamento.

Notícia: ${item.title}
Conteúdo: ${rawContent.slice(0, 1200)}

Responda APENAS em JSON válido:
{
  "excerpt": "resumo em 1 frase completa com no máximo 160 caracteres",
  "summary": ["<h2>O Fato</h2>", "<p>parágrafo 1 completo com o contexto claro, direto e sem rodeios da notícia (entre 60 e 90 palavras)...</p>", "<h2>Impacto nos Mercados</h2>", "<p>parágrafo 2 completo com a análise macroeconômica condensada e precisa dos impactos (entre 60 e 90 palavras)...</p>", "<h2>O que poucos percebem</h2>", "<p>parágrafo 3 completo com o impacto prático equilibrado no investidor brasileiro (entre 50 e 80 palavras)...</p>", "<h2>O que você deve observar</h2>", "<p>parágrafo 4 completo com as perspectivas e próximos passos diretos (entre 40 e 70 palavras)...</p>"],
  "opinion": "análise macroeconômica e estratégica extremamente profunda, detalhada e analítica escrita em primeira pessoa (como Luiz Felipe Michelin). Aplique rigorosamente TODAS as diretrizes de persona e estrutura detalhadas nas instruções de persona acima (incluindo Resumo e Contexto, Impactos Macroeconômicos detalhados sobre SELIC/inflação/PIB, Impactos nos Investimentos, Leitura Oculta de mercado, Cenários Futuros, Oportunidades e a Conclusão com principal risco e oportunidade). A opinião DEVE ser longa, rica, estruturada e de altíssima densidade analítica (entre 1500 e 4000 caracteres), dividida em múltiplos parágrafos ricos usando quebras de linha duplas (\\n\\n) para separar os parágrafos de forma elegante."
}`

            const resp = await openai.chat.completions.create({
              model: config.openai_model || 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
              max_tokens: 2500,
            })
            const parsed = JSON.parse(resp.choices[0].message.content || '{}')
            if (Array.isArray(parsed.summary) && parsed.summary.length > 0) summary = parsed.summary
            if (parsed.opinion) opinion = parsed.opinion
            // Usa o excerpt gerado pela IA (frase completa) ou fallback inteligente
            if (parsed.excerpt) {
              (item as any)._generatedExcerpt = parsed.excerpt
            }
          } catch (_) {}
        }

        // Excerpt: prioriza o gerado pela IA (frase completa), fallback no snippet sem corte brusco
        const excerptRaw = (item as any)._generatedExcerpt
          || item.contentSnippet?.slice(0, 200)
          || item.title

        // Garante que o excerpt não termine no meio de uma palavra
        let excerpt = excerptRaw
        if (excerptRaw.length > 200) {
          const lastSpace = excerptRaw.lastIndexOf(' ', 200)
          excerpt = lastSpace > 0
            ? excerptRaw.slice(0, lastSpace).trim() + '...'
            : excerptRaw.slice(0, 200).trim() + '...'
        }

        // Calcula reading_time baseado no conteúdo real (~200 palavras por minuto)
        const wordCount = summary.join(' ').replace(/<[^>]*>/g, '').split(/\s+/).length
        const minutes = Math.max(2, Math.ceil(wordCount / 200))
        const readingTime = `${minutes} min`

        await supabase.from('posts').insert([{
          title: item.title,
          slug,
          excerpt,
          category: 'Mercado',
          date: new Date().toISOString().split('T')[0],
          reading_time: readingTime,
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
  POST: async ({ request }: { request: Request }) => {
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

  GET: async (_ctx: { request: Request }) => {
    return new Response(
      JSON.stringify({ status: 'ok', endpoint: 'POST /api/sync', info: 'LFM RSS Sync' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  },
})
