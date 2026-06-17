'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang, LangToggle } from '@/lib/lang'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router   = useRouter()
  const { t }    = useLang()
  const [user, setUser]         = useState<any>(null)
  const [capsules, setCapsules] = useState<any[]>([])
  const [profile, setProfile]   = useState<any>(null)
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'capsules' | 'profile' | 'history'>('capsules')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/profile'); return }
      setUser(user)

      const [{ data: caps }, profileRes] = await Promise.all([
        supabase.from('capsules').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        fetch('/api/quiz/profile'),
      ])

      setCapsules(caps || [])

      const profileData = await profileRes.json()
      setProfile(profileData.profile)
      setHistory(profileData.history || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusConfig: Record<string, { label: string; labelEn: string; color: string }> = {
    preview:  { label: 'Vizualizare',  labelEn: 'Preview',   color: 'text-stone-400' },
    unlocked: { label: 'Deblocată ✓',  labelEn: 'Unlocked ✓', color: 'text-green-600' },
    ordered:  { label: 'Comandată ✓',  labelEn: 'Ordered ✓',  color: 'text-blue-600'  },
  }

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 max-w-md mx-auto">
      <nav className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Link href="/" className="font-display text-xl tracking-wide">Capsology</Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-xs text-stone-400 hover:text-stone-700">
            {t('Deconectare', 'Sign out')}
          </button>
        </div>
      </nav>

      {/* User header */}
      <div className="px-5 py-5 border-b border-stone-100">
        <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">
          {t('Contul tău', 'Your account')}
        </p>
        <h1 className="font-display text-2xl font-light">
          {user?.user_metadata?.full_name || user?.email}
        </h1>
        <p className="text-sm text-stone-400 mt-1">{user?.email}</p>

        {/* Quick stats */}
        {profile && (
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <div className="text-lg font-medium text-stone-800">{profile.quiz_count || 0}</div>
              <div className="text-xs text-stone-400">{t('quiz-uri', 'quizzes')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-stone-800">{capsules.length}</div>
              <div className="text-xs text-stone-400">{t('capsule', 'capsules')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-stone-800">
                €{profile.total_spent_eur?.toFixed(0) || 0}
              </div>
              <div className="text-xs text-stone-400">{t('cheltuit', 'spent')}</div>
            </div>
            {profile.avg_budget_eur && (
              <div className="text-center">
                <div className="text-lg font-medium text-stone-800">
                  €{Math.round(profile.avg_budget_eur)}
                </div>
                <div className="text-xs text-stone-400">{t('buget mediu', 'avg budget')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white">
        {[
          { id: 'capsules', label: t('Capsule', 'Capsules') },
          { id: 'profile',  label: t('Profilul meu', 'My profile') },
          { id: 'history',  label: t('Istoric quiz', 'Quiz history') },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${
              tab === tb.id
                ? 'border-stone-800 text-stone-800'
                : 'border-transparent text-stone-400'
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">

        {/* ── CAPSULES TAB ── */}
        {tab === 'capsules' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-stone-700">
                {t(`Capsulele mele (${capsules.length})`, `My capsules (${capsules.length})`)}
              </h2>
              <Link href="/quiz"
                className="text-xs text-stone-500 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100">
                + {t('Capsulă nouă', 'New capsule')}
              </Link>
            </div>

            {capsules.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-display text-4xl mb-3">✦</p>
                <p className="text-stone-400 text-sm mb-5">
                  {t('Nu ai nicio capsulă salvată.', 'No saved capsules yet.')}
                </p>
                <Link href="/quiz"
                  className="px-6 py-3 bg-stone-900 text-white text-sm rounded-xl">
                  {t('Creează prima capsulă →', 'Create your first capsule →')}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {capsules.map(cap => {
                  const status = statusConfig[cap.status] || statusConfig.preview
                  const daysLeft = cap.expires_at
                    ? Math.max(0, Math.ceil((new Date(cap.expires_at).getTime() - Date.now()) / 86400000))
                    : null
                  return (
                    <Link key={cap.id} href={`/capsule/${cap.id}`}
                      className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-2xl hover:border-stone-300 transition-all block">
                      <div className="grid grid-cols-2 gap-px w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
                        {(cap.items || []).slice(0, 4).map((item: any, i: number) => (
                          <img key={i} src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-stone-800 font-medium truncate">
                          {cap.style_summary?.split('.')[0] || t('Capsulă personalizată', 'Personalized capsule')}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs font-medium ${status.color}`}>
                            {t(status.label, status.labelEn)}
                          </span>
                          {cap.status === 'unlocked' && daysLeft !== null && (
                            <span className={`text-xs ${daysLeft <= 2 ? 'text-amber-500' : 'text-stone-400'}`}>
                              · {daysLeft}{t('z rămase', 'd left')}
                            </span>
                          )}
                          {cap.save_code && (
                            <span className="text-xs font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded">
                              {cap.save_code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {(cap.items || []).length} {t('piese', 'pieces')} · €{cap.total_price_eur?.toFixed(0)}
                        </div>
                      </div>
                      <span className="text-stone-300">›</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <>
            <h2 className="text-sm font-medium text-stone-700 mb-4">
              {t('Profilul tău de stil', 'Your style profile')}
            </h2>

            {profile ? (
              <div className="space-y-4">
                {/* Aggregated from quiz history */}
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-stone-400 mb-3">
                    {t('Preferințe detectate din quiz-uri', 'Preferences detected from quizzes')}
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { label: t('Gen preferat', 'Preferred gender'), value: profile.preferred_gender },
                      { label: t('Buget mediu', 'Average budget'), value: profile.avg_budget_eur ? `€${Math.round(profile.avg_budget_eur)}` : null },
                      { label: t('Stiluri top', 'Top styles'), value: profile.top_styles?.join(', ') },
                      { label: t('Culori preferate', 'Preferred colors'), value: profile.top_colors?.join(', ') },
                      { label: t('Ocazii', 'Occasions'), value: profile.top_occasions?.join(', ') },
                      { label: t('Mărime top', 'Top size'), value: profile.size_top },
                      { label: t('Mărime bottom', 'Bottom size'), value: profile.size_bottom },
                      { label: t('Mărime pantofi', 'Shoe size'), value: profile.size_shoes },
                    ].filter(row => row.value).map((row, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-stone-500">{row.label}</span>
                        <span className="text-stone-800 font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* v2.0 extended fields notice */}
                <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-4 text-center">
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {t(
                      '✦ În versiunea 2.0 vei putea completa profilul complet de stil: mărimi exacte, branduri preferate, materiale, sustenabilitate și preferințe de lifestyle.',
                      '✦ In version 2.0 you will be able to complete your full style profile: exact measurements, preferred brands, materials, sustainability preferences, and lifestyle tags.'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400 text-sm">
                {t('Completează primul quiz pentru a-ți construi profilul de stil.', 'Complete your first quiz to build your style profile.')}
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            <h2 className="text-sm font-medium text-stone-700 mb-4">
              {t(`Istoric quiz (${history.length} sesiuni)`, `Quiz history (${history.length} sessions)`)}
            </h2>

            {history.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                {t('Nu ai sesiuni de quiz înregistrate.', 'No quiz sessions recorded yet.')}
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((session: any, i: number) => (
                  <div key={i} className="bg-white border border-stone-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-stone-400">
                        {new Date(session.created_at).toLocaleDateString('ro-RO', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                      {session.capsule_id && (
                        <Link href={`/capsule/${session.capsule_id}`}
                          className="text-xs text-stone-500 border border-stone-200 px-2 py-0.5 rounded hover:bg-stone-50">
                          {t('Vezi capsula', 'View capsule')} →
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        { k: t('Gen', 'Gender'), v: session.gender },
                        { k: t('Buget', 'Budget'), v: session.budget_eur ? `€${session.budget_eur}` : null },
                        { k: t('Stiluri', 'Styles'), v: session.styles?.join(', ') },
                        { k: t('Culori', 'Colors'), v: session.colors?.join(', ') },
                        { k: t('Mărimi', 'Sizes'), v: [session.size_top, session.size_bottom, session.size_shoes].filter(Boolean).join(' / ') },
                      ].filter(r => r.v).map((r, j) => (
                        <div key={j} className="text-xs">
                          <span className="text-stone-400">{r.k}: </span>
                          <span className="text-stone-700">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
