'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'

type Req = any

const STATUS = [
  { id: 'new',         label: 'Nouă',      cls: 'bg-[#E6F1FB] text-[#185FA5]' },
  { id: 'in_progress', label: 'În lucru',  cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  { id: 'sent',        label: 'Trimisă',   cls: 'bg-success-bg text-success' },
  { id: 'closed',      label: 'Închisă',   cls: 'bg-warm-grey/25 text-ink/50' },
]

export default function RequestsPage() {
  const router = useRouter()
  const [authed, setAuthed]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [reqs, setReqs]       = useState<Req[]>([])
  const [filter, setFilter]   = useState('all')
  const [open, setOpen]       = useState<Req | null>(null)
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/admin/requests'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/'); return }

      setAuthed(true)
      const { data } = await supabase
        .from('capsule_requests').select('*').order('created_at', { ascending: false })
      setReqs(data || [])
      setLoading(false)
    })()
  }, [])

  const setStatus = async (id: string, status: string) => {
    await supabase.from('capsule_requests')
      .update({ status, ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}) })
      .eq('id', id)
    setReqs(r => r.map(x => x.id === id ? { ...x, status } : x))
    setOpen((o: Req) => o?.id === id ? { ...o, status } : o)
  }

  if (loading) return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <div className="py-32 text-center text-ink/40 text-sm animate-pulse">Se încarcă…</div>
    </div>
  )
  if (!authed) return null

  const shown = filter === 'all' ? reqs : reqs.filter(r => r.status === filter)
  const counts = STATUS.map(s => ({ ...s, n: reqs.filter(r => r.status === s.id).length }))

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />

      <div className="max-w-content mx-auto px-6 lg:px-12 py-8">

        <button onClick={() => router.push('/admin')}
          className="text-sm text-ink/50 hover:text-ink transition mb-6">
          ← Panou principal
        </button>

        <div className="flex items-baseline justify-between mb-7">
          <h1 className="text-2xl font-bold">Cereri de capsulă</h1>
          <span className="text-sm text-ink/45">{reqs.length} total</span>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {counts.map(s => (
            <button key={s.id} onClick={() => setFilter(filter === s.id ? 'all' : s.id)}
              className={`bg-white rounded-card border p-4 text-left transition-all ${
                filter === s.id ? 'border-ink' : 'border-border-line hover:border-ink/25'
              }`}>
              <div className="text-2xl font-bold mb-1">{s.n}</div>
              <div className="text-xs text-ink/50">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="bg-white rounded-card-lg border border-border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-white border-b border-border-line">
                <tr>
                  {['Nr', 'Client', 'Buget', 'Stil', 'Status', 'Primită'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-medium text-ink/50 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-line">
                {shown.map(r => {
                  const st = STATUS.find(s => s.id === r.status) || STATUS[0]
                  return (
                    <tr key={r.id} onClick={() => setOpen(r)}
                      className="hover:bg-warm-white cursor-pointer transition">
                      <td className="px-4 py-3 font-mono text-xs text-ink/50">
                        {String(r.request_number).padStart(3, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.first_name} {r.last_name}</div>
                        <div className="text-xs text-ink/45">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.budget_ron} RON</td>
                      <td className="px-4 py-3 text-xs text-ink/60">
                        {(r.styles || []).slice(0, 2).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink/50">
                        {new Date(r.created_at).toLocaleDateString('ro-RO', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
                {shown.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-ink/40">
                    Nicio cerere aici.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detaliu */}
      {open && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-50" onClick={() => setOpen(null)} />
          <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-warm-white z-50 overflow-y-auto">
            <div className="sticky top-0 bg-warm-white border-b border-border-line px-6 py-5 flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-ink/45 mb-1">
                  CERERE-{String(open.request_number).padStart(3, '0')}
                </div>
                <h2 className="text-xl font-bold">{open.first_name} {open.last_name}</h2>
              </div>
              <button onClick={() => setOpen(null)}
                className="w-8 h-8 rounded-full border border-border-line flex items-center justify-center hover:bg-white transition">
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">

              <div className="flex gap-2">
                {STATUS.map(s => (
                  <button key={s.id} onClick={() => setStatus(open.id, s.id)}
                    className={`flex-1 text-[11px] py-2 rounded-btn border transition ${
                      open.status === s.id ? 'bg-ink text-white border-ink' : 'bg-white border-border-line hover:border-ink/30'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              <Row label="Email">
                <a href={`mailto:${open.email}`} className="underline">{open.email}</a>
              </Row>
              {open.phone && <Row label="Telefon">{open.phone}</Row>}
              <Row label="Buget"><strong>{open.budget_ron} RON</strong></Row>
              <Row label="Culori">{(open.colors || []).join(' · ') || '—'}</Row>
              <Row label="Stil">{(open.styles || []).join(' · ') || '—'}</Row>
              <Row label="Ocazii">{(open.occasions || []).join(' · ') || '—'}</Row>
              <Row label="Mărimi">
                Top {open.size_top} · Pantaloni {open.size_bottom} · Pantofi {open.size_shoes}
              </Row>
              {open.notes && (
                <Row label="Mențiuni">
                  <span className="italic text-ink/70">{open.notes}</span>
                </Row>
              )}
              <Row label="Newsletter">
                {open.consent_marketing ? 'Da, acceptă' : 'Nu'}
              </Row>

              <button
                onClick={() => router.push(open.capsule_id ? `/admin/capsule/${open.capsule_id}` : '/admin/capsule/nou')}
                className="block w-full bg-ink text-white rounded-btn py-3.5 text-sm font-semibold text-center hover:bg-dark-grey transition">
                {open.capsule_id ? 'Editează capsula →' : 'Creează capsulă →'}
              </button>

              <a href={`mailto:${open.email}?subject=Capsula ta Capsology&body=Salut ${open.first_name},%0D%0A%0D%0AAm pregătit capsula ta.`}
                className="block w-full text-center text-xs text-ink/45 hover:text-ink transition">
                sau trimite un email direct
              </a>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}
