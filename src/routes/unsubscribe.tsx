import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/blog/Header";
import { Footer } from "@/components/blog/Footer";
import { unsubscribeAction } from "@/lib/server-tasks";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || "",
  }),
  head: () => ({
    meta: [{ title: "Cancelar inscrição — LFM Insights" }],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function handleUnsubscribe() {
    if (!token || status === "loading") return;
    setStatus("loading");
    try {
      const result = await unsubscribeAction({ data: token });
      setStatus(result.success ? "ok" : "err");
      setMessage(result.message);
    } catch {
      setStatus("err");
      setMessage("Ocorreu um erro. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {status === "ok" ? (
            <>
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted mb-6">
                <svg className="h-8 w-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-serif text-3xl text-foreground">Inscrição cancelada</h1>
              <p className="mt-4 text-muted-foreground">{message}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Você não receberá mais e-mails da newsletter LFM Insights.
              </p>
              <Link to="/" className="mt-8 inline-block text-sm font-medium text-foreground underline">
                Voltar ao blog
              </Link>
            </>
          ) : status === "err" ? (
            <>
              <h1 className="font-serif text-3xl text-foreground">Link inválido</h1>
              <p className="mt-4 text-muted-foreground">{message}</p>
              <Link to="/" className="mt-8 inline-block text-sm font-medium text-foreground underline">
                Voltar ao blog
              </Link>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted mb-6">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="font-serif text-3xl text-foreground">Cancelar inscrição</h1>
              <p className="mt-4 text-muted-foreground">
                Tem certeza que deseja parar de receber a newsletter LFM Insights?
              </p>
              {!token && (
                <p className="mt-3 text-sm text-destructive">Link inválido ou expirado.</p>
              )}
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={handleUnsubscribe}
                  disabled={!token || status === "loading"}
                  className="w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition disabled:opacity-50"
                >
                  {status === "loading" ? "Processando..." : "Confirmar cancelamento"}
                </button>
                <Link
                  to="/"
                  className="w-full rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition text-center"
                >
                  Manter inscrição
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
