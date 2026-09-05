'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'

export default function AdminDashboard() {
  const router   = useRouter()
  const supabase = createClient()

  const [authed, setAuthed]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'incasari' | 'utilizatori' | 'capsule'>('capsule')

  const [payments, setPayments] = useState<any[]>([])
  const [users, setUsers]       = useState<any[]>([])
  const [capsules, setCapsules] = useState<any[]>([])
  const [period, setPeriod]     = useState<'week' | 'month' | 'year' | 'all'>('month')

  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '' })
  const [showNew, setShowNew] = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/admin'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/'); return }
      setAuthed(true)
      await loadAll()
      setLoading(false)
    })()
  }, [])

  const loadAll = async () => {
    const [pay, usr, cap] = await Promise.all([
      supabase.from('payments').select('*').eq('status', 'paid').order('paid_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('capsules').select('id, title, user_id, is_published, published_at, total_price_eur, capsule_number, status, request_id, access_email_sent_at')
        .order('created_at', { ascending: false }),
    ])
    setPayments(pay.data || [])
    setUsers(usr.data || [])
    setCapsules(cap.data || [])
  }

  const from = (() => {
    const d = new Date()
    if (period === 'week')  { d.setDate(d.getDate() - 7);  return d }
    if (period === 'month') { d.setDate(1);                return d }
    if (period === 'year')  { d.setMonth(0); d.setDate(1); return d }
    return new Date('2020-01-01')
  })()

  const inPeriod = payments.filter(p => new Date(p.paid_at) >= from)
  const revenue  = inPeriod.reduce((s, p) => s + Number(p.amount_eur || 0), 0)

  // ── Actiuni utilizatori ─────────────────────────────
  const call = async (url: string, body: any) => {
    setMsg(''); setErr('')
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (!res.ok || d.error) { setErr(d.error || 'Eroare'); return false }
    return true
  }

  const resetPwd = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    error ? setErr(error.message) : setMsg(`Email de resetare trimis către ${email}`)
  }

  const createUser = async () => {
    if (await call('/api/admin/create-user', newUser)) {
      setMsg(`Utilizator creat: ${newUser.email}`)
      setNewUser({ email: '', password: '', full_name: '' })
      setShowNew(false); loadAll()
    }
  }

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Ștergi utilizatorul ${email}? Acțiunea e definitivă.`)) return
    if (await call('/api/admin/delete-user', { user_id: id })) {
      setMsg(`Utilizator șters: ${email}`); loadAll()
    }
  }

  const toggleRole = async (id: string, role: string) => {
    const next = role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Schimbi rolul în "${next}"?`)) return
    if (await call('/api/admin/update-role', { user_id: id, role: next })) {
      setMsg(`Rol schimbat în ${next}`); loadAll()
    }
  }

  const deleteCapsule = async (id: string, title: string) => {
    if (!confirm(`Ștergi capsula „${title || 'fără titlu'}"? Articolele ei se șterg definitiv, iar cererea asociată revine în lista de cereri.`)) return
    if (await call('/api/admin/capsule/delete', { capsule_id: id })) {
      setMsg('Capsulă ștearsă.'); loadAll()
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-warm-white"><Header />
      <div className="py-32 text-center text-ink/40 text-sm animate-pulse">Se încarcă…</div>
    </div>
  )
  if (!authed) return null

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <div className="max-w-content mx-auto px-6 lg:px-12 py-8">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
          <h1 className="text-2xl font-bold">Administrare</h1>
          <div className="flex gap-2">
            <Link href="/admin/requests"
              className="text-xs border border-border-line rounded-btn px-4 py-2.5 hover:bg-white transition">
              Cereri primite
            </Link>
            <Link href="/admin/capsule/nou"
              className="text-xs bg-ink text-white rounded-btn px-4 py-2.5 hover:bg-dark-grey transition">
              + Capsulă nouă
            </Link>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border-line">
          {[
            { id: 'incasari',    label: 'Încasări' },
            { id: 'utilizatori', label: `Utilizatori (${users.length})` },
            { id: 'capsule',     label: `Capsule (${capsules.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-3 text-sm border-b-2 -mb-px transition ${
                tab === t.id ? 'border-ink text-ink font-medium' : 'border-transparent text-ink/45 hover:text-ink/70'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {msg && <Banner ok>{msg}</Banner>}
        {err && <Banner>{err}</Banner>}

        {/* ── INCASARI ─────────────────────────────── */}
        {tab === 'incasari' && (
          <>
            <div className="flex gap-1 bg-white border border-border-line rounded-btn p-1 w-fit mb-5">
              {(['week', 'month', 'year', 'all'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 text-xs rounded-md transition ${
                    period === p ? 'bg-ink text-white' : 'text-ink/50 hover:bg-warm-white'
                  }`}>
                  {{ week: 'Săptămână', month: 'Lună', year: 'An', all: 'Total' }[p]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
              <Card label="Încasări"       value={`${revenue.toFixed(0)} RON`} />
              <Card label="Deblocări"      value={String(inPeriod.length)} />
              <Card label="Capsule publicate" value={String(capsules.filter(c => c.is_published).length)} />
              <Card label="Utilizatori"    value={String(users.length)} />
            </div>

            <Panel title="Plăți recente">
              <Table head={['Data', 'Client', 'Sumă', 'Capsulă']}>
                {inPeriod.slice(0, 25).map((p, i) => (
                  <tr key={i} className="hover:bg-warm-white">
                    <Td>{new Date(p.paid_at).toLocaleDateString('ro-RO')}</Td>
                    <Td>{p.guest_email || users.find(u => u.id === p.user_id)?.email || '—'}</Td>
                    <Td><strong>{Number(p.amount_eur).toFixed(0)} RON</strong></Td>
                    <Td mono>{p.capsule_id?.slice(0, 8)}</Td>
                  </tr>
                ))}
                {inPeriod.length === 0 && <Empty colSpan={4}>Nicio plată în perioada asta.</Empty>}
              </Table>
            </Panel>
          </>
        )}

        {/* ── UTILIZATORI ──────────────────────────── */}
        {tab === 'utilizatori' && (
          <>
            <button onClick={() => setShowNew(v => !v)}
              className="mb-4 text-xs bg-ink text-white rounded-btn px-4 py-2.5 hover:bg-dark-grey transition">
              {showNew ? 'Anulează' : '+ Utilizator nou'}
            </button>

            {showNew && (
              <div className="bg-white rounded-card border border-border-line p-5 mb-5">
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <input placeholder="Nume complet" value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className={inp} />
                  <input placeholder="Email" type="email" value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })} className={inp} />
                  <input placeholder="Parolă" type="text" value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })} className={inp} />
                </div>
                <button onClick={createUser} disabled={!newUser.email || !newUser.password}
                  className="bg-ink text-white rounded-btn px-5 py-2.5 text-xs font-medium disabled:opacity-40">
                  Creează
                </button>
              </div>
            )}

            <Panel>
              <Table head={['Utilizator', 'Rol', 'Capsule', 'Înregistrat', 'Acțiuni']}>
                {users.map(u => {
                  const mine = capsules.filter(c => c.user_id === u.id)
                  return (
                    <tr key={u.id} className="hover:bg-warm-white">
                      <Td>
                        <div className="font-medium">{u.full_name || '—'}</div>
                        <div className="text-xs text-ink/45">{u.email}</div>
                      </Td>
                      <Td>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-[#EEEDFE] text-[#3C3489]' : 'bg-warm-grey/25 text-ink/55'
                        }`}>{u.role || 'user'}</span>
                      </Td>
                      <Td>{mine.length}</Td>
                      <Td>{new Date(u.created_at).toLocaleDateString('ro-RO')}</Td>
                      <Td>
                        <div className="flex gap-1.5 flex-wrap">
                          <Btn onClick={() => toggleRole(u.id, u.role)}>
                            {u.role === 'admin' ? '→ user' : '→ admin'}
                          </Btn>
                          <Btn onClick={() => resetPwd(u.email)}>Resetare parolă</Btn>
                          <Btn danger onClick={() => deleteUser(u.id, u.email)}>Șterge</Btn>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </Table>
            </Panel>
          </>
        )}

        {/* ── CAPSULE ──────────────────────────────── */}
        {tab === 'capsule' && (
          <Panel>
            <Table head={['Nr', 'Titlu', 'Utilizator', 'Valoare', 'Status', '']}>
              {capsules.map(c => (
                <tr key={c.id} className="hover:bg-warm-white">
                  <Td mono>{c.capsule_number ? String(c.capsule_number).padStart(3, '0') : '—'}</Td>
                  <Td>
                    <span className="font-medium">{c.title || 'Fără titlu'}</span>
                    {c.request_id && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[#FAEEDA] text-[#854F0B] align-middle">
                        din cerere
                      </span>
                    )}
                  </Td>
                  <Td>{users.find(u => u.id === c.user_id)?.email || '—'}</Td>
                  <Td>{Number(c.total_price_eur || 0).toFixed(0)} RON</Td>
                  <Td>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      c.status === 'unlocked' ? 'bg-success-bg text-success'
                      : c.is_published        ? 'bg-[#E6F1FB] text-[#185FA5]'
                      :                         'bg-warm-grey/25 text-ink/50'
                    }`}>
                      {c.status === 'unlocked' ? 'Plătită' : c.is_published ? 'Publicată' : 'Ciornă'}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Link href={`/admin/capsule/${c.id}`}
                        className="text-xs border border-border-line rounded-md px-2.5 py-1 hover:bg-white transition">
                        Editează
                      </Link>
                      <button onClick={() => deleteCapsule(c.id, c.title)}
                        className="text-xs border border-[#FECACA] text-[#DC2626] rounded-md px-2.5 py-1 hover:bg-[#FEF2F2] transition">
                        Șterge
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {capsules.length === 0 && <Empty colSpan={6}>Nicio capsulă încă.</Empty>}
            </Table>
          </Panel>
        )}
      </div>
    </div>
  )
}

