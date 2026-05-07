import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="container-blog grid gap-10 py-16 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
            Análises e opiniões sobre economia e mercado, escritas por Luiz Felipe Michelin —
            consultor independente credenciado pela CVM.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Navegação</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="text-foreground/80 hover:text-foreground">Feed</a></li>
            <li><a href="#newsletter" className="text-foreground/80 hover:text-foreground">Newsletter</a></li>
            <li><a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-foreground">Consultoria LFM</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Contato</h4>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Luiz Felipe Michelin<br />
            Consultor de Investimentos CVM<br />
            consultorialfm.com.br
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LFM Insights. Conteúdo educativo, não constitui recomendação de investimento.
      </div>
    </footer>
  );
}
