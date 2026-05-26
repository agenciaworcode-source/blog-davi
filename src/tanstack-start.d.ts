/**
 * Declarações de tipo para subpaths do @tanstack/react-start que existem
 * em runtime (resolvidos pelo Vite plugin) mas não têm tipagem publicada
 * nesta versão do pacote.
 */

declare module '@tanstack/react-start/api' {
  export function createAPIFileRoute(
    path: string
  ): (handlers: Record<string, (ctx: { request: Request }) => Response | Promise<Response>>) => {
    path: string
    handlers: Record<string, unknown>
  }
}
