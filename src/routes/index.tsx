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
      <section className="relative">
        <div className="container-blog grid gap-12 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              <span className="text-primary">Em destaque</span>
              <span className="h-px w-8 bg-border" />
              <span>{featured.category} · {fmt(featured.date)}</span>
            </div>
            <Link to="/post/$slug" params={{ slug: featured.slug }} className="group block">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-[3.75rem] leading-[1.02] text-foreground group-hover:text-foreground/70 transition">
                {featured.title}
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground">{featured.excerpt}</p>
            </Link>
            <div className="mt-8 flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-serif text-xs font-medium text-foreground">LF</div>
              <div className="leading-tight">
                <div className="text-[13px] font-medium text-foreground">Luiz Felipe Michelin</div>
                <div className="text-xs text-muted-foreground">Consultor de Investimentos · CVM</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <Link to="/post/$slug" params={{ slug: featured.slug }}>
              <div className="overflow-hidden rounded-2xl bg-muted">
                <img src={featured.cover} alt={featured.title} className="h-full w-full object-cover aspect-[4/5] transition duration-700 hover:scale-[1.02]" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section id="categorias" className="border-y border-border">
        <div className="container-blog flex flex-wrap items-center gap-x-2 gap-y-2 py-5">
          <span className="mr-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Categorias</span>
          {categories.map((c) => (
            <span key={c} className="rounded-full px-3 py-1 text-[12px] text-foreground/70 hover:bg-muted hover:text-foreground transition cursor-pointer">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Feed */}
      <section className="container-blog grid gap-16 py-20 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <div className="mb-10 flex items-end justify-between border-b border-border pb-5">
            <h2 className="font-serif text-2xl text-foreground">Últimas análises</h2>
            <span className="text-xs text-muted-foreground">{rest.length} artigos</span>
          </div>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2">
            {rest.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </div>

        <aside className="space-y-12">
          <div className="rounded-2xl bg-muted/50 p-7">
            <h3 className="font-serif text-lg text-foreground">Sobre o autor</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Luiz Felipe Michelin é consultor independente credenciado pela CVM. Aqui ele compartilha
              leituras práticas das notícias econômicas que impactam o seu patrimônio.
            </p>
            <a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer"
               className="mt-5 inline-flex items-center text-sm font-medium text-foreground hover:text-primary transition">
              Conhecer a Consultoria LFM →
            </a>
          </div>
          <div>
            <h3 className="mb-2 font-serif text-lg text-foreground">Mais lidas</h3>
            <div>
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
