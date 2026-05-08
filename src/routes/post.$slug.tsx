import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/blog/Header";
import { Footer } from "@/components/blog/Footer";
import { Newsletter } from "@/components/blog/Newsletter";
import { PostCard } from "@/components/blog/PostCard";

const COLS = "slug,title,excerpt,category,date,reading_time,source,cover,opinion,body,featured";

async function supabaseGet(path: string) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.ok ? res.json() : null;
}

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const slug = encodeURIComponent(params.slug);
    const [postArr, related] = await Promise.all([
      supabaseGet(`posts?select=${COLS}&slug=eq.${slug}&published=eq.true&limit=1`),
      supabaseGet(`posts?select=${COLS}&published=eq.true&slug=neq.${slug}&order=date.desc&limit=3`),
    ]);
    const post = Array.isArray(postArr) ? postArr[0] : null;
    if (!post) throw notFound();
    return { post, related: related ?? [] };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.post.title} — LFM Insights` },
          { name: "description", content: loaderData.post.excerpt },
          { property: "og:title", content: loaderData.post.title },
          { property: "og:description", content: loaderData.post.excerpt },
          { property: "og:image", content: loaderData.post.cover },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container-blog py-32 text-center">
        <h1 className="font-serif text-4xl">Artigo não encontrado</h1>
        <Link to="/" className="mt-6 inline-block text-primary underline">Voltar ao feed</Link>
      </div>
      <Footer />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container-blog py-20"><p>{error.message}</p></div>
  ),
  component: PostPage,
});

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function PostPage() {
  const { post, related } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <article>
        {/* Hero */}
        <header className="border-b border-border">
          <div className="container-blog max-w-3xl pt-14 pb-10">
            <Link to="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:underline">
              ← Feed
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">{post.category}</span>
              <span className="text-muted-foreground">{fmt(post.date)} · {post.reading_time} de leitura</span>
            </div>
            <h1 className="mt-5 font-serif text-4xl md:text-5xl font-semibold leading-[1.05]">
              {post.title}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">{post.excerpt}</p>
            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-serif text-sm font-bold text-primary">LF</div>
                <div>
                  <div className="text-sm font-semibold">Luiz Felipe Michelin</div>
                  <div className="text-xs text-muted-foreground">Consultor de Investimentos · CVM</div>
                </div>
              </div>
              <a href={post.source?.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                Fonte: <span className="underline">{post.source?.name}</span>
              </a>
            </div>
          </div>
        </header>

        {/* Cover */}
        <div className="container-blog max-w-5xl -mt-2">
          <img src={post.cover} alt={post.title} className="aspect-[16/8] w-full rounded-2xl object-cover shadow-[var(--shadow-elegant)]" />
        </div>

        {/* Body */}
        <div className="container-blog max-w-3xl py-14">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">A notícia</h2>
          <div className="mt-4 space-y-5 text-lg leading-relaxed text-foreground/90">
            {post.body.map((p: string, i: number) =>
              p.startsWith('<')
                ? <div key={i} dangerouslySetInnerHTML={{ __html: p }} className="[&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_p]:mb-4 [&_strong]:font-semibold [&_em]:italic [&_hr]:border-border [&_hr]:my-6" />
                : <p key={i}>{p}</p>
            )}
          </div>

          {/* Opinion block */}
          <aside className="relative mt-14 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-[var(--gold-soft)] to-background p-8 md:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-serif text-sm font-bold text-primary">LF</div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Opinião do Luiz</div>
                <div className="text-xs text-muted-foreground">Leitura prática para a sua carteira</div>
              </div>
            </div>
            <p className="mt-5 font-serif text-xl md:text-2xl leading-snug text-foreground italic">
              "{post.opinion}"
            </p>
          </aside>

          <div className="mt-12 rounded-xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground">
            <strong className="text-foreground">Aviso:</strong> conteúdo de caráter educativo. Não constitui
            recomendação ou oferta de investimento.
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-muted/30">
          <div className="container-blog py-16">
            <h2 className="font-serif text-2xl font-semibold">Continue lendo</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {related.map((p: any) => <PostCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}

      <Newsletter />
      <Footer />
    </div>
  );
}
