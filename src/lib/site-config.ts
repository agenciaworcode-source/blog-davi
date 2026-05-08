/**
 * Singleton fetch para configurações públicas do site (social links, etc.)
 * Busca uma vez por carregamento de página e reutiliza o resultado.
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
      .then(data => (Array.isArray(data) ? (data[0]?.social_links ?? {}) : {}))
      .catch(() => ({}))
  }
  return promise
}
