import { Link } from "@tanstack/react-router";
import type { Post } from "@/data/posts";

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function PostCard({ post, variant = "default" }: { post: Post; variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <Link to="/post/$slug" params={{ slug: post.slug }} className="group flex gap-4 py-5 border-b border-border last:border-0">
        <img src={post.cover} alt="" width={64} height={64} className="h-16 w-16 flex-none rounded-lg object-cover" loading="lazy" />
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{post.category}</div>
          <h3 className="mt-1.5 line-clamp-2 font-serif text-base leading-snug text-foreground group-hover:text-foreground/70 transition">
            {post.title}
          </h3>
          <div className="mt-2 text-xs text-muted-foreground">{fmt(post.date)}</div>
        </div>
      </Link>
    );
  }
  return (
    <Link to="/post/$slug" params={{ slug: post.slug }} className="group block">
      <div className="overflow-hidden rounded-2xl bg-background">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          <img src={post.cover} alt={post.title} width={400} height={300} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
        </div>
        <div className="pt-5">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span>{post.category}</span><span>·</span>
            <span>{fmt(post.date)}</span>
          </div>
          <h3 className="mt-3 font-serif text-xl leading-snug text-foreground group-hover:text-foreground/70 transition">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
          <div className="mt-4 text-xs text-muted-foreground">
            {post.reading_time} de leitura
          </div>
        </div>
      </div>
    </Link>
  );
}
