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
  ai_tone: 'Sofisticado, analítico e pragmático. Foco em impacto real para o investidor de varejo brasileiro.',
  ai_prompt_prefix: 'Você é Luiz Felipe Michelin, consultor independente credenciado pela CVM. Sua análise deve ser direta, sem jargão excessivo, conectando a macroeconomia à carteira do investidor comum.',
  rss_feeds: [] as string[],
  auto_publish: false,
  newsletter_active: true,
  openai_model: 'gpt-4o-mini',
  sync_enabled: true,
  sync_times_brt: ['07:00', '12:00', '18:00'] as string[],
  max_posts_per_sync: 10,
  posts_per_feed: 6,
  social_links: { instagram: '', facebook: '', tiktok: '', youtube: '' } as Record<string, string>,
}

const PRESET_SCHEDULES = [
  { label: '3× ao dia (padrão)', times: ['07:00', '12:00', '18:00'] },
  { label: '2× ao dia',          times: ['08:00', '17:00'] },
  { label: '1× manhã',           times: ['07:30'] },
  { label: '1× noite',           times: ['20:00'] },
  { label: '4× ao dia',          times: ['07:00', '10:00', '14:00', '18:00'] },
]

function formatBrtToUtc(t: string) {
  const [h, m] = t.split(':').map(Number)
  const u = (h + 3) % 24
  return `${String(u).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} UTC`
}

