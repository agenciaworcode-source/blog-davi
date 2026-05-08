import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import {
  getEmailTemplatesAction,
  saveEmailTemplatesAction,
  type WelcomeTemplate,
  type NewsletterTemplate,
} from '@/lib/server-tasks'
import { DEFAULT_WELCOME, DEFAULT_NEWSLETTER, EMAIL_CSS } from '@/lib/email-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Mail, Newspaper, Eye, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/email-templates')({
  component: AdminEmailTemplates,
})

type Tab = 'welcome' | 'newsletter'

const BASE_URL = 'https://lfminsights.com.br'

// ── Client-side HTML preview generators ────────────────────────────────────────

function buildWelcomePreview(tpl: WelcomeTemplate): string {
  const bodyParagraphs = tpl.body
    .split('\n\n')
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
  const quoteHtml = tpl.quote.replace(/\n\n/g, '<br /><br />').replace(/\n/g, '<br />')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><style>${EMAIL_CSS}</style></head><body>
  <div class="wrap">
    <div class="header"><span class="logo">LFM <span>Insights</span></span></div>
    <div class="body">
      <p class="meta">Bem-vindo à newsletter</p>
      <h1>${tpl.headline || '—'}</h1>
      ${bodyParagraphs || '<p style="color:#aaa">Texto do corpo aparecerá aqui...</p>'}
      <div class="opinion">${quoteHtml || '<em style="color:#aaa">Citação aparecerá aqui...</em>'}</div>
      <a href="#" class="btn">${tpl.cta_text || 'Ver análises'}</a>
    </div>
    <div class="footer">
      <p class="footer-text">Você recebe este e-mail porque se inscreveu em LFM Insights.<br />
        <a href="#" style="color:#8a8a8a;">Cancelar inscrição</a> &nbsp;·&nbsp; Luiz Felipe Michelin — Consultor CVM
      </p>
    </div>
  </div>
</body></html>`
}

function buildNewsletterPreview(tpl: NewsletterTemplate): string {
  const footerHtml = tpl.footer_text.replace(/\n/g, '<br />')
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><style>${EMAIL_CSS}</style></head><body>
  <div class="wrap">
    <div class="header"><span class="logo">LFM <span>Insights</span></span></div>
    <div class="body">
      <p class="meta">${tpl.header_label || 'Newsletter LFM Insights'} · ${date}</p>
      <h1>Análise semanal do mercado financeiro</h1>
      <p>Este é um exemplo de editorial introdutório que o remetente escreve ao enviar a edição.</p>
      <hr class="divider" />
      <div>
        <p class="meta">Macroeconomia · 5 min de leitura</p>
        <h2><a href="#" style="color:#1a1a1a;text-decoration:none;">Título de exemplo do post analisado</a></h2>
        <p class="excerpt">Resumo do artigo que aparecerá na newsletter, mostrando o contexto principal da notícia de forma objetiva e direta.</p>
        <div class="opinion">"Análise estratégica do Luiz sobre como esta notícia impacta a carteira do investidor de varejo brasileiro."</div>
        <a href="#" class="btn">Ler análise completa</a>
        <hr class="divider" />
      </div>
    </div>
    <div class="footer">
      <p class="footer-text">${footerHtml}<br />
        <a href="#" style="color:#8a8a8a;">Cancelar inscrição</a>
      </p>
    </div>
  </div>
</body></html>`
}

// ── Component ─────────────────────────────────────────────────────────────────

