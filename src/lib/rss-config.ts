/**
 * rss-config.ts
 * Constantes de configuração RSS — seguro para importar no cliente e servidor.
 * Não importa nenhum módulo Node.js.
 */

export const DEFAULT_RSS_FEEDS = [
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
    name: 'Agência Brasil — Economia',
  },
  {
    url: 'https://g1.globo.com/rss/g1/economia/',
    name: 'G1 Economia',
  },
  {
    url: 'https://www.infomoney.com.br/feed/',
    name: 'InfoMoney',
  },
  {
    url: 'https://exame.com/feed/',
    name: 'Exame',
  },
]

export const SYNC_SCHEDULE = {
  morning: '0 10 * * *', // 07:00 BRT
  midday:  '0 15 * * *', // 12:00 BRT
  evening: '0 21 * * *', // 18:00 BRT
}
