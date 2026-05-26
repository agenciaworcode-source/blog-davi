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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Trash2,
  RefreshCcw,
  Edit,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'
import { syncNewsAction } from '@/lib/server-tasks'

export const Route = createFileRoute('/admin/posts/')(({
  component: AdminPosts,
}))

function AdminPosts() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

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
      setSelected(new Set()) // limpa seleção ao recarregar
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

  async function deleteSelected() {
    if (selected.size === 0) return
    setDeletingBulk(true)
    const ids = Array.from(selected)
    const { error } = await supabase.from('posts').delete().in('id', ids)
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success(`${ids.length} post${ids.length > 1 ? 's' : ''} excluído${ids.length > 1 ? 's' : ''} com sucesso`)
      fetchPosts()
    }
    setDeletingBulk(false)
    setConfirmBulkOpen(false)
  }

  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Seleção
  const allFilteredIds = filteredPosts.map(p => p.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected = allFilteredIds.some(id => selected.has(id)) && !allSelected

  function toggleSelectAll() {
    if (allSelected) {
      // desmarcar todos os visíveis
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // marcar todos os visíveis
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCount = selected.size

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

      {/* Barra de busca + ação em lote */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou categoria..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Barra de ação em lote — aparece quando há selecionados */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-sm font-medium text-foreground">
              {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setConfirmBulkOpen(true)}
              disabled={deletingBulk}
            >
              {deletingBulk
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
              }
              Excluir selecionados
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSelected(new Set())}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox Select All */}
              <TableHead className="w-10 pl-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  disabled={filteredPosts.length === 0}
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : someSelected ? (
                    <Square className="h-4 w-4 text-primary opacity-60" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
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
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Carregando notícias...
                </TableCell>
              </TableRow>
            ) : filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum post encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map((post) => {
                const isSelected = selected.has(post.id)
                return (
                  <TableRow
                    key={post.id}
                    data-selected={isSelected}
                    className="transition-colors data-[selected=true]:bg-primary/5"
                  >
                    {/* Checkbox individual */}
                    <TableCell className="pl-4 w-10">
                      <Checkbox
                        id={`check-${post.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(post.id)}
                        aria-label={`Selecionar post: ${post.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[280px] truncate">
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
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Rodapé da tabela com total */}
        {!loading && filteredPosts.length > 0 && (
          <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selectedCount > 0
                ? `${selectedCount} de ${filteredPosts.length} selecionado${selectedCount > 1 ? 's' : ''}`
                : `${filteredPosts.length} post${filteredPosts.length > 1 ? 's' : ''} encontrado${filteredPosts.length > 1 ? 's' : ''}`
              }
            </span>
            {selectedCount === 0 && (
              <button
                onClick={toggleSelectAll}
                className="hover:text-foreground transition-colors"
              >
                Selecionar todos
              </button>
            )}
          </div>
        )}
      </div>

      {/* Diálogo de confirmação para exclusão em lote */}
      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir {selectedCount} post{selectedCount > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Os {selectedCount} post{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''} serão permanentemente removidos do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBulk}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSelected}
              disabled={deletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBulk
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>
                : <><Trash2 className="mr-2 h-4 w-4" /> Excluir</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
