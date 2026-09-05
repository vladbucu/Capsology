// ─── Email transacțional prin Brevo ──────────────────────────
// Un singur helper folosit de rutele server. Nu aruncă — apelanții
// tratează eșecul ca non-fatal (logat, dar fluxul continuă).

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

type SendArgs = {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('sendEmail: BREVO_API_KEY lipsește')
    return { ok: false, error: 'missing_api_key' }
  }

  const fromEmail = process.env.EMAIL_FROM || 'hello@capsology.ro'
  // hello@capsology.ro e doar o "masca" de expeditor (nu are casuta reala).
  // Raspunsurile clientilor merg spre inboxul real, setat in REPLY_TO_EMAIL.
  const replyToEmail = replyTo || process.env.REPLY_TO_EMAIL || undefined

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Capsology', email: fromEmail },
        to: [{ email: to }],
        ...(replyToEmail ? { replyTo: { email: replyToEmail } } : {}),
        subject,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('sendEmail: Brevo a răspuns', res.status, body.slice(0, 500))
      return { ok: false, error: `brevo_${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('sendEmail: excepție', e?.message || e)
    return { ok: false, error: 'exception' }
  }
}

// ─── Șablon: link de acces la capsulă ────────────────────────
export function accessLinkEmail(opts: {
  firstName?: string
  actionLink: string
  capsuleTitle?: string
}): string {
  const hi = opts.firstName ? `Salut ${opts.firstName},` : 'Salut,'
  const title = opts.capsuleTitle ? `„${opts.capsuleTitle}"` : 'ta'
  return `
  <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1c1917;">
    <h1 style="font-size: 26px; font-weight: 400; margin: 0 0 16px;">Capsula ${title} este gata.</h1>
    <p style="color: #57534e; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">${hi}</p>
    <p style="color: #57534e; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Am pregătit selecția ta. Deschide-o din linkul de mai jos — la prima accesare
      îți alegi un PIN de 4 cifre cu care intri rapid data viitoare.
    </p>
    <a href="${opts.actionLink}"
       style="display: inline-block; padding: 14px 28px; background: #1c1917; color: #ffffff;
              text-decoration: none; border-radius: 8px; font-size: 15px; font-family: -apple-system, Helvetica, Arial, sans-serif;">
      Vezi capsula mea
    </a>
    <p style="margin-top: 28px; font-size: 13px; color: #a8a29e; line-height: 1.6;">
      Linkul e valabil o singură dată și expiră în câteva ore. Dacă a expirat,
      cere unul nou de la pagina de autentificare.
    </p>
    <p style="margin-top: 24px; font-size: 12px; color: #a8a29e;">
      Ai primit acest email pentru că ai cerut o capsulă pe capsology.ro
    </p>
  </div>`
}
