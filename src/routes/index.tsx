import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/blog/Header";
import { Footer } from "@/components/blog/Footer";
import { Newsletter } from "@/components/blog/Newsletter";
import { PostCard } from "@/components/blog/PostCard";
import { posts } from "@/data/posts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LFM Insights — Feed de Economia & Mercado" },
      { name: "description", content: "Feed das principais notícias econômicas com a opinião de Luiz Felipe Michelin." },
    ],
  }),
  component: Index,
});

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function Index() {
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured.slug);
  const categories = Array.from(new Set(posts.map((p) => p.category)));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* HERO / Featured */}
      <section className="relative border-b border-border">
        <div className="container-blog grid gap-10 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-7">
            <div className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
              <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">Em destaque</span>
              <span className="text-muted-foreground">{featured.category} · {fmt(featured.date)}</span>
            </div>
            <Link to="/post/$slug" params={{ slug: featured.slug }} className="group block">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] group-hover:text-primary transition">
                {featured.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{featured.excerpt}</p>
            </Link>
            <div className="mt-6 flex items-center gap-4 text-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-serif text-sm font-bold text-primary">LF</div>
              <div>
                <div className="font-medium">Luiz Felipe Michelin</div>
                <div className="text-xs text-muted-foreground">Consultor de Investimentos · CVM</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <Link to="/post/$slug" params={{ slug: featured.slug }}>
              <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-elegant)]">
                <img src={featured.cover} alt={featured.title} className="h-full w-full object-cover aspect-[4/3]" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section id="categorias" className="border-b border-border bg-muted/40">
        <div className="container-blog flex flex-wrap items-center gap-2 py-4">
          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Categorias:</span>
          {categories.map((c) => (
            <span key={c} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary transition cursor-pointer">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Feed */}
      <section className="container-blog grid gap-12 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-3xl font-semibold">Últimas análises</h2>
              <p className="mt-1 text-sm text-muted-foreground">Notícias selecionadas e comentadas pela LFM.</p>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {rest.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </div>

        <aside className="space-y-10">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-serif text-xl font-semibold">Sobre o autor</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Luiz Felipe Michelin é consultor independente credenciado pela CVM. Aqui ele compartilha
              leituras práticas das notícias econômicas que impactam o seu patrimônio.
            </p>
            <a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer"
               className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition">
              Conhecer a Consultoria LFM
            </a>
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold">Mais lidas</h3>
            <div className="mt-2">
              {posts.slice(0, 4).map((p) => <PostCard key={p.slug} post={p} variant="compact" />)}
            </div>
          </div>
        </aside>
      </section>

      <Newsletter />
      <Footer />
    </div>
  );
}
