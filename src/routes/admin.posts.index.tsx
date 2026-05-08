import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Trash2,
  RefreshCcw,
  Edit,
  Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { syncNewsAction } from '@/lib/server-tasks'

export const Route = createFileRoute('/admin/posts/')({
  component: AdminPosts,
})

function AdminPosts() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar posts: ' + error.message)
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncNewsAction()
      if (result.success) {
        toast.success(result.message)
        fetchPosts()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Falha na comunicação com o servidor.')
    }
    setSyncing(false)
  }

  async function deletePost(id: string) {
    if (!confirm('Tem certeza que deseja excluir este post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success('Post excluído com sucesso')
      fetchPosts()
    }
  }

  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Posts e Notícias</h1>
          <p className="text-muted-foreground mt-1">Gerencie as notícias rastreadas e as opiniões da IA.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            {syncing ? 'Sincronizando...' : 'Sincronizar RSS'}
          </Button>
          <Link to="/admin/posts/$id" params={{ id: 'new' }}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou categoria..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Carregando notícias...
                </TableCell>
              </TableRow>
            ) : filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum post encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {post.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{post.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(post.created_at || post.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.published ? "default" : "secondary"}>
                      {post.published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Editar */}
                      <Link to="/admin/posts/$id" params={{ id: post.id }}>
                        <Button variant="ghost" size="icon" title="Editar post">
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </Link>

                      {/* Visualizar no blog */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={post.published ? 'Ver no blog' : 'Publique o post para visualizar'}
                        disabled={!post.published}
                        onClick={() => window.open(`/post/${post.slug}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>

                      {/* Ver fonte original */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={post.source?.url ? 'Ver notícia original' : 'Sem fonte cadastrada'}
                        disabled={!post.source?.url}
                        onClick={() => post.source?.url && window.open(post.source.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Button>

                      {/* Mais ações */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Mais ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deletePost(post.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