const inp = 'w-full px-3 py-2.5 rounded-btn border border-border-line bg-warm-white text-sm focus:outline-none focus:border-ink transition'

const Card = ({ label, value }: any) => (
  <div className="bg-white rounded-card border border-border-line p-4">
    <div className="text-xs text-ink/45 mb-1">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
)

const Panel = ({ title, children }: any) => (
  <div className="bg-white rounded-card-lg border border-border-line overflow-hidden">
    {title && <div className="px-5 py-3.5 border-b border-border-line font-medium text-sm">{title}</div>}
    <div className="overflow-x-auto">{children}</div>
  </div>
)

const Table = ({ head, children }: any) => (
  <table className="w-full text-sm">
    <thead className="bg-warm-white border-b border-border-line">
      <tr>{head.map((h: string) => (
        <th key={h} className="text-left px-4 py-3 text-[11px] font-medium text-ink/50 uppercase tracking-wide">{h}</th>
      ))}</tr>
    </thead>
    <tbody className="divide-y divide-border-line">{children}</tbody>
  </table>
)

const Td = ({ children, mono }: any) => (
  <td className={`px-4 py-3 ${mono ? 'font-mono text-xs text-ink/50' : ''}`}>{children}</td>
)

const Empty = ({ colSpan, children }: any) => (
  <tr><td colSpan={colSpan} className="px-4 py-14 text-center text-ink/40">{children}</td></tr>
)

const Btn = ({ children, onClick, danger }: any) => (
  <button onClick={onClick}
    className={`text-[11px] border rounded-md px-2.5 py-1 transition ${
      danger ? 'border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]'
             : 'border-border-line text-ink/65 hover:bg-warm-white'
    }`}>{children}</button>
)

const Banner = ({ ok, children }: any) => (
  <div className={`rounded-card px-4 py-3 mb-5 text-sm border ${
    ok ? 'bg-success-bg border-success/20 text-success' : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
  }`}>{children}</div>
)