function AdminEmailTemplates() {
  const [tab, setTab] = useState<Tab>('welcome')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  const [welcome, setWelcome] = useState<WelcomeTemplate>(DEFAULT_WELCOME)
  const [newsletter, setNewsletter] = useState<NewsletterTemplate>(DEFAULT_NEWSLETTER)

  useEffect(() => {
    getEmailTemplatesAction().then((tpl) => {
      if (tpl) {
        setWelcome({ ...DEFAULT_WELCOME, ...tpl.welcome })
        setNewsletter({ ...DEFAULT_NEWSLETTER, ...tpl.newsletter })
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const result = await saveEmailTemplatesAction({ data: { welcome, newsletter } })
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
    setSaving(false)
  }

  const previewHtml = tab === 'welcome'
    ? buildWelcomePreview(welcome)
    : buildNewsletterPreview(newsletter)

  if (loading) {
    return <div className="flex items-center justify-center h-64 font-serif text-lg text-muted-foreground">Carregando templates...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Templates de E-mail</h1>
          <p className="text-muted-foreground text-sm mt-1">Personalize os e-mails enviados aos inscritos da newsletter.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(v => !v)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? 'Ocultar prévia' : 'Mostrar prévia'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar templates'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('welcome')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'welcome'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          E-mail de Boas-vindas
        </button>
        <button
          onClick={() => setTab('newsletter')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'newsletter'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Newspaper className="h-4 w-4" />
          Template da Newsletter
        </button>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-2xl'}`}>

        {/* ── Formulário ── */}
        <div className="space-y-4">
          {tab === 'welcome' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">E-mail de Boas-vindas</CardTitle>
                  <CardDescription>
                    Enviado automaticamente quando alguém se inscreve na newsletter.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assunto do e-mail</Label>
                    <Input
                      value={welcome.subject}
                      onChange={e => setWelcome(w => ({ ...w, subject: e.target.value }))}
                      placeholder="Assunto que aparece na caixa de entrada..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Título principal</Label>
                    <Input
                      value={welcome.headline}
                      onChange={e => setWelcome(w => ({ ...w, headline: e.target.value }))}
                      placeholder="Título de destaque do e-mail..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto de apresentação</Label>
                    <p className="text-xs text-muted-foreground">Separe parágrafos com uma linha em branco.</p>
                    <Textarea
                      value={welcome.body}
                      onChange={e => setWelcome(w => ({ ...w, body: e.target.value }))}
                      placeholder="Escreva o corpo do e-mail de boas-vindas..."
                      className="min-h-[120px] resize-y font-serif"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Citação / Frase de destaque</Label>
                    <p className="text-xs text-muted-foreground">Aparece em bloco destacado. Separe o autor com linha em branco.</p>
                    <Textarea
                      value={welcome.quote}
                      onChange={e => setWelcome(w => ({ ...w, quote: e.target.value }))}
                      placeholder="Citação inspiradora ou mensagem pessoal..."
                      className="min-h-[100px] resize-y font-serif italic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do botão</Label>
                    <Input
                      value={welcome.cta_text}
                      onChange={e => setWelcome(w => ({ ...w, cta_text: e.target.value }))}
                      placeholder="Ex: Ver últimas análises"
                    />
                  </div>
                </CardContent>
              </Card>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setWelcome(DEFAULT_WELCOME); toast.success('Template restaurado para o padrão.') }}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Restaurar padrão
              </Button>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template da Newsletter</CardTitle>
                  <CardDescription>
                    Estrutura base usada em cada edição enviada. O conteúdo dos posts e o assunto são definidos no momento do envio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rótulo do cabeçalho</Label>
                    <p className="text-xs text-muted-foreground">Texto pequeno que aparece acima do título em cada edição.</p>
                    <Input
                      value={newsletter.header_label}
                      onChange={e => setNewsletter(n => ({ ...n, header_label: e.target.value }))}
                      placeholder="Ex: Newsletter LFM Insights"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rodapé / Assinatura</Label>
                    <p className="text-xs text-muted-foreground">Texto do rodapé de todas as edições. O link de cancelamento é adicionado automaticamente.</p>
                    <Textarea
                      value={newsletter.footer_text}
                      onChange={e => setNewsletter(n => ({ ...n, footer_text: e.target.value }))}
                      placeholder="Texto do rodapé..."
                      className="min-h-[100px] resize-y"
                    />
                  </div>
                </CardContent>
              </Card>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setNewsletter(DEFAULT_NEWSLETTER); toast.success('Template restaurado para o padrão.') }}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Restaurar padrão
              </Button>
            </>
          )}
        </div>

        {/* ── Prévia ── */}
        {showPreview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prévia do e-mail</p>
              <p className="text-xs text-muted-foreground">Atualiza em tempo real</p>
            </div>
            <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-[#f5f4f0]" style={{ height: '680px' }}>
              <iframe
                srcDoc={previewHtml}
                title="Prévia do e-mail"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
