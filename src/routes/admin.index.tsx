import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { syncNewsAction, getDashboardStatsAction } from '@/lib/server-tasks'
import { Button } from '@/components/ui/button'
import {
  RefreshCcw,
  FileText,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  Rss,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    subscribers: 0,
    lastSync: null as any,
  })
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoadingStats(true)
    try {
      const [serverStats, postsResult] = await Promise.all([
        getDashboardStatsAction(),
        supabase
          .from('posts')
          .select('id, slug, title, category, published, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      setStats(serverStats)
      setRecentPosts(postsResult.data || [])
    } catch (e) {
      // fallback to client-side count only
      const { count: total } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
      const { count: subscribers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
      setStats((s) => ({ ...s, total: total ?? 0, subscribers: subscribers ?? 0 }))
    }
    setLoadingStats(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncNewsAction()
      if (result.success) {
        toast.success(result.message)
        loadDashboard()
      } else {
        toast.error(result.message)
      }
    } catch (e: any) {
      toast.error('Erro na sincronização: ' + (e.message || 'falha desconhecida'))
    }
    setSyncing(false)
  }

  const lastSyncTime = stats.lastSync?.created_at
    ? new Date(stats.lastSync.created_at).toLocaleString('pt-BR')
    : null

  const cards = [
    {
      label: 'Posts Publicados',
      value: loadingStats ? '—' : stats.published,
      sub: `de ${stats.total} total`,
      icon: CheckCircle,
      color: 'text-emerald-500',
    },
    {
      label: 'Aguardando Revisão',
      value: loadingStats ? '—' : stats.pending,
      sub: 'rascunhos pendentes',
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      label: 'Inscritos na Newsletter',
      value: loadingStats ? '—' : stats.subscribers,
      sub: 'e-mails capturados',
      icon: Users,
      color: 'text-primary',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Painel de controle do LFM Economy Insight
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} size="sm">
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Rss className="mr-2 h-4 w-4" />
          )}
          {syncing ? 'Sincronizando RSS...' : 'Sincronizar RSS Agora'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="text-4xl font-serif text-foreground">{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Last sync info */}
      {lastSyncTime && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm flex items-center gap-3">
          <RefreshCcw className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Última sincronização: <span className="text-foreground font-medium">{lastSyncTime}</span>
            {stats.lastSync?.posts_created > 0 && (
              <> — {stats.lastSync.posts_created} post(s) criado(s)</>
            )}
          </span>
        </div>
      )}

      {/* Pending posts alert */}
      {stats.pending > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-foreground">
              <span className="font-semibold">{stats.pending} post(s)</span> aguardando revisão e
              publicação.
            </span>
          </div>
          <Link to="/admin/posts">
            <Button variant="outline" size="sm" className="shrink-0">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Revisar
            </Button>
          </Link>
        </div>
      )}

      {/* Recent Posts */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-lg font-medium text-foreground">Posts Recentes</h2>
          <Link to="/admin/posts" className="text-xs text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentPosts.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">
              Nenhum post ainda. Sincronize o RSS ou crie um post manualmente.
            </div>
          ) : (
            recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.category} ·{' '}
                    {new Date(post.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Badge variant={post.published ? 'default' : 'secondary'} className="shrink-0 text-xs">
                  {post.published ? 'Publicado' : 'Rascunho'}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <Link to="/admin/posts/$id" params={{ id: post.id }}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link to="/admin/posts/$id" params={{ id: 'new' }}>
          <div className="rounded-lg border border-dashed border-border p-4 hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer text-center">
            <div className="text-sm font-medium text-foreground">+ Novo Post Manual</div>
            <div className="text-xs text-muted-foreground mt-0.5">Redija uma análise</div>
          </div>
        </Link>
        <Link to="/admin/newsletter">
          <div className="rounded-lg border border-dashed border-border p-4 hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer text-center">
            <div className="text-sm font-medium text-foreground">Newsletter</div>
            <div className="text-xs text-muted-foreground mt-0.5">Gerencie inscritos</div>
          </div>
        </Link>
        <Link to="/admin/settings">
          <div className="rounded-lg border border-dashed border-border p-4 hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer text-center">
            <div className="text-sm font-medium text-foreground">Configurações</div>
            <div className="text-xs text-muted-foreground mt-0.5">RSS, IA e automação</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
