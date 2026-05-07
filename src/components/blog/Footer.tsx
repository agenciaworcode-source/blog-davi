import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary text-secondary-foreground">
      <div className="container-blog grid gap-10 py-14 md:grid-cols-3">
        <div>
          <Logo className="[&_div.text-muted-foreground]:text-secondary-foreground/60 [&_div.bg-secondary]:bg-primary [&_span]:text-secondary" />
          <p className="mt-4 max-w-sm text-sm text-secondary-foreground/70">
            Análises e opiniões sobre economia e mercado, escritas por Luiz Felipe Michelin —
            consultor independente credenciado pela CVM.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Navegação</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/80">
            <li><a href="/" className="hover:text-primary">Feed</a></li>
            <li><a href="#newsletter" className="hover:text-primary">Newsletter</a></li>
            <li><a href="https://consultorialfm.com.br" target="_blank" rel="noreferrer" className="hover:text-primary">Consultoria LFM</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contato</h4>
          <p className="text-sm text-secondary-foreground/80">
            Luiz Felipe Michelin<br />
            Consultor de Investimentos CVM<br />
            consultorialfm.com.br
          </p>
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10 py-5 text-center text-xs text-secondary-foreground/50">
        © {new Date().getFullYear()} LFM Insights. Conteúdo educativo, não constitui recomendação de investimento.
      </div>
    </footer>
  );
}
