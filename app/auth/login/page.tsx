'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LangToggle, useLang } from '@/lib/lang'

export default function AuthPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || '/profile'
  const capsuleId    = searchParams.get('capsule_id') || ''
  const reason       = searchParams.get('reason') || ''

  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const supabase = createClient()

  const reasonText: Record<string,string> = {
    save: 'Salvează-ți capsula în cont pentru a o putea debloca oricând.',
    checkout: 'Creează-ți un cont pentru a salva capsula și a finaliza comanda.',
  }

  const handleEmailAuth = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}` },
        })
        if (error) throw error
        setSuccess('Verifică emailul pentru a confirma contul.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (capsuleId) await fetch('/api/capsule/associate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ capsule_id: capsuleId }) })
        router.push(redirectTo)
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email sau parolă incorectă' : err.message)
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    // Google OAuth requires activation in Supabase Dashboard → Auth → Providers → Google
    // Also requires a Google Cloud Console OAuth app (Client ID + Secret)
    // Until configured, show a helpful message instead of a 404
    setError('Google login requires additional setup. Please use email + password for now.')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <nav className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        {capsuleId ? <Link href={`/capsule/${capsuleId}`} className="text-stone-400 text-sm">← Înapoi</Link> : <Link href="/" className="text-stone-400 text-sm">← Acasă</Link>}
        <span className="font-display text-lg tracking-wide">Capsology</span>
        <div className="w-16" />
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {reason && reasonText[reason] && (
            <div className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-6 text-sm text-stone-600 text-center leading-relaxed">{reasonText[reason]}</div>
          )}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-light text-stone-900 mb-1">{mode==='login'?'Bine ai revenit':'Creează cont'}</h1>
            <p className="text-sm text-stone-500">{mode==='login'?'Accesează capsulele salvate.':'Salvează capsula și istoricul de comenzi.'}</p>
          </div>
          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-all mb-4 disabled:opacity-50">
            {googleLoading ? <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" /> :
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>}
            {googleLoading ? 'Se conectează...' : 'Continuă cu Google'}
          </button>
          <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-stone-200" /><span className="text-xs text-stone-400">sau cu email</span><div className="flex-1 h-px bg-stone-200" /></div>
          <div className="space-y-3 mb-4">
            {mode==='signup' && <input type="text" placeholder="Numele tău" value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-stone-500" />}
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()} className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-stone-500" />
            <input type="password" placeholder="Parolă (minim 8 caractere)" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()} className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-stone-500" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-red-700">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-green-700">{success}</div>}
          <button onClick={handleEmailAuth} disabled={loading||!email||!password}
            className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all ${loading||!email||!password?'bg-stone-200 text-stone-400 cursor-not-allowed':'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]'}`}>
            {loading ? '...' : mode==='login' ? 'Intră în cont' : 'Creează cont'}
          </button>
          <button onClick={()=>{setMode(m=>m==='login'?'signup':'login');setError('');setSuccess('')}} className="w-full mt-3 text-sm text-stone-400 hover:text-stone-700">
            {mode==='login'?'Nu ai cont? Înregistrează-te':'Ai deja cont? Intră'}
          </button>
          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 leading-relaxed">
              Nu vrei cont?{' '}
              {capsuleId ? <Link href={`/checkout?tier=unlock&capsule_id=${capsuleId}`} className="underline text-stone-600">Continuă ca vizitator</Link> : <Link href="/" className="underline text-stone-600">Întoarce-te la capsulă</Link>}
              {' '}— capsula se va pierde după 24h.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
