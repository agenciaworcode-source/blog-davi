import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_RSS_FEEDS } from '@/lib/rss-config'
import {
  updateScheduleAction,
  getScheduleStatusAction,
  type CronJob,
} from '@/lib/server-tasks'
import { resetSiteConfigCache } from '@/lib/site-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Save,
  Settings2,
  Sparkles,
  Rss,
  Bell,
  Plus,
  X,
  Key,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Hash,
  Share2,
} from 'lucide-react'

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
})

const DEFAULT_CONFIG = {
  ai_tone:
    'Sofisticado, analítico e pragmático. Foco em impacto real para o investidor de varejo brasileiro.',
  ai_prompt_prefix:
    'Você é Luiz Felipe Michelin, consultor independente credenciado pela CVM. Sua análise deve ser direta, sem jargão excessivo, conectando a macroeconomia à carteira do investidor comum.',
  rss_feeds: [] as string[],
  auto_publish: false,
  newsletter_active: true,
  openai_model: 'gpt-4o-mini',
  // Automação customizável
  sync_enabled: true,
  sync_times_brt: ['07:00', '12:00', '18:00'] as string[],
  max_posts_per_sync: 10,
  posts_per_feed: 6,
  // Redes sociais
  social_links: {
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
  } as Record<string, string>,
}

// Horários predefinidos sugeridos
const PRESET_SCHEDULES = [
  { label: '3× ao dia (padrão)', times: ['07:00', '12:00', '18:00'] },
  { label: '2× ao dia', times: ['08:00', '17:00'] },
  { label: '1× ao dia (manhã)', times: ['07:30'] },
  { label: '1× ao dia (noite)', times: ['20:00'] },
  { label: '4× ao dia', times: ['07:00', '10:00', '14:00', '18:00'] },
]

function formatBrtToUtc(timeBrt: string): string {
  const [h, m] = timeBrt.split(':').map(Number)
  const utcH = (h + 3) % 24
  return `${String(utcH).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} UTC`
}

function formatNextRun(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
}

