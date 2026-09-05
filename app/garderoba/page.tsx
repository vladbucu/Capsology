'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'

export default function WardrobePage() {
  const router = useRouter()
  const supabase = createClient()
  const [caps, setCaps]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser]       = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/garderoba'); return }
      setUser(user)

      const { data } = await supabase
        .from('capsules')
        .select('*, capsule_items(id, image_url, is_unlocked)')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .order('published_at', { ascending: false })

      setCaps(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-warm-white"><Header />
      <div className="py-32 text-center text-ink/40 text-sm animate-pulse">Se încarcă…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <div className="max-w-content mx-auto px-6 lg:px-12 py-10">

        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h1 className="text-section font-bold mb-1.5">Garderoba mea</h1>
            <p className="text-sm text-ink/55">{user?.email}</p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-xs text-ink/45 hover:text-ink transition">
            Deconectare
          </button>
        </div>

        {caps.length === 0 ? (
          <div className="bg-white border border-dashed border-border-line rounded-card-lg py-20 text-center">
            <img src="/brand/logo/mark-black.svg" alt="" className="w-9 h-9 mx-auto mb-5 opacity-25" />
            <p className="text-ink/55 mb-2">Nu ai încă nicio capsulă.</p>
            <p className="text-xs text-ink/40 mb-7">
              Completează formularul și îți construim una în 48 de ore.
            </p>
            <Link href="/quiz"
              className="inline-block bg-ink text-white rounded-btn px-6 py-3 text-sm font-semibold hover:bg-dark-grey transition">
              Cere o capsulă gratuită
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {caps.map(c => {
              const items    = c.capsule_items || []
              const locked   = items.filter((i: any) => !i.is_unlocked).length
              const isOpen   = c.status === 'unlocked' || c.status === 'ordered'
              return (
                <Link key={c.id} href={`/capsule/${c.id}`}
                  className="bg-white rounded-card-lg border border-border-line overflow-hidden hover:shadow-lift hover:border-ink/20 transition-all">
                  <div className="grid grid-cols-2 gap-px bg-border-line aspect-[4/3]">
                    {items.slice(0, 4).map((i: any) => (
                      <div key={i.id} className="bg-warm-white p-3">
                        {i.image_url && (
                          <img src={i.image_url} alt="" referrerPolicy="no-referrer"
                            className={`w-full h-full object-contain ${i.is_unlocked || isOpen ? '' : 'blur-[6px]'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-4">
                    <div className="font-semibold mb-1">{c.title || 'Capsulă'}</div>
                    <div className="text-xs text-ink/50 mb-2.5">
                      {items.length} piese
                      {c.published_at && ` · ${new Date(c.published_at).toLocaleDateString('ro-RO')}`}
                    </div>
                    {isOpen
                      ? <span className="text-[11px] text-success font-medium">✓ Completă</span>
                      : <span className="text-[11px] text-ink/45">{locked} piese blocate</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
