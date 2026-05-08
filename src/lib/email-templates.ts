/**
 * Templates HTML para e-mails da newsletter LFM Insights
 * Estilo: minimalista, tipografia serif, paleta neutra
 */

const BASE_URL = process.env.BLOG_URL || 'https://lfminsights.com.br'

const css = `
  body { margin: 0; padding: 0; background: #f5f4f0; font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; }
  .wrap { max-width: 620px; margin: 40px auto; background: #ffffff; border: 1px solid #e5e3dc; }
  .header { padding: 36px 48px 28px; border-bottom: 1px solid #e5e3dc; }
  .logo { font-size: 13px; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #1a1a1a; text-decoration: none; }
  .logo span { color: #8b7355; }
  .body { padding: 40px 48px; }
  .footer { padding: 24px 48px; border-top: 1px solid #e5e3dc; background: #faf9f6; }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 16px; font-weight: normal; }
  h2 { font-size: 20px; line-height: 1.25; margin: 32px 0 8px; font-weight: normal; }
  p { font-size: 16px; line-height: 1.7; margin: 0 0 16px; color: #3a3a3a; }
  .meta { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #8b7355; margin: 0 0 8px; }
  .excerpt { font-size: 15px; color: #5a5a5a; line-height: 1.6; margin: 0 0 12px; }
  .opinion { background: #faf9f6; border-left: 3px solid #8b7355; padding: 16px 20px; margin: 12px 0 20px; font-style: italic; font-size: 15px; color: #2a2a2a; line-height: 1.6; }
  .btn { display: inline-block; background: #1a1a1a; color: #ffffff !important; text-decoration: none; padding: 10px 22px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
  .divider { border: none; border-top: 1px solid #e5e3dc; margin: 28px 0; }
  .footer-text { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #8a8a8a; line-height: 1.6; margin: 0; }
  a { color: #8b7355; }
  @media (max-width: 640px) { .wrap { margin: 0; } .header, .body, .footer { padding-left: 24px; padding-right: 24px; } h1 { font-size: 22px; } }
`

function layout(content: string, unsubscribeUrl: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <a href="${BASE_URL}" class="logo">LFM <span>Insights</span></a>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p class="footer-text">
        Você recebe este e-mail porque se inscreveu em <a href="${BASE_URL}">LFM Insights</a>.<br />
        <a href="${unsubscribeUrl}" style="color:#8a8a8a;">Cancelar inscrição</a> &nbsp;·&nbsp;
        Luiz Felipe Michelin — Consultor CVM
      </p>
    </div>
  </div>
</body>
</html>`
}

// ── Boas-vindas ───────────────────────────────────────────────────────────────

export function welcomeEmail(email: string, unsubscribeToken: string) {
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?token=${unsubscribeToken}`

  const content = `
    <p class="meta">Bem-vindo à newsletter</p>
    <h1>Sua leitura de mercado chega toda semana.</h1>
    <p>
      Obrigado por se inscrever no <strong>LFM Insights</strong>. A partir de agora você vai receber
      análises diretas das notícias econômicas que impactam o seu patrimônio — com a minha visão
      prática sobre o que ajustar na carteira.
    </p>
    <p>
      Sem jargão. Sem enrolação. Só o que importa para quem investe pensando no longo prazo.
    </p>
    <div class="opinion">
      "O objetivo aqui é simples: ajudar você a tomar decisões melhores com o seu dinheiro, com
      base em análise econômica séria e independente."
      <br /><br />— Luiz Felipe Michelin, Consultor CVM
    </div>
    <a href="${BASE_URL}" class="btn">Ver últimas análises</a>
  `

  return {
    subject: 'Bem-vindo ao LFM Insights — sua leitura de mercado começa agora',
    html: layout(content, unsubscribeUrl),
  }
}

// ── Digest de newsletter ──────────────────────────────────────────────────────

export interface NewsletterPost {
  title: string
  slug: string
  category: string
  excerpt: string
  opinion: string
  reading_time: string
}

export function newsletterDigest(
  posts: NewsletterPost[],
  subject: string,
  editorial: string,
  unsubscribeToken: string,
) {
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?token=${unsubscribeToken}`
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const postsHtml = posts.map((p) => `
    <div>
      <p class="meta">${p.category} · ${p.reading_time} de leitura</p>
      <h2><a href="${BASE_URL}/post/${p.slug}" style="color:#1a1a1a;text-decoration:none;">${p.title}</a></h2>
      <p class="excerpt">${p.excerpt}</p>
      <div class="opinion">"${p.opinion}"</div>
      <a href="${BASE_URL}/post/${p.slug}" class="btn">Ler análise completa</a>
      <hr class="divider" />
    </div>
  `).join('')

  const content = `
    <p class="meta">Newsletter LFM Insights · ${date}</p>
    <h1>${subject}</h1>
    ${editorial ? `<p>${editorial}</p><hr class="divider" />` : ''}
    ${postsHtml}
  `

  return {
    subject,
    html: layout(content, unsubscribeUrl),
  }
}
