import { useState } from "react";
import { subscribeAction } from "@/lib/server-tasks";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const result = await subscribeAction({ data: { email, name: name || undefined } });
      if (result.success) {
        setStatus("ok");
        setMessage(result.message);
        setEmail("");
        setName("");
      } else {
        setStatus("err");
        setMessage(result.message);
      }
    } catch {
      setStatus("err");
      setMessage("Ocorreu um erro. Tente novamente.");
    }
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

        {status === "ok" ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background px-8 py-8">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-serif text-xl text-foreground">{message}</p>
            <p className="mt-2 text-sm text-muted-foreground">Verifique sua caixa de entrada.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-10 w-full max-w-md space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome (opcional)"
              className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none transition"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status !== "idle") setStatus("idle"); }}
                placeholder="voce@email.com"
                className="flex-1 rounded-full border border-border bg-background px-5 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition disabled:opacity-60"
              >
                {status === "loading" ? "Inscrevendo..." : "Assinar"}
              </button>
            </div>
            {status === "err" && <p className="pt-1 text-sm text-destructive">{message}</p>}
          </form>
        )}

        <p className="mx-auto mt-6 max-w-md text-xs text-muted-foreground">
          Sem spam. Cancelamento com um clique.
        </p>
      </div>
    </section>
  );
}
