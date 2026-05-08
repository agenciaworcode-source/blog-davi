import { useEffect } from 'react'
import { getThemeConfig, applyThemeToDOM, DEFAULT_SITE_THEME } from '@/lib/theme-config'

/**
 * Componente sem UI que aplica o tema salvo no banco ao DOM via CSS custom properties.
 * Deve ser montado uma vez na raiz da aplicação.
 */
export function ThemeApplier() {
  useEffect(() => {
    getThemeConfig().then((cfg) => {
      applyThemeToDOM(cfg?.site ?? DEFAULT_SITE_THEME)
    })
  }, [])

  return null
}