function AdminSettings() {
  const [loading, setLoading] = useState(false)
  const [applyingSchedule, setApplyingSchedule] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newTimeInput, setNewTimeInput] = useState('')
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [cronLoading, setCronLoading] = useState(false)

  useEffect(() => {
    fetchConfig()
    fetchCronStatus()
  }, [])

  async function fetchConfig() {
    const { data, error } = await supabase.from('config').select('*').single()
    if (error && error.code !== 'PGRST116') {
      toast.error('Erro ao carregar configurações: ' + error.message)
    } else if (data) {
      setConfigId(data.id)
      setConfig({
        ai_tone:             data.ai_tone             || DEFAULT_CONFIG.ai_tone,
        ai_prompt_prefix:    data.ai_prompt_prefix    || DEFAULT_CONFIG.ai_prompt_prefix,
        rss_feeds:           data.rss_feeds           || [],
        auto_publish:        data.auto_publish        ?? false,
        newsletter_active:   data.newsletter_active   ?? true,
        openai_model:        data.openai_model        || 'gpt-4o-mini',
        sync_enabled:        data.sync_enabled        ?? true,
        sync_times_brt:      data.sync_times_brt      || ['07:00', '12:00', '18:00'],
        max_posts_per_sync:  data.max_posts_per_sync  ?? 10,
        posts_per_feed:      data.posts_per_feed      ?? 6,
        social_links:        data.social_links        || DEFAULT_CONFIG.social_links,
      })
    }
  }

  async function fetchCronStatus() {
    setCronLoading(true)
    try {
      const result = await getScheduleStatusAction()
      setCronJobs(result.jobs)
    } catch (_) {}
    setCronLoading(false)
  }

  async function handleSave() {
    setLoading(true)
    const payload = { ...config }
    let error
    if (configId) {
      const { error: updateError } = await supabase
        .from('config').update(payload).eq('id', configId)
      error = updateError
    } else {
      const { data, error: insertError } = await supabase
        .from('config').insert([payload]).select('id').single()
      if (data) setConfigId(data.id)
      error = insertError
    }
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Configurações salvas com sucesso')
      resetSiteConfigCache()
    }
    setLoading(false)
  }

  async function handleApplySchedule() {
    setApplyingSchedule(true)
    try {
      // Salva primeiro no DB, depois lê e aplica no pg_cron
      await handleSave()
      const result = await updateScheduleAction()
      if (result.success) {
        toast.success('Horários aplicados no pg_cron!')
        await fetchCronStatus()
      } else {
        toast.error('Erro ao aplicar: ' + result.message)
      }
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
    setApplyingSchedule(false)
  }

  function addFeed() {
    const url = newFeedUrl.trim()
    if (!url) return
    if (config.rss_feeds.includes(url)) { toast.error('Feed já na lista.'); return }
    setConfig({ ...config, rss_feeds: [...config.rss_feeds, url] })
    setNewFeedUrl('')
  }

  function removeFeed(url: string) {
    setConfig({ ...config, rss_feeds: config.rss_feeds.filter(f => f !== url) })
  }

  function addTime() {
    const t = newTimeInput.trim()
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) { toast.error('Formato inválido. Use HH:MM'); return }
    const [h] = t.split(':').map(Number)
    if (h < 0 || h > 23) { toast.error('Hora deve ser entre 00 e 23'); return }
    const normalized = `${String(h).padStart(2, '0')}:${t.split(':')[1]}`
    if (config.sync_times_brt.includes(normalized)) { toast.error('Horário já na lista'); return }
    setConfig({ ...config, sync_times_brt: [...config.sync_times_brt, normalized].sort() })
    setNewTimeInput('')
  }

  function removeTime(t: string) {
    setConfig({ ...config, sync_times_brt: config.sync_times_brt.filter(x => x !== t) })
  }

  function applyPreset(times: string[]) {
    setConfig({ ...config, sync_times_brt: times })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Configurações do Sistema</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ajuste o tom de voz da IA, fontes de RSS e automações.
        </p>
      </div>

      <div className="grid gap-6">

        {/* ── Automação (Supabase Edge Function + pg_cron) ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Automação de Postagens
            </CardTitle>
            <CardDescription>
              Sincronização via <strong>Supabase Edge Function</strong> agendada pelo{' '}
              <strong>pg_cron</strong>. Personalize horários e limites de postagem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Toggle geral */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Sincronização Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Ativar/desativar todos os jobs pg_cron de uma vez.
                </p>
              </div>
              <Switch
                checked={config.sync_enabled}
                onCheckedChange={val => setConfig({ ...config, sync_enabled: val })}
              />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Presets de Horário</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SCHEDULES.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.times)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      JSON.stringify(config.sync_times_brt) === JSON.stringify(p.times)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de horários */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Horários Configurados (horário de Brasília)
              </Label>
              {config.sync_times_brt.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum horário — adicione abaixo.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {config.sync_times_brt.map(t => {
                    const job = cronJobs.find((_, i) => {
                      // Associa pelo índice da lista atual
                      return config.sync_times_brt.indexOf(t) === i
                    })
                    return (
                      <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-semibold text-foreground">{t} BRT</p>
                          <p className="text-[10px] text-muted-foreground">{formatBrtToUtc(t)}</p>
                        </div>
                        <button
                          onClick={() => removeTime(t)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Adicionar horário */}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Ex: 09:00"
                  value={newTimeInput}
                  onChange={e => setNewTimeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTime()}
                  className="w-36 font-mono"
                  maxLength={5}
                />
                <Button variant="outline" size="sm" onClick={addTime}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Horário de Brasília (BRT = UTC-3). Formato: HH:MM (24h).
              </p>
            </div>

            {/* Limites */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="max_posts" className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  Posts máximos por sincronização
                </Label>
                <Input
                  id="max_posts"
                  type="number"
                  min={1}
                  max={50}
                  value={config.max_posts_per_sync}
                  onChange={e => setConfig({ ...config, max_posts_per_sync: Number(e.target.value) })}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Total de posts criados por ciclo (todos os feeds combinados).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="posts_feed" className="flex items-center gap-1.5">
                  <Rss className="h-3.5 w-3.5 text-primary" />
                  Posts por feed por ciclo
                </Label>
                <Input
                  id="posts_feed"
                  type="number"
                  min={1}
                  max={20}
                  value={config.posts_per_feed}
                  onChange={e => setConfig({ ...config, posts_per_feed: Number(e.target.value) })}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Máximo de notícias lidas por feed por ciclo.</p>
              </div>
            </div>

            {/* Status dos jobs pg_cron */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status dos Jobs pg_cron
                </Label>
                <button
                  onClick={fetchCronStatus}
                  disabled={cronLoading}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cronLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {cronJobs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg bg-amber-50/50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/30 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  Nenhum job ativo. Clique em &quot;Aplicar Horários&quot; para criar.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cronJobs.map(job => (
                    <div
                      key={job.jobname}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                    >
                      {job.active ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="text-xs font-mono font-medium text-foreground/80">{job.jobname}</span>
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {job.schedule}
                      </span>
                      {job.next_run && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          Próximo: {formatNextRun(job.next_run)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botão aplicar */}
            <div className="flex justify-end pt-1">
              <Button
                onClick={handleApplySchedule}
                disabled={applyingSchedule}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                {applyingSchedule ? 'Aplicando...' : 'Aplicar Horários no pg_cron'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── RSS Feeds ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5 text-primary" />
              Fontes de Notícias (RSS)
            </CardTitle>
            <CardDescription>
              Feeds que alimentam o blog. Vazio = usa os feeds padrão abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-1.5">Feeds padrão (quando lista estiver vazia):</p>
              {DEFAULT_RSS_FEEDS.map(f => (
                <div key={f.url} className="flex items-center gap-1.5">
                  <span className="text-emerald-500">●</span>
                  <span className="font-medium text-foreground/80">{f.name}</span>
                  <span className="truncate opacity-60">{f.url}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Feeds personalizados</Label>
              {config.rss_feeds.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Usando feeds padrão. Adicione abaixo para substituí-los.
                </p>
              ) : (
                config.rss_feeds.map(url => (
                  <div
                    key={url}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <Rss className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">{url}</span>
                    <button
                      onClick={() => removeFeed(url)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="https://feeds.valor.com.br/rss/..."
                value={newFeedUrl}
                onChange={e => setNewFeedUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFeed()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addFeed}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="space-y-0.5">
                <Label>Publicação Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Publicar posts sem revisão humana. Recomendamos desativar.
                </p>
              </div>
              <Switch
                checked={config.auto_publish}
                onCheckedChange={val => setConfig({ ...config, auto_publish: val })}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── IA ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tom de Voz do Luiz (IA)
            </CardTitle>
            <CardDescription>
              Como a IA deve interpretar e comentar as notícias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai_tone">Tom de Voz</Label>
              <Textarea
                id="ai_tone"
                placeholder="Ex: Sofisticado, pragmático, foco em análise macroeconômica..."
                className="min-h-[90px]"
                value={config.ai_tone}
                onChange={e => setConfig({ ...config, ai_tone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai_prompt">Instruções de Persona (Prompt)</Label>
              <Textarea
                id="ai_prompt"
                placeholder="Instruções de como a IA deve se comportar..."
                className="min-h-[90px]"
                value={config.ai_prompt_prefix}
                onChange={e => setConfig({ ...config, ai_prompt_prefix: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo OpenAI</Label>
              <div className="flex gap-2 flex-wrap">
                {['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'].map(model => (
                  <button
                    key={model}
                    onClick={() => setConfig({ ...config, openai_model: model })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      config.openai_model === model
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                gpt-4o-mini recomendado para baixo custo. Configure a chave no .env.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Redes Sociais ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Redes Sociais
            </CardTitle>
            <CardDescription>
              Links exibidos no header do site e no card "Sobre o autor". Deixe em branco para ocultar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/seu_perfil' },
              { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/sua_pagina'  },
              { key: 'tiktok',   label: 'TikTok',    placeholder: 'https://tiktok.com/@seu_perfil'   },
              { key: 'youtube',  label: 'YouTube',   placeholder: 'https://youtube.com/@seu_canal'   },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-3">
                <Label className="text-sm font-medium">{label}</Label>
                <Input
                  value={config.social_links[key] || ''}
                  onChange={e => setConfig({
                    ...config,
                    social_links: { ...config.social_links, [key]: e.target.value },
                  })}
                  placeholder={placeholder}
                  type="url"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              Cole a URL completa. Os ícones aparecem automaticamente no site após salvar.
            </p>
          </CardContent>
        </Card>

        {/* ── Newsletter ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Newsletter
            </CardTitle>
            <CardDescription>Configurações de captura de e-mails.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Captura de E-mails Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Exibir formulário de newsletter no site.
                </p>
              </div>
              <Switch
                checked={config.newsletter_active}
                onCheckedChange={val => setConfig({ ...config, newsletter_active: val })}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Setup instructions ── */}
        <Card className="border-blue-200/50 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-500" />
              Deploy da Edge Function
            </CardTitle>
            <CardDescription>
              Execute uma vez para ativar o agendamento Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
            <div className="rounded bg-muted/60 px-3 py-2">
              <span className="text-foreground/60"># 1. Deploy</span>
              <br />
              supabase functions deploy rss-sync --no-verify-jwt
            </div>
            <div className="rounded bg-muted/60 px-3 py-2">
              <span className="text-foreground/60"># 2. Secrets</span>
              <br />
              supabase secrets set OPENAI_API_KEY=sk-...
              <br />
              supabase secrets set CRON_SECRET=sua-senha
            </div>
            <div className="rounded bg-muted/60 px-3 py-2">
              <span className="text-foreground/60"># 3. SQL (Supabase &gt; SQL Editor)</span>
              <br />
              Execute: supabase_schedule_setup.sql
            </div>
            <p className="pt-1 text-[11px]">
              Depois clique em &quot;Aplicar Horários no pg_cron&quot; acima para ativar o agendamento.
            </p>
          </CardContent>
        </Card>

        {/* ── Env vars ── */}
        <Card className="border-amber-200/50 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4 text-amber-500" />
              Variáveis de Ambiente (.env)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-xs">
              <div className="rounded bg-muted/60 px-3 py-2 text-muted-foreground">
                VITE_SUPABASE_URL=<span className="text-foreground">✓ configurado</span>
              </div>
              <div className="rounded bg-muted/60 px-3 py-2 text-muted-foreground">
                SUPABASE_SERVICE_ROLE_KEY=<span className="text-foreground">✓ configurado</span>
              </div>
              <div className="rounded bg-muted/60 px-3 py-2 text-muted-foreground">
                OPENAI_API_KEY=<span className="text-amber-500">⚠ adicione para ativar IA</span>
              </div>
              <div className="rounded bg-muted/60 px-3 py-2 text-muted-foreground">
                CRON_SECRET=<span className="text-amber-500">⚠ adicione para proteger a Edge Function</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="flex justify-end pt-2 pb-8">
        <Button onClick={handleSave} disabled={loading} className="px-8">
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}
