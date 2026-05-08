import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getThemeAction,
  saveThemeAction,
  type SiteTheme,
  type EmailTheme,
} from '@/lib/server-tasks'
import {
  FONT_PAIRS,
  COLOR_PRESETS,
  BG_PRESETS,
  RADIUS_PRESETS,
  EMAIL_ACCENT_PRESETS,
  DEFAULT_SITE_THEME,
  applyThemeToDOM,
  resetThemeCache,
} from '@/lib/theme-config'
import { DEFAULT_EMAIL_THEME, buildEmailCss } from '@/lib/email-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Save, Palette, Mail, RotateCcw, Check, Type, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/appearance')({
  component: AdminAppearance,
})

type Tab = 'site' | 'email'

// ── Preview do blog (mini) ────────────────────────────────────────────────────

function BlogPreview({ site }: { site: SiteTheme }) {
  const pair = FONT_PAIRS.find(p => p.id === site.font_pair_id)
  const serifFont = pair?.serif ?? 'Georgia'
  const sansFont = pair?.sans ?? 'system-ui'

  return (
    <div
      className="rounded-xl border border-border overflow-hidden shadow-sm text-left"
      style={{ backgroundColor: site.background_hex, fontFamily: `"${sansFont}", system-ui, sans-serif` }}
    >
      {/* Header simulado */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: site.background_hex }}>
        <span style={{ fontFamily: `"${serifFont}", serif`, fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>
          LFM <span style={{ color: site.primary_hex }}>Insights</span>
        </span>
        <div style={{ fontSize: 11, color: '#888', fontFamily: `"${sansFont}", system-ui` }}>Assinar</div>
      </div>

      {/* Card de post simulado */}
      <div className="p-5 space-y-4">
        <div
          className="rounded overflow-hidden"
          style={{ borderRadius: site.radius, border: '1px solid #e5e3dc', backgroundColor: '#fff', padding: '16px' }}
        >
          <div style={{ fontSize: 10, fontFamily: `"${sansFont}", system-ui`, letterSpacing: '0.15em', textTransform: 'uppercase', color: site.primary_hex, marginBottom: 4 }}>
            Macroeconomia · 5 min
          </div>
          <h3 style={{ fontFamily: `"${serifFont}", serif`, fontSize: 16, fontWeight: 500, lineHeight: 1.3, margin: '0 0 8px', color: '#1a1a1a' }}>
            Banco Central mantém taxa Selic e sinaliza cautela para o próximo trimestre
          </h3>
          <p style={{ fontSize: 12, color: '#5a5a5a', lineHeight: 1.6, margin: '0 0 12px' }}>
            A decisão unânime do Copom surpreendeu parte do mercado que esperava um ajuste...
          </p>
          <div style={{ fontSize: 11, background: site.background_hex === '#ffffff' ? '#f9f7f2' : site.background_hex, borderLeft: `3px solid ${site.primary_hex}`, padding: '8px 12px', fontStyle: 'italic', color: '#2a2a2a', borderRadius: '0 4px 4px 0' }}>
            "Este movimento reforça nossa tese de manter posição em renda fixa de médio prazo..."
          </div>
        </div>
        <div
          className="rounded overflow-hidden"
          style={{ borderRadius: site.radius, border: '1px solid #e5e3dc', backgroundColor: '#fff', padding: '16px' }}
        >
          <div style={{ fontSize: 10, fontFamily: `"${sansFont}", system-ui`, letterSpacing: '0.15em', textTransform: 'uppercase', color: site.primary_hex, marginBottom: 4 }}>
            Câmbio · 3 min
          </div>
          <h3 style={{ fontFamily: `"${serifFont}", serif`, fontSize: 16, fontWeight: 500, lineHeight: 1.3, margin: '0 0 8px', color: '#1a1a1a' }}>
            Dólar cai ante real com dados positivos do comércio exterior
          </h3>
          <p style={{ fontSize: 12, color: '#5a5a5a', lineHeight: 1.6, margin: 0 }}>
            O câmbio recuou 1,2% na sessão desta terça após divulgação do superávit...
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Preview do e-mail ─────────────────────────────────────────────────────────

function buildEmailPreview(email: EmailTheme) {
  const css = buildEmailCss(email.accent_hex, email.bg_hex, email.text_hex)
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><style>${css}</style></head><body>
  <div class="wrap">
    <div class="header"><span class="logo">LFM <span>Insights</span></span></div>
    <div class="body">
      <p class="meta">Bem-vindo à newsletter</p>
      <h1>Sua leitura de mercado chega toda semana.</h1>
      <p>Obrigado por se inscrever no <strong>LFM Insights</strong>. A partir de agora você vai receber análises diretas das notícias econômicas que impactam o seu patrimônio.</p>
      <div class="opinion">"O objetivo aqui é simples: ajudar você a tomar decisões melhores com o seu dinheiro, com base em análise econômica séria e independente."<br /><br />— Luiz Felipe Michelin, Consultor CVM</div>
      <a href="#" class="btn">Ver últimas análises</a>
    </div>
    <div class="footer">
      <p class="footer-text">Você recebe este e-mail porque se inscreveu em LFM Insights.<br />
        <a href="#" style="color:#8a8a8a;">Cancelar inscrição</a> &nbsp;·&nbsp; Luiz Felipe Michelin — Consultor CVM
      </p>
    </div>
  </div>
</body></html>`
}

// ── Main component ────────────────────────────────────────────────────────────

function AdminAppearance() {
  const [tab, setTab] = useState<Tab>('site')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [site, setSite] = useState<SiteTheme>(DEFAULT_SITE_THEME)
  const [email, setEmail] = useState<EmailTheme>(DEFAULT_EMAIL_THEME)

  useEffect(() => {
    getThemeAction().then((cfg) => {
      if (cfg?.site) setSite({ ...DEFAULT_SITE_THEME, ...cfg.site })
      if (cfg?.email) setEmail({ ...DEFAULT_EMAIL_THEME, ...cfg.email })
      setLoading(false)
    })
  }, [])

  // Live preview — apply to current page as user tweaks
  useEffect(() => {
    if (!loading) applyThemeToDOM(site)
  }, [site, loading])

  async function handleSave() {
    setSaving(true)
    const result = await saveThemeAction({ data: { site, email } })
    if (result.success) {
      resetThemeCache()
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
    setSaving(false)
  }

  function resetSite() {
    setSite(DEFAULT_SITE_THEME)
    toast.success('Aparência do site restaurada para o padrão.')
  }
  function resetEmail() {
    setEmail(DEFAULT_EMAIL_THEME)
    toast.success('Aparência do e-mail restaurada para o padrão.')
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 font-serif text-lg text-muted-foreground">Carregando aparência...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Aparência</h1>
          <p className="text-muted-foreground text-sm mt-1">Cores, fontes e estilo visual do blog e dos e-mails.</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar aparência'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('site')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'site' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
          Identidade do Blog
        </button>
        <button
          onClick={() => setTab('email')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'email' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          Aparência dos E-mails
        </button>
      </div>

      {tab === 'site' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* Formulário */}
          <div className="space-y-6">

            {/* Cor primária */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-primary" />
                  Cor de Destaque
                </CardTitle>
                <CardDescription>Usada em botões, links, tags e elementos visuais principais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.hex}
                      title={`${preset.label} — ${preset.description}`}
                      onClick={() => setSite(s => ({ ...s, primary_hex: preset.hex }))}
                      className={cn(
                        'relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110',
                        site.primary_hex === preset.hex ? 'border-foreground shadow-md scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {site.primary_hex === preset.hex && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Label className="text-xs text-muted-foreground">Cor personalizada:</Label>
                  <input
                    type="color"
                    value={site.primary_hex}
                    onChange={e => setSite(s => ({ ...s, primary_hex: e.target.value }))}
                    className="h-8 w-14 cursor-pointer rounded border border-input p-0.5"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{site.primary_hex}</span>
                </div>
              </CardContent>
            </Card>

            {/* Fundo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Circle className="h-4 w-4 text-primary" />
                  Fundo da Página
                </CardTitle>
                <CardDescription>Tom de fundo geral do blog.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {BG_PRESETS.map(preset => (
                    <button
                      key={preset.hex}
                      title={`${preset.label} — ${preset.description}`}
                      onClick={() => setSite(s => ({ ...s, background_hex: preset.hex }))}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:shadow-md',
                        site.background_hex === preset.hex ? 'border-primary shadow-md' : 'border-border'
                      )}
                    >
                      <div
                        className="h-8 w-14 rounded border border-gray-200"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-xs font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Personalizado:</Label>
                  <input
                    type="color"
                    value={site.background_hex}
                    onChange={e => setSite(s => ({ ...s, background_hex: e.target.value }))}
                    className="h-8 w-14 cursor-pointer rounded border border-input p-0.5"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{site.background_hex}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tipografia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Type className="h-4 w-4 text-primary" />
                  Tipografia
                </CardTitle>
                <CardDescription>Par de fontes para títulos e texto corrido.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FONT_PAIRS.map(pair => (
                    <button
                      key={pair.id}
                      onClick={() => setSite(s => ({ ...s, font_pair_id: pair.id, font_serif: pair.serif, font_sans: pair.sans }))}
                      className={cn(
                        'text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm',
                        site.font_pair_id === pair.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{pair.description}</span>
                        {site.font_pair_id === pair.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p style={{ fontFamily: `"${pair.serif}", Georgia, serif`, fontSize: 17, fontWeight: 500, lineHeight: 1.2, marginBottom: 4 }}>
                        Título editorial
                      </p>
                      <p style={{ fontFamily: `"${pair.sans}", system-ui, sans-serif`, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                        Texto de corpo e labels
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">{pair.serif} + {pair.sans}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bordas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Arredondamento de Bordas</CardTitle>
                <CardDescription>Intensidade do arredondamento em cards, botões e inputs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {RADIUS_PRESETS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setSite(s => ({ ...s, radius: r.value }))}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 border-2 transition-all hover:shadow-sm',
                        site.radius === r.value ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                      style={{ borderRadius: '8px' }}
                    >
                      <div
                        className="h-10 w-16 border-2 border-foreground/20 bg-muted"
                        style={{ borderRadius: r.value }}
                      />
                      <span className="text-xs font-medium">{r.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={resetSite}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Restaurar padrão do site
            </Button>
          </div>

          {/* Prévia */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prévia em tempo real</p>
            <BlogPreview site={site} />
            <p className="text-xs text-muted-foreground text-center">As fontes do Google carregam após salvar e recarregar a página.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* Formulário e-mail */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-primary" />
                  Cores dos E-mails
                </CardTitle>
                <CardDescription>
                  Paleta usada em todos os e-mails enviados — boas-vindas e newsletter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Cor de destaque */}
                <div className="space-y-2">
                  <Label className="font-medium">Cor de destaque</Label>
                  <p className="text-xs text-muted-foreground">Usada no logo, links, borda dos blocos de citação e etiquetas.</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {EMAIL_ACCENT_PRESETS.map(p => (
                      <button
                        key={p.hex}
                        title={p.label}
                        onClick={() => setEmail(e => ({ ...e, accent_hex: p.hex }))}
                        className={cn(
                          'relative h-8 w-8 rounded-full border-2 transition-all hover:scale-110',
                          email.accent_hex === p.hex ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: p.hex }}
                      >
                        {email.accent_hex === p.hex && <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={email.accent_hex}
                      onChange={e => setEmail(em => ({ ...em, accent_hex: e.target.value }))}
                      className="h-8 w-14 cursor-pointer rounded border border-input p-0.5"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{email.accent_hex}</span>
                  </div>
                </div>

                {/* Fundo */}
                <div className="space-y-2">
                  <Label className="font-medium">Cor de fundo</Label>
                  <p className="text-xs text-muted-foreground">Fundo externo do e-mail (área ao redor do conteúdo).</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={email.bg_hex}
                      onChange={e => setEmail(em => ({ ...em, bg_hex: e.target.value }))}
                      className="h-8 w-14 cursor-pointer rounded border border-input p-0.5"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{email.bg_hex}</span>
                    <div className="flex gap-1.5 ml-2">
                      {['#f5f4f0', '#ffffff', '#f0ebe2', '#eef2f7'].map(hex => (
                        <button
                          key={hex}
                          title={hex}
                          onClick={() => setEmail(e => ({ ...e, bg_hex: hex }))}
                          className={cn('h-7 w-7 rounded border-2 transition-all hover:scale-110', email.bg_hex === hex ? 'border-foreground' : 'border-border')}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Texto */}
                <div className="space-y-2">
                  <Label className="font-medium">Cor do texto principal</Label>
                  <p className="text-xs text-muted-foreground">Cor usada em títulos e no botão CTA.</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={email.text_hex}
                      onChange={e => setEmail(em => ({ ...em, text_hex: e.target.value }))}
                      className="h-8 w-14 cursor-pointer rounded border border-input p-0.5"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{email.text_hex}</span>
                    <div className="flex gap-1.5 ml-2">
                      {['#1a1a1a', '#111827', '#1e293b', '#292524'].map(hex => (
                        <button
                          key={hex}
                          title={hex}
                          onClick={() => setEmail(e => ({ ...e, text_hex: hex }))}
                          className={cn('h-7 w-7 rounded border-2 transition-all hover:scale-110', email.text_hex === hex ? 'border-foreground' : 'border-border')}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={resetEmail}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Restaurar padrão dos e-mails
            </Button>
          </div>

          {/* Prévia e-mail */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prévia em tempo real</p>
            <div className="rounded-xl border border-border overflow-hidden shadow-sm" style={{ height: '640px' }}>
              <iframe
                srcDoc={buildEmailPreview(email)}
                title="Prévia do e-mail"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
