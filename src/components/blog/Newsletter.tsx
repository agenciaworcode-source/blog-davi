import { useState } from "react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("err");
      return;
    }
    setStatus("ok");
    setEmail("");
  }

  return (
    <section id="newsletter" className="relative overflow-hidden bg-secondary text-secondary-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(800px 400px at 80% 0%, var(--gold) 0%, transparent 60%)" }} />
      <div className="container-blog relative grid gap-10 py-20 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-block rounded-full border border-primary/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            Newsletter Semanal
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-serif font-semibold leading-[1.05]">
            A leitura de mercado <span className="text-primary italic">do Luiz</span>, toda semana no seu e-mail.
          </h2>
          <p className="mt-4 max-w-md text-secondary-foreground/70">
            Curadoria das notícias que importam para a economia, com opinião direta e prática
            sobre o que muda na sua carteira.
          </p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/[0.04] p-6 backdrop-blur-sm">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Seu melhor e-mail</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
              placeholder="voce@email.com"
              className="flex-1 rounded-md border border-secondary-foreground/15 bg-secondary px-4 py-3 text-sm text-secondary-foreground placeholder:text-secondary-foreground/40 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] hover:opacity-90"
            >
              Assinar grátis
            </button>
          </div>
          {status === "ok" && <p className="mt-3 text-sm text-primary">Pronto! Você receberá a próxima edição.</p>}
          {status === "err" && <p className="mt-3 text-sm text-destructive">Informe um e-mail válido.</p>}
          <p className="mt-4 text-xs text-secondary-foreground/50">
            Sem spam. Cancelamento com um clique. Conteúdo educativo, sem recomendação de investimento.
          </p>
        </form>
      </div>
    </section>
  );
}
