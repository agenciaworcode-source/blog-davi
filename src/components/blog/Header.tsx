import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container-blog flex h-14 items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>
            Feed
          </Link>
          <a href="#categorias" className="hover:text-foreground transition-colors">Categorias</a>
          <a href="#newsletter" className="hover:text-foreground transition-colors">Newsletter</a>
          <a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
            Consultoria
          </a>
        </nav>
        <a
          href="#newsletter"
          className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-1.5 text-[13px] font-medium text-foreground hover:bg-foreground hover:text-background transition"
        >
          Assinar
        </a>
      </div>
    </header>
  );
}
