'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'

function SetPinInner() {
  const router   = useRouter()
  const supabase = createClient()

  const [ready, setReady]   = useState(false)
  const [email, setEmail]   = useState('')
  const [pin, setPin]       = useState('')
  const [pin2, setPin2]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Magic link-ul stabileste sesiunea in URL (detectSessionInUrl e activ implicit).
  useEffect(() => {
    let tries = 0
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setEmail(session.user.email || '')
        setReady(true)
        return
      }
      if (++tries > 20) { router.replace('/auth/login?redirect=/seteaza-pin'); return }
      setTimeout(check, 250)
    }
    check()
  }, [])

  const clean = (v: string) => v.replace(/\D/g, '').slice(0, 4)

  const submit = async () => {
    setError('')
    if (!/^\d{4}$/.test(pin)) { setError('PIN-ul trebuie să aibă 4 cifre.'); return }
    if (pin !== pin2)         { setError('Cele două PIN-uri nu se potrivesc.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare')
      router.replace('/garderoba')
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (!ready) return (
    <div className="min-h-screen bg-warm-white"><Header />
      <div className="py-32 text-center text-ink/40 text-sm animate-pulse">Se pregătește contul…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <div className="max-w-sm mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-2">Setează-ți un PIN</h1>
        <p className="text-sm text-ink/55 mb-8">
          4 cifre. Cu ele intri rapid data viitoare, folosind emailul <strong>{email}</strong>.
        </p>

        <label className="block mb-4">
          <span className="text-xs font-medium text-ink/70 mb-1.5 block">PIN nou</span>
          <input value={pin} onChange={e => setPin(clean(e.target.value))}
            inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••"
            className="w-full px-3 py-2.5 rounded-btn border border-border-line bg-white text-lg tracking-[0.5em] text-center focus:outline-none focus:border-ink transition" />
        </label>

        <label className="block mb-5">
          <span className="text-xs font-medium text-ink/70 mb-1.5 block">Confirmă PIN-ul</span>
          <input value={pin2} onChange={e => setPin2(clean(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••"
            className="w-full px-3 py-2.5 rounded-btn border border-border-line bg-white text-lg tracking-[0.5em] text-center focus:outline-none focus:border-ink transition" />
        </label>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-card px-4 py-2.5 mb-4 text-sm">
            {error}
          </div>
        )}

        <button onClick={submit} disabled={saving || pin.length < 4 || pin2.length < 4}
          className="w-full bg-ink text-white rounded-btn py-3.5 text-sm font-semibold hover:bg-dark-grey transition disabled:opacity-40">
          {saving ? 'Se salvează…' : 'Salvează și continuă'}
        </button>
      </div>
    </div>
  )
}

export default function SetPinPage() {
  return <Suspense fallback={null}><SetPinInner /></Suspense>
}
