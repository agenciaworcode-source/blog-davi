import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/blog/Header";
import { Footer } from "@/components/blog/Footer";
import { Newsletter } from "@/components/blog/Newsletter";
import { PostCard } from "@/components/blog/PostCard";
import { SocialBar } from "@/components/blog/SocialIcons";
import { subscribeAction } from "@/lib/server-tasks";
import type { Post } from "@/data/posts";

const COLS = "slug,title,excerpt,category,date,reading_time,source,cover,opinion,body,featured";

async function fetchPublishedPosts() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(
    `${url}/rest/v1/posts?select=${COLS}&published=eq.true&order=date.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) return [];
  return res.json();
}

export const Route = createFileRoute("/")({
  loader: fetchPublishedPosts,
  staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  gcTime: 1000 * 60 * 30, // Guarda em memória por 30 minutos
  head: ({ loaderData }) => {
    const posts = loaderData || [];
    const featured = posts.find((p: any) => p.featured) ?? posts[0];
    return {
      meta: [
        { title: "LFM Insights — Feed de Economia & Mercado" },
        { name: "description", content: "Feed das principais notícias econômicas com a opinião de Luiz Felipe Michelin." },
      ],
      links: featured ? [
        { rel: "preload", as: "image", href: featured.cover, fetchPriority: "high" }
      ] : [],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "LFM Insights",
            "url": "http://localhost:8080", // Idealmente usar BLOG_URL
            "description": "Curadoria diária e opinião sobre as notícias que movem a economia, por Luiz Felipe Michelin.",
            "author": {
              "@type": "Person",
              "name": "Luiz Felipe Michelin"
            }
          })
        }
      ]
    };
  },
  component: Index,
});

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function Index() {
  const posts = Route.useLoaderData();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const featured = posts.find((p: Post) => p.featured) ?? posts[0];
  const rest = posts.filter((p: Post) => p.slug !== featured?.slug);
  const categories: string[] = Array.from(new Set(posts.map((p: Post) => p.category).filter(Boolean)));

  const displayedPosts = selectedCategory
    ? posts.filter((p: Post) => p.category === selectedCategory)
    : posts;

  if (!featured) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container-blog py-32 text-center">
          <p className="font-serif text-2xl text-muted-foreground">Nenhuma análise publicada ainda.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* ── HERO — Newsletter Banner ────────────────────── */}
      <HeroBanner featured={featured} />

      {/* Categorias */}
      <section id="categorias" className="border-y border-border bg-muted/10">
        <div className="container-blog flex flex-wrap items-center gap-x-2 gap-y-2 py-5">
          <span className="mr-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Categorias</span>
          
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-3.5 py-1 text-[12px] font-medium transition cursor-pointer border ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                : "text-foreground/70 bg-muted/60 border-transparent hover:bg-muted hover:text-foreground"
            }`}
          >
            Todas
          </button>

          {categories.map((c: string) => {
            const isSelected = selectedCategory === c;
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(isSelected ? null : c)}
                className={`rounded-full px-3.5 py-1 text-[12px] font-medium transition cursor-pointer border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                    : "text-foreground/70 bg-muted/60 border-transparent hover:bg-muted hover:text-foreground"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feed */}
      <section className="container-blog grid gap-16 py-20 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <div className="mb-10 flex items-end justify-between border-b border-border pb-5">
            <h2 className="font-serif text-2xl text-foreground">
              {selectedCategory ? `Análises em ${selectedCategory}` : "Últimas análises"}
            </h2>
            <span className="text-xs text-muted-foreground">{displayedPosts.length} artigos</span>
          </div>
          
          {displayedPosts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-muted/20">
              <p className="font-serif text-lg text-muted-foreground">Nenhuma análise publicada nesta categoria.</p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2">
              {displayedPosts.map((p: Post) => <PostCard key={p.slug} post={p} />)}
            </div>
          )}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          {/* Sobre o autor */}
          <div className="rounded-2xl bg-muted/50 p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-serif text-sm font-bold text-primary shrink-0">LF</div>
              <div>
                <div className="text-sm font-semibold text-foreground">Luiz Felipe Michelin</div>
                <div className="text-xs text-muted-foreground">Consultor de Investimentos · CVM</div>
              </div>
            </div>
            <h3 className="font-serif text-lg text-foreground">Sobre o autor</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Consultor independente credenciado pela CVM. Aqui ele compartilha
              leituras práticas das notícias econômicas que impactam o seu patrimônio.
            </p>
            <div className="mt-5 flex items-center justify-between">
              <a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer"
                 className="text-sm font-medium text-foreground hover:text-primary transition">
                Consultoria LFM →
              </a>
              <SocialBar size="md" />
            </div>
          </div>

          {/* Mais lidas */}
          <div>
            <h3 className="mb-4 font-serif text-lg text-foreground border-b border-border pb-3">Mais lidas</h3>
            <div>
              {posts.slice(0, 4).map((p: Post) => <PostCard key={p.slug} post={p} variant="compact" />)}
            </div>
          </div>
        </aside>
      </section>

      <Newsletter />
      <Footer />
    </div>
  );
}

// ── HeroBanner ────────────────────────────────────────────────────────────────
function HeroBanner({ featured }: { featured: any }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const result = await (subscribeAction as any)({ data: { email, name } });
      setStatus(result.success ? "ok" : "err");
      if (result.success) {
        setEmail("");
        setName("");
      }
    } catch {
      setStatus("err");
    }
  }

  return (
    <section className="relative overflow-hidden" style={{ minHeight: "420px" }}>
      {/* Background image — capa da notícia em destaque */}
      <div className="absolute inset-0">
        <img
          src={featured.cover}
          alt=""
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
        {/* Overlay: escuro à esquerda, some à direita */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, oklch(0.10 0.005 70 / 0.94) 0%, oklch(0.10 0.005 70 / 0.82) 45%, oklch(0.10 0.005 70 / 0.55) 75%, oklch(0.10 0.005 70 / 0.30) 100%)",
          }}
        />
      </div>

      {/* Conteúdo */}
      <div className="relative container-blog py-16 md:py-20 lg:py-24 max-w-4xl">
        {/* Identidade + link para o destaque */}
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Conheça
          </span>
          <Link
            to="/post/$slug"
            params={{ slug: featured.slug }}
            className="group block mt-3"
          >
            <h1
              className="font-serif leading-[1.03] text-white transition-opacity group-hover:opacity-80"
              style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
            >
              A análise de mercado que{" "}
              <span className="italic" style={{ color: "var(--primary)" }}>
                realmente importa
              </span>{" "}
              nos seus investimentos
            </h1>
          </Link>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            Leia em 5 minutos as principais notícias econômicas com a visão estratégica de Luiz Felipe Michelin.
          </p>

          {/* Formulário de inscrição logo abaixo da headline e descrição */}
          <div className="mt-8 w-full max-w-md">
            {status === "ok" ? (
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-7 py-8 text-center">
                <div
                  className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: "var(--primary)" }}
                >
                  <svg className="h-5 w-5" style={{ color: "var(--primary-foreground)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-serif text-lg text-white">Inscrição confirmada!</p>
                <p className="mt-1 text-sm text-white/60">Verifique sua caixa de entrada.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    {/* Ícone de Usuário */}
                    <svg
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => { setName(e.target.value); if (status !== "idle") setStatus("idle"); }}
                      placeholder="Seu nome..."
                      className="w-full rounded-full border border-white/20 bg-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-sm focus:border-white/50 focus:outline-none transition"
                    />
                  </div>

                  <div className="relative">
                    {/* Ícone envelope */}
                    <svg
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (status !== "idle") setStatus("idle"); }}
                      placeholder="Seu e-mail..."
                      className="w-full rounded-full border border-white/20 bg-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-sm focus:border-white/50 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-full py-3 text-sm font-semibold transition disabled:opacity-60 cursor-pointer"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {status === "loading" ? "Inscrevendo..." : "Inscreva-se"}
                </button>

                <p className="text-center text-[11px] text-white/45">
                  Inscreva-se agora para acompanhar todas as análises
                </p>
                {status === "err" && (
                  <p className="text-center text-xs text-red-400">Erro ao inscrever. Tente novamente.</p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
