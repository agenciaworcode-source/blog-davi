import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container-blog flex h-16 items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-primary transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>
            Feed
          </Link>
          <a href="#categorias" className="hover:text-primary transition-colors">Categorias</a>
          <a href="#newsletter" className="hover:text-primary transition-colors">Newsletter</a>
          <a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
            Consultoria
          </a>
        </nav>
        <a
          href="#newsletter"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] hover:opacity-90 transition"
        >
          Assinar
        </a>
      </div>
    </header>
  );
}
