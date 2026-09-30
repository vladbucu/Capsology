import { NextRequest, NextResponse } from 'next/server'

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: to }],
        sender: {
          name: 'Capsology',
          email: process.env.EMAIL_FROM || 'hello@capsology.ro',
        },
        replyTo: { email: process.env.REPLY_TO_EMAIL || 'idei@97hub.ro' },
        subject,
        htmlContent: html,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Brevo error:', err)
      return { ok: false, error: 'Email delivery failed' }
    }

    return { ok: true }
  } catch (e: any) {
    console.error('sendEmail error:', e?.message || e)
    return { ok: false, error: e?.message || 'Email error' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name } = body

    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Email și nume sunt obligatorii.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Adresa de email nu pare validă.' }, { status: 400 })
    }

    // Send notification email to admin
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px;">Capsology — Notificare nouă</h1>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Nume:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p style="margin-top: 15px; font-size: 14px; color: #666;">
            Persoană interesată de notificări pentru lansarea Capsology.
          </p>
        </div>

        <p style="text-align: center; font-size: 12px; color: #999;">
          Trimis de la www.capsology.ro
        </p>
      </div>
    `

    const adminResult = await sendEmail({
      to: process.env.REPLY_TO_EMAIL || 'idei@97hub.ro',
      subject: `Notificare nouă: ${name}`,
      html,
    })

    if (!adminResult.ok) {
      console.error('Failed to send admin email:', adminResult.error)
      return NextResponse.json({ error: 'Nu am putut trimite email-ul. Încearcă din nou.' }, { status: 500 })
    }

    // Optional: Send confirmation email to user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
          <img src="https://www.capsology.ro/brand/logo/mark-white.svg" alt="Capsology" style="height: 40px; margin-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px;">Mulțumim!</h1>
        </div>

        <div style="padding: 20px; color: #333;">
          <p>Salut, ${name}!</p>
          <p>Te-am adăugat pe lista de notificări. Vei primi un email când deschidem oficial.</p>
          <p style="margin-top: 20px;">Până atunci, poți vedea mai multe pe <a href="https://www.capsology.ro" style="color: #1a1a1a; text-decoration: none; font-weight: bold;">www.capsology.ro</a></p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">
            Capsology — Mai puține alegeri. Mai mult stil.
          </p>
        </div>
      </div>
    `

    await sendEmail({
      to: email,
      subject: 'Te-am adăugat pe lista de notificări — Capsology',
      html: confirmationHtml,
    })

    return NextResponse.json({ ok: true, message: 'Te-ai înscris cu succes!' })
  } catch (e: any) {
    console.error('notify-email error:', e)
    return NextResponse.json({ error: 'Eroare de server.' }, { status: 500 })
  }
}
