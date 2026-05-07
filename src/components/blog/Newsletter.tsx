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
    <section id="newsletter" className="border-y border-border bg-muted/30">
      <div className="container-blog py-24 text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
          Newsletter semanal
        </span>
        <h2 className="mx-auto mt-5 max-w-2xl font-serif text-4xl md:text-5xl leading-[1.05] text-foreground">
          A leitura de mercado <span className="italic text-muted-foreground">do Luiz</span>,<br className="hidden md:block" /> toda semana no seu e-mail.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-[15px] text-muted-foreground leading-relaxed">
          Curadoria das notícias que importam para a economia, com opinião direta sobre o que muda na sua carteira.
        </p>
        <form onSubmit={submit} className="mx-auto mt-10 flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            placeholder="voce@email.com"
            className="flex-1 rounded-full border border-border bg-background px-5 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none transition"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition"
          >
            Assinar
          </button>
        </form>
        {status === "ok" && <p className="mt-4 text-sm text-foreground">Pronto! Você receberá a próxima edição.</p>}
        {status === "err" && <p className="mt-4 text-sm text-destructive">Informe um e-mail válido.</p>}
        <p className="mx-auto mt-6 max-w-md text-xs text-muted-foreground">
          Sem spam. Cancelamento com um clique.
        </p>
      </div>
    </section>
  );
}
