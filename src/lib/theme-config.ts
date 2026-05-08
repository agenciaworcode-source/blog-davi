/**
 * Configuração de aparência (tema) do site.
 * Busca do Supabase uma vez por carregamento e aplica CSS variables + Google Fonts ao DOM.
 */

import type { SiteTheme, ThemeConfig } from './server-tasks'

// ── Pares de fontes disponíveis ───────────────────────────────────────────────

export interface FontPair {
  id: string
  label: string
  description: string
  serif: string
  sans: string
  url: string
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'playfair-inter',
    label: 'Playfair + Inter',
    description: 'Editorial clássico',
    serif: 'Playfair Display',
    sans: 'Inter',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    id: 'merriweather-source',
    label: 'Merriweather + Source Sans',
    description: 'Tom jornalístico',
    serif: 'Merriweather',
    sans: 'Source Sans 3',
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  {
    id: 'lora-nunito',
    label: 'Lora + Nunito',
    description: 'Quente e acessível',
    serif: 'Lora',
    sans: 'Nunito',
    url: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,400&family=Nunito:wght@400;500;600&display=swap',
  },
  {
    id: 'garamond-raleway',
    label: 'EB Garamond + Raleway',
    description: 'Elegância clássica',
    serif: 'EB Garamond',
    sans: 'Raleway',
    url: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Raleway:wght@400;500;600&display=swap',
  },
  {
    id: 'baskerville-opensans',
    label: 'Libre Baskerville + Open Sans',
    description: 'Tradicional e legível',
    serif: 'Libre Baskerville',
    sans: 'Open Sans',
    url: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;500;600&display=swap',
  },
  {
    id: 'cormorant-jost',
    label: 'Cormorant + Jost',
    description: 'Luxuoso e moderno',
    serif: 'Cormorant Garamond',
    sans: 'Jost',
    url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@400;500;600&display=swap',
  },
]

// ── Predefinições de cor primária ─────────────────────────────────────────────

export const COLOR_PRESETS = [
  { label: 'Dourado', hex: '#c9a96e', description: 'Padrão atual' },
  { label: 'Bronze', hex: '#b5651d', description: 'Terra cálida' },
  { label: 'Safira', hex: '#2563eb', description: 'Azul confiante' },
  { label: 'Esmeralda', hex: '#059669', description: 'Verde mercado' },
  { label: 'Vinho', hex: '#9d174d', description: 'Profundo' },
  { label: 'Grafite', hex: '#4b5563', description: 'Neutro elegante' },
]

// ── Predefinições de fundo ────────────────────────────────────────────────────

export const BG_PRESETS = [
  { label: 'Creme', hex: '#fefdf8', description: 'Padrão atual' },
  { label: 'Branco', hex: '#ffffff', description: 'Limpo' },
  { label: 'Bege', hex: '#f5f0e8', description: 'Papel envelhecido' },
  { label: 'Cinza', hex: '#f9fafb', description: 'Moderno' },
]

// ── Predefinições de raio de borda ────────────────────────────────────────────

export const RADIUS_PRESETS = [
  { label: 'Quadrado', value: '0rem' },
  { label: 'Suave', value: '0.5rem' },
  { label: 'Arredondado', value: '0.75rem' },
  { label: 'Fluido', value: '1.25rem' },
]

// ── Predefinições de cor de destaque do e-mail ────────────────────────────────

export const EMAIL_ACCENT_PRESETS = [
  { label: 'Cobre', hex: '#8b7355' },
  { label: 'Dourado', hex: '#c9a96e' },
  { label: 'Safira', hex: '#2563eb' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Vinho', hex: '#9d174d' },
  { label: 'Grafite', hex: '#4b5563' },
]

// ── Valores padrão ────────────────────────────────────────────────────────────

export const DEFAULT_SITE_THEME: SiteTheme = {
  font_pair_id: 'playfair-inter',
  font_serif: 'Playfair Display',
  font_sans: 'Inter',
  primary_hex: '#c9a96e',
  background_hex: '#fefdf8',
  radius: '0.75rem',
}

// ── Aplicar tema ao DOM ───────────────────────────────────────────────────────

export function applyThemeToDOM(theme: SiteTheme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--primary', theme.primary_hex)
  root.style.setProperty('--ring', theme.primary_hex)
  root.style.setProperty('--gold', theme.primary_hex)
  root.style.setProperty('--background', theme.background_hex)
  root.style.setProperty('--radius', theme.radius)

  const pair = FONT_PAIRS.find(p => p.id === theme.font_pair_id)
  if (pair) {
    root.style.setProperty('--font-serif', `"${pair.serif}", Georgia, serif`)
    root.style.setProperty('--font-sans', `"${pair.sans}", system-ui, sans-serif`)

    // Inject Google Fonts link dynamically
    const existingLink = document.getElementById('dynamic-theme-fonts') as HTMLLinkElement | null
    if (existingLink) {
      existingLink.href = pair.url
    } else {
      const link = document.createElement('link')
      link.id = 'dynamic-theme-fonts'
      link.rel = 'stylesheet'
      link.href = pair.url
      document.head.appendChild(link)
    }
  }
}

// ── Singleton fetch ───────────────────────────────────────────────────────────

let promise: Promise<ThemeConfig | null> | null = null

export function getThemeConfig(): Promise<ThemeConfig | null> {
  if (!promise) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    promise = fetch(`${url}/rest/v1/config?select=theme&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then(r => (r.ok ? r.json() : []))
      .then((data: any[]) =>
        Array.isArray(data) && data.length > 0 ? data[0]?.theme ?? null : null
      )
      .catch(() => null)
  }
  return promise
}

export function resetThemeCache() {
  promise = null
}
