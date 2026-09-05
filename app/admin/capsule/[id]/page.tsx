'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import { CATEGORIES, categoryLabel, ALL_COLOURS, colourHex } from '@/lib/constants'

type Item = {
  id?: string
  position: number
  name: string
  brand: string
  category: string
  price_ron: number
  image_url: string
  product_url: string
  colours: string[]
  size_label: string
  notes: string
  is_unlocked: boolean
  _new?: boolean
  _deleted?: boolean
}

const EMPTY: Item = {
  position: 0, name: '', brand: '', category: 'tops', price_ron: 0,
  image_url: '', product_url: '', colours: [], size_label: '', notes: '',
  is_unlocked: false, _new: true,
}

export default function CapsuleBuilder() {
  const { id }  = useParams()
  const router  = useRouter()
  const isNew   = id === 'nou'
  const supabase = createClient()

  const [authed, setAuthed]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const [users, setUsers]     = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])

  const [capsule, setCapsule] = useState<any>({
    title: '', description: '', user_id: '', request_id: '',
    unlock_price_ron: 49, is_published: false,
  })
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/admin/capsule/' + id); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/'); return }
      setAuthed(true)

      // RLS pe `profiles` lasa clientul anon sa vada doar propriul rand,
      // deci lista de utilizatori vine printr-o ruta server cu service_role.
      const [u, r] = await Promise.all([
        fetch('/api/admin/users').then(x => x.json()).catch(() => ({ users: [] })),
        supabase.from('capsule_requests').select('*').in('status', ['new', 'in_progress']).order('created_at', { ascending: false }),
      ])
      setUsers(u.users || [])
      setRequests(r.data || [])

      if (!isNew) {
        const { data: c } = await supabase.from('capsules').select('*').eq('id', id).single()
        if (c) setCapsule(c)
        const { data: it } = await supabase.from('capsule_items')
          .select('*').eq('capsule_id', id).order('position')
        setItems((it || []) as Item[])
      }
      setLoading(false)
    })()
  }, [id])

  const addItem = () =>
    setItems(x => [...x, { ...EMPTY, position: x.length }])

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems(x => x.map((it, j) => j === i ? { ...it, ...patch } : it))

  const removeItem = (i: number) =>
    setItems(x => x.map((it, j) => j === i ? { ...it, _deleted: true } : it))

  const visible = items.filter(i => !i._deleted)
  const total   = visible.reduce((s, i) => s + (Number(i.price_ron) || 0), 0)
  const unlockedCount = visible.filter(i => i.is_unlocked).length
  const pct = visible.length ? Math.round(unlockedCount / visible.length * 100) : 0

  const autoUnlock = () => {
    const n = Math.max(1, Math.floor(visible.length * 0.25))
    let done = 0
    setItems(x => x.map(it => {
      if (it._deleted) return it
      const unlock = done < n
      if (unlock) done++
      return { ...it, is_unlocked: unlock }
    }))
  }

  const save = async (publish = false) => {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/admin/capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capsule_id: isNew ? null : id,
          capsule: { ...capsule, is_published: publish || capsule.is_published },
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const warnText: Record<string, string> = {
        email_failed:      ' (dar emailul cu linkul de acces NU a plecat — verifică Brevo)',
        email_link_failed: ' (dar nu am putut genera linkul de acces)',
        email_no_address:  ' (dar clientul nu are email — linkul de acces nu a plecat)',
      }
      setMsg(
        (publish ? 'Capsulă publicată — utilizatorul o vede acum.' : 'Salvat.') +
        (data.warning ? (warnText[data.warning] || ` (avertisment: ${data.warning})`) : '')
      )
      if (isNew) router.replace(`/admin/capsule/${data.capsule_id}`)
      else {
        const { data: it } = await supabase.from('capsule_items')
          .select('*').eq('capsule_id', id).order('position')
        setItems((it || []) as Item[])
        setCapsule((c: any) => ({ ...c, is_published: publish || c.is_published }))
      }
    } catch (e: any) { setMsg('Eroare: ' + e.message) }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-warm-white"><Header />
      <div className="py-32 text-center text-ink/40 text-sm animate-pulse">Se încarcă…</div>
    </div>
  )
  if (!authed) return null

  return (
    <div className="min-h-screen bg-warm-white pb-32">
      <Header />

      <div className="max-w-content mx-auto px-6 lg:px-12 py-8">

        <button onClick={() => router.push('/admin')}
          className="text-sm text-ink/50 hover:text-ink transition mb-6">
          ← Înapoi la panou
        </button>

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">

          {/* ── Setari capsula ────────────────────────── */}
          <div className="space-y-5">
            <h1 className="text-2xl font-bold">
              {isNew ? 'Capsulă nouă' : 'Editează capsula'}
            </h1>

            <Field label="Titlu">
              <input value={capsule.title || ''}
                onChange={e => setCapsule({ ...capsule, title: e.target.value })}
                placeholder="Urban Minimal" className={inp} />
            </Field>

            <Field label="Descriere">
              <textarea value={capsule.description || ''}
                onChange={e => setCapsule({ ...capsule, description: e.target.value })}
                rows={3} placeholder="Curată, modernă, versatilă."
                className={`${inp} resize-none`} />
            </Field>

            <Field label="Pentru utilizatorul">
              <select value={capsule.user_id || ''}
                onChange={e => setCapsule({ ...capsule, user_id: e.target.value })}
                className={inp}>
                <option value="">— alege —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </Field>

            <Field label="Din cererea" hint="Opțional — leagă de o cerere primită">
              <select value={capsule.request_id || ''}
                onChange={e => {
                  const r = requests.find(x => x.id === e.target.value)
                  setCapsule({
                    ...capsule,
                    request_id: e.target.value,
                    // preia clientul din cerere daca nu e deja setat
                    user_id: capsule.user_id || r?.user_id || '',
                    title: capsule.title || (r ? `Capsulă ${r.first_name}` : ''),
                  })
                }}
                className={inp}>
                <option value="">— fără —</option>
                {requests.map(r => (
                  <option key={r.id} value={r.id}>
                    #{String(r.request_number).padStart(3, '0')} · {r.first_name} {r.last_name} · {r.budget_ron} RON
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Preț deblocare (RON)">
              <input type="number" value={capsule.unlock_price_ron ?? 49}
                onChange={e => setCapsule({ ...capsule, unlock_price_ron: Number(e.target.value) })}
                className={inp} />
            </Field>

            <div className="bg-white rounded-card border border-border-line p-4 space-y-3">
              <Stat label="Articole"     value={String(visible.length)} />
              <Stat label="Valoare"      value={`${total} RON`} />
              <Stat label="Deblocate"    value={`${unlockedCount} din ${visible.length} (${pct}%)`}
                    highlight={pct >= 20 && pct <= 35} />
              <button onClick={autoUnlock}
                className="w-full text-xs border border-border-line rounded-btn py-2 hover:bg-warm-white transition">
                Deblochează automat 25%
              </button>
            </div>

            {capsule.is_published && (
              <div className="bg-success-bg border border-success/20 rounded-card px-4 py-3 text-xs text-success">
                ✓ Publicată — utilizatorul o vede în contul lui
              </div>
            )}
          </div>

          {/* ── Articole ──────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Articole în capsulă</h2>
              <button onClick={addItem}
                className="text-xs bg-ink text-white rounded-btn px-4 py-2 hover:bg-dark-grey transition">
                + Adaugă articol
              </button>
            </div>

            {visible.length === 0 && (
              <div className="bg-white border border-dashed border-border-line rounded-card-lg py-16 text-center">
                <p className="text-sm text-ink/50 mb-4">Nicio piesă încă.</p>
                <button onClick={addItem}
                  className="text-xs border border-border-line rounded-btn px-4 py-2 hover:bg-warm-white transition">
                  Adaugă prima piesă
                </button>
              </div>
            )}

            <div className="space-y-3">
              {items.map((it, i) => it._deleted ? null : (
                <div key={i} className="bg-white rounded-card border border-border-line p-4">
                  <div className="flex gap-4">

                    {/* Preview poza */}
                    <div className="w-24 flex-shrink-0">
                      <div className="aspect-[3/4] bg-warm-white rounded-lg border border-border-line overflow-hidden mb-2">
                        <Thumb src={it.image_url} />
                      </div>
                      <button onClick={() => updateItem(i, { is_unlocked: !it.is_unlocked })}
                        className={`w-full text-[10px] rounded-md py-1.5 border transition ${
                          it.is_unlocked
                            ? 'bg-success-bg border-success/30 text-success font-medium'
                            : 'bg-warm-white border-border-line text-ink/50'
                        }`}>
                        {it.is_unlocked ? '✓ Vizibil' : 'Blurat'}
                      </button>
                    </div>

                    {/* Campuri */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <input value={it.name} onChange={e => updateItem(i, { name: e.target.value })}
                          placeholder="Nume articol *" className={inpSm} />
                        <input value={it.brand} onChange={e => updateItem(i, { brand: e.target.value })}
                          placeholder="Brand" className={inpSm} />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2.5">
                        <select value={it.category} onChange={e => updateItem(i, { category: e.target.value })}
                          className={inpSm}>
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <input type="number" value={it.price_ron || ''}
                          onChange={e => updateItem(i, { price_ron: Number(e.target.value) })}
                          placeholder="Preț RON" className={inpSm} />
                        <input value={it.size_label} onChange={e => updateItem(i, { size_label: e.target.value })}
                          placeholder="Mărime" className={inpSm} />
                      </div>

                      <div>
                        <input value={it.image_url}
                          onChange={e => updateItem(i, { image_url: e.target.value })}
                          onBlur={e => updateItem(i, { image_url: normalizeUrl(e.target.value) })}
                          placeholder="Link direct către fișierul imaginii (.jpg / .png / .webp)" className={inpSm} />
                        <p className="text-[10px] text-ink/40 mt-1 leading-snug">
                          Nu pagina produsului — linkul trebuie să se termină în .jpg/.png/.webp.
                          Click-dreapta pe poză în magazin → „Copiază adresa imaginii".
                          Unele magazine (Zara, H&amp;M) blochează afișarea pozelor pe alt site.
                        </p>
                      </div>

                      <input value={it.product_url} onChange={e => updateItem(i, { product_url: e.target.value })}
                        onBlur={e => updateItem(i, { product_url: normalizeUrl(e.target.value) })}
                        placeholder="Link magazin (https://…)" className={inpSm} />

                      <input value={it.notes} onChange={e => updateItem(i, { notes: e.target.value })}
                        placeholder="De ce am ales piesa asta (opțional)" className={inpSm} />

                      {/* Culori */}
                      <div className="flex flex-wrap gap-1">
                        {ALL_COLOURS.map(c => {
                          const on = it.colours?.includes(c.id)
                          return (
                            <button key={c.id} title={c.label}
                              onClick={() => updateItem(i, {
                                colours: on
                                  ? it.colours.filter(x => x !== c.id)
                                  : [...(it.colours || []), c.id],
                              })}
                              className={`w-5 h-5 rounded-full border transition ${
                                on ? 'ring-2 ring-ink ring-offset-1' : 'border-border-line hover:scale-110'
                              }`}
                              style={{ background: c.hex }} />
                          )
                        })}
                      </div>
                    </div>

                    <button onClick={() => removeItem(i)}
                      className="text-ink/30 hover:text-[#DC2626] transition self-start text-sm">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bara de salvare */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-border-line px-6 py-4 z-40">
        <div className="max-w-content mx-auto flex items-center justify-between gap-4">
          <div className="text-xs text-ink/50">
            {msg || `${visible.length} articole · ${total} RON · ${unlockedCount} vizibile`}
          </div>
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={saving || !capsule.user_id}
              className="border border-border-line rounded-btn px-5 py-2.5 text-sm hover:bg-warm-white transition disabled:opacity-40">
              {saving ? 'Se salvează…' : 'Salvează'}
            </button>
            <button onClick={() => save(true)} disabled={saving || !capsule.user_id || visible.length === 0}
              className="bg-ink text-white rounded-btn px-6 py-2.5 text-sm font-semibold hover:bg-dark-grey transition disabled:opacity-40">
              Publică
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inp   = 'w-full px-3 py-2.5 rounded-btn border border-border-line bg-white text-sm focus:outline-none focus:border-ink transition'
const inpSm = 'w-full px-3 py-2 rounded-lg border border-border-line bg-warm-white text-xs focus:outline-none focus:border-ink transition'

// Adauga https:// daca lipseste protocolul (ex. "www.zara.com" -> "https://www.zara.com")
function normalizeUrl(v: string): string {
  const s = (v || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (/^\/\//.test(s)) return 'https:' + s
  return 'https://' + s
}

// Preview cu stare de eroare — distinge "fara poza" de "link care nu se incarca"
function Thumb({ src }: { src: string }) {
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [src])

  if (!src) return (
    <div className="w-full h-full flex items-center justify-center text-[10px] text-ink/30 text-center px-1">
      fără poză
    </div>
  )
  if (err) return (
    <div className="w-full h-full flex items-center justify-center text-[9px] text-[#B91C1C] text-center px-1 leading-tight">
      linkul nu se încarcă
    </div>
  )
  return (
    <img src={src} alt="" referrerPolicy="no-referrer"
      className="w-full h-full object-contain"
      onError={() => setErr(true)} />
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink/70 mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ink/40 mt-1 block">{hint}</span>}
    </label>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-ink/50">{label}</span>
      <span className={highlight ? 'text-success font-medium' : 'font-medium'}>{value}</span>
    </div>
  )
}
