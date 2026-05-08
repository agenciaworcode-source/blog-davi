import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Sparkles,
  Image as ImageIcon,
  Type,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

export const Route = createFileRoute('/admin/posts/$id')({
  component: PostEditor,
})

function PostEditor() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [post, setPost] = useState<any>({
    title: '',
    slug: '',
    excerpt: '',
    category: 'Mercado',
    date: new Date().toISOString().split('T')[0],
    reading_time: '5 min',
    source: { name: '', url: '' },
    cover: '',
    opinion: '',
    body: [''],
    published: false,
    featured: false
  })

  useEffect(() => {
    if (id !== 'new') {
      fetchPost()
    }
  }, [id])

  async function fetchPost() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      toast.error('Erro ao carregar post: ' + error.message)
      navigate({ to: '/admin/posts' })
    } else {
      setPost(data)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    
    // Auto-generate slug if empty
    if (!post.slug) {
      post.slug = post.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
    }

    let error;
    if (id === 'new') {
      // Remove ID for insert to let Postgres generate it
      const { id: _, ...postData } = post;
      const { error: insertError } = await supabase
        .from('posts')
        .insert([postData])
      error = insertError
    } else {
      const { error: updateError } = await supabase
        .from('posts')
        .update(post)
        .eq('id', id)
      error = updateError
    }

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Post salvo com sucesso')
      navigate({ to: '/admin/posts' })
    }
    setSaving(false)
  }

  const updateBody = (index: number, value: string) => {
    const newBody = [...post.body]
    newBody[index] = value
    setPost({ ...post, body: newBody })
  }

  const addParagraph = () => {
    setPost({ ...post, body: [...post.body, ''] })
  }

  const removeParagraph = (index: number) => {
    const newBody = post.body.filter((_: any, i: number) => i !== index)
    setPost({ ...post, body: newBody })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 font-serif text-lg">Carregando editor...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/admin/posts' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              {id === 'new' ? 'Novo Post' : 'Editar Post'}
            </h1>
            <p className="text-muted-foreground text-sm">Redija ou refine a análise econômica.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal: Conteúdo */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-4 w-4 text-primary" />
                Conteúdo da Notícia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Artigo</Label>
                <Input 
                  id="title"
                  value={post.title}
                  onChange={e => setPost({...post, title: e.target.value})}
                  placeholder="Título atraente e direto..."
                  className="text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Resumo (Excerpt)</Label>
                <Textarea 
                  id="excerpt"
                  value={post.excerpt}
                  onChange={e => setPost({...post, excerpt: e.target.value})}
                  placeholder="Breve descrição para o feed..."
                  className="h-20"
                />
              </div>
              
              <div className="space-y-4 pt-4 border-t border-border">
                <Label>Corpo do Artigo (Parágrafos)</Label>
                {post.body.map((p: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Textarea 
                      value={p}
                      onChange={e => updateBody(index, e.target.value)}
                      placeholder={`Parágrafo ${index + 1}...`}
                      className="flex-1 min-h-[100px]"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive shrink-0"
                      onClick={() => removeParagraph(index)}
                      disabled={post.body.length <= 1}
                    >
                      <ArrowLeft className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addParagraph} className="w-full border-dashed">
                  Adicionar Parágrafo
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                Opinião do Luiz (Refino IA)
              </CardTitle>
              <CardDescription>
                Esta é a análise prática que diferencia o blog. O tom deve ser o configurado no painel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={post.opinion}
                onChange={e => setPost({...post, opinion: e.target.value})}
                placeholder="Insira a análise estratégica aqui..."
                className="min-h-[150px] bg-background font-serif text-lg italic"
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Metadados */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status e Visibilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Publicado</Label>
                <Switch 
                  checked={post.published}
                  onCheckedChange={val => setPost({...post, published: val})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Em Destaque</Label>
                <Switch 
                  checked={post.featured}
                  onCheckedChange={val => setPost({...post, featured: val})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input 
                  value={post.category}
                  onChange={e => setPost({...post, category: e.target.value})}
                  placeholder="Ex: Política Monetária"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug da URL</Label>
                <Input 
                  value={post.slug}
                  onChange={e => setPost({...post, slug: e.target.value})}
                  placeholder="slug-do-post"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Publicação</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    value={post.date}
                    onChange={e => setPost({...post, date: e.target.value})}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tempo de Leitura</Label>
                <Input 
                  value={post.reading_time}
                  onChange={e => setPost({...post, reading_time: e.target.value})}
                  placeholder="5 min"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="h-4 w-4" /> Capa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                value={post.cover}
                onChange={e => setPost({...post, cover: e.target.value})}
                placeholder="URL da imagem..."
              />
              {post.cover && (
                <div className="aspect-video rounded-md overflow-hidden bg-muted">
                  <img src={post.cover} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fonte Original</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Veículo</Label>
                <Input 
                  value={post.source?.name}
                  onChange={e => setPost({...post, source: {...post.source, name: e.target.value}})}
                  placeholder="Ex: Valor Econômico"
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Fonte</Label>
                <Input 
                  value={post.source?.url}
                  onChange={e => setPost({...post, source: {...post.source, url: e.target.value}})}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
