import { Link } from "@tanstack/react-router";
import type { Post } from "@/data/posts";

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function PostCard({ post, variant = "default" }: { post: Post; variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <Link to="/post/$slug" params={{ slug: post.slug }} className="group flex gap-4 py-5 border-b border-border last:border-0">
        <img src={post.cover} alt="" className="h-20 w-28 flex-none rounded-md object-cover" loading="lazy" />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{post.category}</div>
          <h3 className="mt-1 line-clamp-2 font-serif text-lg leading-snug group-hover:text-primary transition">
            {post.title}
          </h3>
          <div className="mt-2 text-xs text-muted-foreground">{fmt(post.date)} · {post.readingTime}</div>
        </div>
      </Link>
    );
  }
  return (
    <Link to="/post/$slug" params={{ slug: post.slug }} className="group block">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-[var(--shadow-elegant)]">
        <div className="aspect-[16/10] overflow-hidden">
          <img src={post.cover} alt={post.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span>{post.category}</span><span className="text-border">•</span>
            <span className="text-muted-foreground">{fmt(post.date)}</span>
          </div>
          <h3 className="mt-3 font-serif text-2xl leading-tight group-hover:text-primary transition">
            {post.title}
          </h3>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{post.readingTime} de leitura</span>
            <span className="font-medium text-foreground group-hover:text-primary transition">Ler análise →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