function formatNextRun(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
  })
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
        ai_tone:            data.ai_tone            || DEFAULT_CONFIG.ai_tone,
        ai_prompt_prefix:   data.ai_prompt_prefix   || DEFAULT_CONFIG.ai_prompt_prefix,
        rss_feeds:          data.rss_feeds          || [],
        auto_publish:       data.auto_publish       ?? false,
        newsletter_active:  data.newsletter_active  ?? true,
        openai_model:       data.openai_model       || 'gpt-4o-mini',
        sync_enabled:       data.sync_enabled       ?? true,
        sync_times_brt:     data.sync_times_brt     || ['07:00', '12:00', '18:00'],
        max_posts_per_sync: data.max_posts_per_sync ?? 10,
        posts_per_feed:     data.posts_per_feed     ?? 6,
        social_links:       data.social_links       || DEFAULT_CONFIG.social_links,
      })
    }
  }

  async function fetchCronStatus() {
    setCronLoading(true)
    try { setCronJobs((await getScheduleStatusAction()).jobs) } catch {}
    setCronLoading(false)
  }

  async function handleSave() {
    setLoading(true)
    const payload = { ...config }
    let error
    if (configId) {
      const { error: e } = await supabase.from('config').update(payload).eq('id', configId)
      error = e
    } else {
      const { data, error: e } = await supabase.from('config').insert([payload]).select('id').single()
      if (data) setConfigId(data.id)
      error = e
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
      await handleSave()
      const result = await updateScheduleAction()
      if (result.success) {
        toast.success('Horários de automação aplicados!')
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
    const norm = `${String(h).padStart(2, '0')}:${t.split(':')[1]}`
    if (config.sync_times_brt.includes(norm)) { toast.error('Horário já na lista'); return }
    setConfig({ ...config, sync_times_brt: [...config.sync_times_brt, norm].sort() })
    setNewTimeInput('')
  }

  function removeTime(t: string) {
    setConfig({ ...config, sync_times_brt: config.sync_times_brt.filter(x => x !== t) })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Personalize o comportamento do blog, automação e redes sociais.
        </p>
      </div>

      <div className="grid gap-6">

        {/* ── Redes Sociais ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Redes Sociais
            </CardTitle>
            <CardDescription>
              Links exibidos no cabeçalho do site e no card do autor. Deixe em branco para ocultar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/seu_perfil' },
              { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/sua_pagina'  },
              { key: 'tiktok',   label: 'TikTok',    placeholder: 'https://tiktok.com/@seu_perfil'   },
              { key: 'youtube',  label: 'YouTube',   placeholder: 'https://youtube.com/@seu_canal'   },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="grid grid-cols-[90px_1fr] items-center gap-3">
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
          </CardContent>
        </Card>

        {/* ── Automação ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Automação de Postagens
            </CardTitle>
            <CardDescription>
              Controle quando e quantas notícias são buscadas automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Toggle geral */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Busca automática ativa</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Desativar pausa todas as buscas agendadas.</p>
              </div>
              <Switch
                checked={config.sync_enabled}
                onCheckedChange={val => setConfig({ ...config, sync_enabled: val })}
              />
            </div>

            {/* Presets de horário */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Frequência pré-definida</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SCHEDULES.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setConfig({ ...config, sync_times_brt: p.times })}
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

            {/* Horários configurados */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Horários de busca (Brasília)
              </Label>
              {config.sync_times_brt.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum horário — adicione abaixo.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {config.sync_times_brt.map(t => (
                    <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold">{t} BRT</p>
                        <p className="text-[10px] text-muted-foreground">{formatBrtToUtc(t)}</p>
                      </div>
                      <button onClick={() => removeTime(t)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  <Plus className="mr-1.5 h-4 w-4" />Adicionar
                </Button>
              </div>
            </div>

            {/* Limites */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="max_posts" className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  Máximo de posts por busca
                </Label>
                <Input
                  id="max_posts" type="number" min={1} max={50}
                  value={config.max_posts_per_sync}
                  onChange={e => setConfig({ ...config, max_posts_per_sync: Number(e.target.value) })}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Total criado em cada ciclo automático.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="posts_feed" className="flex items-center gap-1.5">
                  <Rss className="h-3.5 w-3.5 text-primary" />
                  Posts por fonte de notícia
                </Label>
                <Input
                  id="posts_feed" type="number" min={1} max={20}
                  value={config.posts_per_feed}
                  onChange={e => setConfig({ ...config, posts_per_feed: Number(e.target.value) })}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Quantas notícias ler por feed por ciclo.</p>
              </div>
            </div>

            {/* Status dos agendamentos */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status dos agendamentos</Label>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg bg-amber-50/50 border border-amber-200/50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  Nenhum agendamento ativo. Clique em &quot;Aplicar Agendamento&quot; abaixo.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cronJobs.map(job => (
                    <div key={job.jobname} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                      {job.active
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      <span className="text-xs font-mono font-medium text-foreground/80">{job.jobname}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{job.schedule}</Badge>
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

            <div className="flex justify-end">
              <Button onClick={handleApplySchedule} disabled={applyingSchedule} className="gap-2">
                <Clock className="h-4 w-4" />
                {applyingSchedule ? 'Aplicando...' : 'Aplicar Agendamento'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Fontes de Notícias ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5 text-primary" />
              Fontes de Notícias
            </CardTitle>
            <CardDescription>
              Sites de onde as notícias são buscadas automaticamente. Sem personalização, usa os padrões.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-1.5">Fontes padrão ativas:</p>
              {DEFAULT_RSS_FEEDS.map(f => (
                <div key={f.url} className="flex items-center gap-1.5">
                  <span className="text-emerald-500">●</span>
                  <span className="font-medium text-foreground/80">{f.name}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fontes personalizadas</Label>
              {config.rss_feeds.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Usando as fontes padrão.</p>
              ) : (
                config.rss_feeds.map(url => (
                  <div key={url} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <Rss className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">{url}</span>
                    <button onClick={() => removeFeed(url)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="https://feeds.exemplo.com.br/rss"
                value={newFeedUrl}
                onChange={e => setNewFeedUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFeed()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addFeed}>
                <Plus className="mr-1.5 h-4 w-4" />Adicionar
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <Label>Publicar automaticamente</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Posts vão direto ao ar sem revisão. Recomendamos deixar desativado.
                </p>
              </div>
              <Switch
                checked={config.auto_publish}
                onCheckedChange={val => setConfig({ ...config, auto_publish: val })}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Tom de Voz da IA ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tom de Voz do Analista (IA)
            </CardTitle>
            <CardDescription>
              Como a inteligência artificial deve escrever as análises e opiniões do Luiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai_tone">Estilo e tom</Label>
              <Textarea
                id="ai_tone"
                placeholder="Ex: Sofisticado, pragmático, foco em análise macroeconômica..."
                className="min-h-[90px]"
                value={config.ai_tone}
                onChange={e => setConfig({ ...config, ai_tone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai_prompt">Instruções de persona</Label>
              <Textarea
                id="ai_prompt"
                placeholder="Como a IA deve se comportar ao escrever..."
                className="min-h-[90px]"
                value={config.ai_prompt_prefix}
                onChange={e => setConfig({ ...config, ai_prompt_prefix: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Rápido e econômico' },
                  { id: 'gpt-4o',      label: 'GPT-4o',      desc: 'Mais preciso' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setConfig({ ...config, openai_model: m.id })}
                    className={`text-left px-4 py-2 rounded-lg border transition-colors ${
                      config.openai_model === m.id
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <div className="text-xs font-semibold">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Newsletter ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Newsletter
            </CardTitle>
            <CardDescription>Controle a captura de e-mails no site.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Formulário de inscrição ativo</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Exibe o campo de e-mail no rodapé do blog.
                </p>
              </div>
              <Switch
                checked={config.newsletter_active}
                onCheckedChange={val => setConfig({ ...config, newsletter_active: val })}
              />
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
