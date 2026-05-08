import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  toggleSubscriberAction,
  sendNewsletterAction,
  getSubscriberStatsAction,
} from '@/lib/server-tasks'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Search, Download, Mail, Trash2, RefreshCcw, Send, Users, UserCheck, UserX, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/newsletter')({
  component: AdminNewsletter,
})

function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Send newsletter state
  const [sendOpen, setSendOpen] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [editorial, setEditorial] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchSubscribers(), fetchStats(), fetchPosts()])
    setLoading(false)
  }

  async function fetchSubscribers() {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar inscritos')
    else setSubscribers(data || [])
  }

  async function fetchStats() {
    const result = await getSubscriberStatsAction()
    setStats(result)
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('slug, title, category, date')
      .eq('published', true)
      .order('date', { ascending: false })
      .limit(30)
    setPosts(data || [])
  }

  async function deleteSubscriber(id: string) {
    if (!confirm('Remover este inscrito?')) return
    const { error } = await supabase.from('subscribers').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Inscrito removido'); fetchAll() }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const result = await toggleSubscriberAction({ data: { id, active: !currentActive } })
    if (result.success) {
      setSubscribers((prev) => prev.map((s) => s.id === id ? { ...s, active: !currentActive } : s))
      setStats((prev) => ({
        ...prev,
        active: prev.active + (!currentActive ? 1 : -1),
        inactive: prev.inactive + (!currentActive ? -1 : 1),
      }))
    } else {
      toast.error('Erro ao atualizar status')
    }
  }

  function togglePostSelection(slug: string) {
    setSelectedPosts((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  async function handleSend() {
    if (!subject.trim()) { toast.error('Informe o assunto da newsletter'); return }
    if (selectedPosts.length === 0) { toast.error('Selecione ao menos um post'); return }
    if (!confirm(`Enviar newsletter para ${stats.active} inscritos ativos?`)) return

    setSending(true)
    try {
      const result = await sendNewsletterAction({
        data: { subject: subject.trim(), editorial: editorial.trim(), postSlugs: selectedPosts },
      })
      if (result.success) {
        toast.success(result.message)
        setSendOpen(false)
        setSubject('')
        setEditorial('')
        setSelectedPosts([])
      } else {
        toast.error(result.message)
      }
    } catch (e: any) {
      toast.error('Erro ao enviar newsletter')
    } finally {
      setSending(false)
    }
  }

  const exportCSV = () => {
    const rows = filteredSubscribers.map((s) => [
      s.email,
      s.name || '',
      s.active ? 'Ativo' : 'Inativo',
      new Date(s.created_at).toLocaleDateString('pt-BR'),
    ])
    const csv = [['Email', 'Nome', 'Status', 'Data'].join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'inscritos_newsletter.csv'
    a.click()
  }

  const filteredSubscribers = subscribers.filter(
    (s) => s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Newsletter</h1>
          <p className="text-muted-foreground mt-1">Gerencie inscritos e envie edições.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setSendOpen((v) => !v)}>
            <Send className="mr-2 h-4 w-4" />Enviar Newsletter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-foreground' },
          { label: 'Ativos', value: stats.active, icon: UserCheck, color: 'text-green-600' },
          { label: 'Inativos', value: stats.inactive, icon: UserX, color: 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Icon className={`h-4 w-4 ${color}`} />{label}
            </div>
            <div className={`font-serif text-3xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Send newsletter panel */}
      {sendOpen && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Nova edição</h2>
            <button onClick={() => setSendOpen(false)} className="text-muted-foreground hover:text-foreground">
              {sendOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assunto do e-mail *</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Mercado em compasso de espera — análise semanal"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Editorial (opcional)</label>
                <textarea
                  value={editorial}
                  onChange={(e) => setEditorial(e.target.value)}
                  rows={4}
                  placeholder="Parágrafo de abertura da newsletter — contexto geral da semana..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Posts ({selectedPosts.length} selecionados) *
              </label>
              <div className="mt-1 max-h-52 overflow-y-auto rounded-md border border-input divide-y divide-border">
                {posts.map((p) => (
                  <label key={p.slug} className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(p.slug)}
                      onChange={() => togglePostSelection(p.slug)}
                      className="mt-0.5 rounded"
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{p.category} · {p.date}</div>
                      <div className="text-sm font-medium line-clamp-2">{p.title}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Será enviado para <strong>{stats.active}</strong> inscritos ativos.
            </p>
            <Button onClick={handleSend} disabled={sending || !subject || selectedPosts.length === 0}>
              {sending ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" />Enviar agora</>}
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por e-mail ou nome..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredSubscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum inscrito encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-none" />
                      {sub.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sub.name || <span className="italic text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmt(sub.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={sub.active}
                        onCheckedChange={() => toggleActive(sub.id, sub.active)}
                      />
                      <Badge variant={sub.active ? 'default' : 'secondary'} className="text-xs">
                        {sub.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteSubscriber(sub.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
