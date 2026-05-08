/**
 * Resend client — envio de e-mails transacionais e newsletter
 */
import { Resend } from 'resend'

export function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY não configurada')
  return new Resend(key)
}

const FROM = 'LFM Insights <newsletter@consultorialfm.com.br>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  const resend = getResend()
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
  return data
}

// Resend permite até 100 destinatários por lote via batch
export async function sendBatch(
  recipients: { email: string; token: string }[],
  buildEmail: (token: string) => { subject: string; html: string },
) {
  const resend = getResend()

  // Divide em lotes de 100 (limite da API)
  const chunks: typeof recipients[] = []
  for (let i = 0; i < recipients.length; i += 100) {
    chunks.push(recipients.slice(i, i + 100))
  }

  let sent = 0
  for (const chunk of chunks) {
    const batch = chunk.map(({ email, token }) => {
      const { subject, html } = buildEmail(token)
      return { from: FROM, to: email, subject, html }
    })
    const { error } = await resend.batch.send(batch)
    if (error) throw new Error(error.message)
    sent += chunk.length
  }

  return sent
}
