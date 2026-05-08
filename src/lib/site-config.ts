/**
 * Singleton fetch para configurações públicas do site (social links, etc.)
 * Busca uma vez por carregamento de página e reutiliza o resultado.
 *
 * ATENÇÃO: requer política RLS de leitura pública na tabela config.
 * Execute no Supabase SQL Editor:
 *   CREATE POLICY config_public_read ON config FOR SELECT USING (true);
 */

export interface SocialLinks {
  instagram?: string
  facebook?: string
  tiktok?: string
  youtube?: string
}

let promise: Promise<SocialLinks> | null = null

export function getSocialLinks(): Promise<SocialLinks> {
  if (!promise) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    promise = fetch(`${url}/rest/v1/config?select=social_links&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then(r => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const links = Array.isArray(data) && data.length > 0
          ? (data[0]?.social_links ?? {})
          : {}
        // Se retornar vazio (política RLS bloqueando), loga aviso
        if (!Object.keys(links).length) {
          console.warn(
            '[site-config] social_links vazio ou inacessível. ' +
            'Execute no Supabase SQL Editor: ' +
            'CREATE POLICY config_public_read ON config FOR SELECT USING (true);'
          )
        }
        return links
      })
      .catch(() => ({}))
  }
  return promise
}

/** Limpa o cache (use após salvar configurações no admin) */
export function resetSiteConfigCache() {
  promise = null
}
