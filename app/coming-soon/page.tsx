'use client'
import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'

export default function ComingSoonPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !name.trim()) {
      setMessage({ type: 'error', text: 'Te rog completează ambele câmpuri.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/notify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() })
      })

      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Mulțumim! Te-am adăugat pe lista de notificări.' })
        setEmail('')
        setName('')
      } else {
        setMessage({ type: 'error', text: data.error || 'A apărut o eroare. Te rog încearcă din nou.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare de conexiune. Te rog încearcă din nou.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      <Header />

      <section className="flex-1 bg-ink text-white">
        <div className="max-w-2xl mx-auto px-6 lg:px-12 py-20 text-center flex flex-col justify-center min-h-[60vh]">
          <div className="mb-12">
            <span className="inline-block text-[11px] tracking-[0.14em] uppercase border border-white/20 rounded-full px-4 py-1.5 mb-6 text-white/70">
              În curând
            </span>

            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Pregătim ceva special
            </h1>

            <p className="text-lg text-white/60 leading-relaxed mx-auto mb-8 max-w-md">
              Capsule personalizate construite manual de un stilist pentru tine.
              Fii dintre primii care vor ști când deschidem.
            </p>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
              <input
                type="text"
                placeholder="Numele tău"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-btn bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition"
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Adresa de email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-btn bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-ink rounded-btn py-3 px-6 font-semibold text-sm hover:bg-white/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Se trimite...' : 'Notifică-mă când deschidem'}
              </button>

              {message && (
                <div
                  className={`text-sm py-2 px-3 rounded-btn ${
                    message.type === 'success'
                      ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                      : 'bg-red-500/20 text-red-100 border border-red-500/30'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>
          </div>

          <Link
            href="/"
            className="inline-block text-white/60 hover:text-white transition text-sm"
          >
            ← Înapoi la acasă
          </Link>
        </div>
      </section>

      <footer className="bg-ink text-white border-t border-white/10">
        <div className="max-w-content mx-auto px-6 lg:px-12 py-8">
          <div className="flex col sm:flex-row items-center justify-between gap-5 text-sm text-white/50">
            <p>© 2026 Capsology · Preparând ceva special</p>
            <a href="mailto:idei@97hub.ro" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
