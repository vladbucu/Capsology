// @ts-nocheck
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────
interface SalesSummary {
  total_revenue: number
  unlock_revenue: number
  fullservice_revenue: number
  unlock_count: number
  fullservice_count: number
  affiliate_estimated: number
}

interface PeriodData {
  label: string
  unlock: number
  full_service: number
  revenue: number
}

interface UserRow {
  id: string
  email: string
  created_at: string
  full_name: string
  capsule_count: number
  total_spent: number
  last_active: string
  role: string
}

type Period = 'week' | 'month' | 'year' | 'all'

export default function AdminPage() {
  const router  = useRouter()
  const [authed, setAuthed]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'dashboard' | 'users' | 'orders'>('dashboard')
  const [period, setPeriod]   = useState<Period>('month')

  // Dashboard state
  const [summary, setSummary]     = useState<SalesSummary | null>(null)
  const [periodData, setPeriodData] = useState<PeriodData[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])

  // Users state
  const [users, setUsers]         = useState<UserRow[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userLoading, setUserLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '' })
  const [actionMsg, setActionMsg] = useState('')
  const [actionError, setActionError] = useState('')

  const supabase = createClient()

  // ─── Auth check — verifies role = 'admin' in profiles table ─
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/admin'); return }

      // Check role in database — not hardcoded email
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/')
        return
      }

      setAuthed(true)
      setLoading(false)
      loadDashboard('month')
      loadUsers()
    }
    checkAuth()
  }, [])

  // ─── Load dashboard data ──────────────────────────────────
  const loadDashboard = useCallback(async (p: Period) => {
    const from = periodStart(p)

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'paid')
      .gte('paid_at', from.toISOString())
      .order('paid_at', { ascending: false })

    if (!payments) return

    const unlocks     = payments.filter(p => p.tier === 'unlock')
    const fullservice = payments.filter(p => p.tier === 'full_service')
    const unlockRev   = unlocks.reduce((s, p) => s + (p.amount_eur || 0), 0)
    const fsRev       = fullservice.reduce((s, p) => s + (p.amount_eur || 0), 0)
    const affEst      = (unlocks.length + fullservice.length) * 12.60

    setSummary({
      total_revenue:        unlockRev + fsRev,
      unlock_revenue:       unlockRev,
      fullservice_revenue:  fsRev,
      unlock_count:         unlocks.length,
      fullservice_count:    fullservice.length,
      affiliate_estimated:  affEst,
    })

    setRecentPayments(payments.slice(0, 20))
    setPeriodData(buildPeriodData(payments, p))
  }, [])

  // ─── Load users ───────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUserLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, role')
      .order('created_at', { ascending: false })

    if (!profiles) { setUserLoading(false); return }

    // Enrich with capsule + payment counts
    const enriched: UserRow[] = await Promise.all(profiles.map(async p => {
      const { count: capsule_count } = await supabase
        .from('capsules').select('*', { count: 'exact', head: true }).eq('user_id', p.id)
      const { data: paid } = await supabase
        .from('payments').select('amount_eur').eq('user_id', p.id).eq('status', 'paid')
      const total_spent = (paid || []).reduce((s, x) => s + (x.amount_eur || 0), 0)
      const { data: lastCap } = await supabase
        .from('capsules').select('created_at').eq('user_id', p.id)
        .order('created_at', { ascending: false }).limit(1)
      return {
        ...p,
        full_name: p.full_name || '—',
        role: p.role || 'user',
        capsule_count: capsule_count || 0,
        total_spent,
        last_active: lastCap?.[0]?.created_at || p.created_at,
      }
    }))

    setUsers(enriched)
    setUserLoading(false)
  }, [])

  // ─── User actions ─────────────────────────────────────────
  const updateRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change role to "${newRole}"?`)) return
    setActionMsg(''); setActionError('')
    const res = await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    })
    const data = await res.json()
    if (data.error) setActionError(data.error)
    else { setActionMsg(`Role updated to ${newRole}`); loadUsers() }
  }

  const resetPassword = async (email: string) => {
    setActionMsg(''); setActionError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) setActionError(error.message)
    else setActionMsg(`Reset email sent to ${email}`)
  }

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    setActionMsg(''); setActionError('')
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    const data = await res.json()
    if (data.error) setActionError(data.error)
    else { setActionMsg(`User ${email} deleted`); loadUsers() }
  }

  const createUser = async () => {
    setActionMsg(''); setActionError('')
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (data.error) setActionError(data.error)
    else {
      setActionMsg(`User ${newUser.email} created`)
      setNewUser({ email: '', password: '', full_name: '' })
      setShowCreateUser(false)
      loadUsers()
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
    </div>
  )

  if (!authed) return null

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-stone-100">

      {/* Top nav */}
      <nav className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg tracking-wide">Capsology</span>
          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-full font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          {['dashboard', 'users', 'orders'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                tab === t ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
              }`}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'users' ? '👥 Users' : '📦 Orders'}
            </button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
          className="text-xs text-stone-400 hover:text-stone-700">
          Sign out
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <>
            {/* Period selector */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-medium text-stone-800">Sales overview</h1>
              <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
                {(['week','month','year','all'] as Period[]).map(p => (
                  <button key={p} onClick={() => { setPeriod(p); loadDashboard(p) }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                      period === p ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'
                    }`}>
                    {p === 'all' ? 'All time' : `This ${p}`}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                {[
                  { label: 'Total revenue',      value: `€${summary.total_revenue.toFixed(0)}`,        sub: 'service fees',       color: 'text-stone-900' },
                  { label: 'Unlock sales',        value: summary.unlock_count.toString(),               sub: `€${summary.unlock_revenue.toFixed(0)} revenue`,    color: 'text-blue-600' },
                  { label: 'Full service sales',  value: summary.fullservice_count.toString(),          sub: `€${summary.fullservice_revenue.toFixed(0)} revenue`, color: 'text-green-600' },
                  { label: 'Total capsules',      value: (summary.unlock_count + summary.fullservice_count).toString(), sub: 'paid capsules',    color: 'text-stone-700' },
                  { label: 'Affiliate est.',      value: `€${summary.affiliate_estimated.toFixed(0)}`,  sub: '~€12.60/capsule',   color: 'text-amber-600' },
                  { label: 'Total incl. aff.',    value: `€${(summary.total_revenue + summary.affiliate_estimated).toFixed(0)}`, sub: 'fees + commission', color: 'text-purple-600' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white border border-stone-200 rounded-xl p-4">
                    <p className="text-xs text-stone-400 mb-1">{kpi.label}</p>
                    <p className={`text-xl font-medium ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-xs text-stone-400 mt-1">{kpi.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bar chart */}
            {periodData.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
                <h2 className="text-sm font-medium text-stone-700 mb-4">Revenue by period</h2>
                <div className="flex items-end gap-2 h-40">
                  {periodData.map((d, i) => {
                    const maxRev = Math.max(...periodData.map(x => x.revenue), 1)
                    const h = Math.round((d.revenue / maxRev) * 100)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="relative w-full flex flex-col justify-end" style={{ height: '120px' }}>
                          <div className="w-full bg-stone-900 rounded-t-sm transition-all"
                            style={{ height: `${Math.max(h, 2)}%` }} />
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            €{d.revenue.toFixed(0)}
                          </div>
                        </div>
                        <span className="text-xs text-stone-400 text-center">{d.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-900 rounded-sm" />Total revenue (service fees)</span>
                </div>
              </div>
            )}

            {/* Tier breakdown */}
            {summary && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <h2 className="text-sm font-medium text-stone-700 mb-3">Sales by tier</h2>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-500">🔓 Unlock (€3)</span>
                        <span className="font-medium">{summary.unlock_count} sales</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${summary.unlock_count + summary.fullservice_count > 0 ? Math.round(summary.unlock_count / (summary.unlock_count + summary.fullservice_count) * 100) : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-500">📦 Full service (€15)</span>
                        <span className="font-medium">{summary.fullservice_count} sales</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full"
                          style={{ width: `${summary.unlock_count + summary.fullservice_count > 0 ? Math.round(summary.fullservice_count / (summary.unlock_count + summary.fullservice_count) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <h2 className="text-sm font-medium text-stone-700 mb-3">Revenue breakdown</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500">Unlock fees</span>
                      <span className="font-medium">€{summary.unlock_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500">Full service fees</span>
                      <span className="font-medium">€{summary.fullservice_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-stone-100 pt-2">
                      <span className="text-stone-500">Service fees total</span>
                      <span className="font-medium">€{summary.total_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500">Affiliate commission (est.)</span>
                      <span className="font-medium text-amber-600">€{summary.affiliate_estimated.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-stone-100 pt-2 font-medium">
                      <span>Total estimated</span>
                      <span className="text-green-600">€{(summary.total_revenue + summary.affiliate_estimated).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent payments */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100">
                <h2 className="text-sm font-medium text-stone-700">Recent payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      {['Date','Email','Tier','Amount','Status','Capsule ID'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {recentPayments.map((p, i) => (
                      <tr key={i} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-xs text-stone-600">{new Date(p.paid_at).toLocaleDateString('ro-RO')}</td>
                        <td className="px-4 py-2.5 text-xs text-stone-800">{p.guest_email || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.tier === 'unlock' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {p.tier === 'unlock' ? '🔓 Unlock' : '📦 Full service'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium text-stone-800">€{p.amount_eur?.toFixed(2)}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">✓ Paid</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-stone-400 font-mono">{p.capsule_id?.slice(0, 8)}...</td>
                      </tr>
                    ))}
                    {recentPayments.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-400">No payments yet in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-medium text-stone-800">User management</h1>
              <button onClick={() => setShowCreateUser(true)}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl hover:bg-stone-800">
                + Create user
              </button>
            </div>

            {/* Action messages */}
            {actionMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
                ✓ {actionMsg}
              </div>
            )}
            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                ✗ {actionError}
              </div>
            )}

            {/* Create user modal */}
            {showCreateUser && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
                <h2 className="text-sm font-medium text-stone-800 mb-4">Create new user</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { k: 'full_name', p: 'Full name', t: 'text' },
                    { k: 'email',     p: 'Email',     t: 'email' },
                    { k: 'password',  p: 'Password',  t: 'password' },
                  ].map(f => (
                    <input key={f.k} type={f.t} placeholder={f.p}
                      value={(newUser as any)[f.k]}
                      onChange={e => setNewUser(prev => ({ ...prev, [f.k]: e.target.value }))}
                      className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-500" />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={createUser}
                    className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800">
                    Create
                  </button>
                  <button onClick={() => setShowCreateUser(false)}
                    className="px-4 py-2 border border-stone-200 text-stone-600 text-xs rounded-lg hover:bg-stone-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
              <input type="text" placeholder="Search by email or name..."
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                className="w-full max-w-sm px-4 py-2.5 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-stone-400" />
            </div>

            {/* Users table */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      {['User','Role','Joined','Capsules','Spent','Last active','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-stone-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {userLoading ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-400 animate-pulse">Loading users...</td></tr>
                    ) : filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-stone-800">{user.full_name}</div>
                          <div className="text-xs text-stone-400">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-stone-100 text-stone-500'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-600">
                          {new Date(user.created_at).toLocaleDateString('ro-RO')}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-stone-800">{user.capsule_count}</td>
                        <td className="px-4 py-3 text-xs font-medium text-stone-800">€{user.total_spent.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-stone-500">
                          {new Date(user.last_active).toLocaleDateString('ro-RO')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => updateRole(user.id, user.role)}
                              className={`px-2.5 py-1 text-xs border rounded-lg ${
                                user.role === 'admin'
                                  ? 'border-purple-200 text-purple-600 hover:bg-purple-50'
                                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                              }`}>
                              {user.role === 'admin' ? '→ user' : '→ admin'}
                            </button>
                            <button onClick={() => resetPassword(user.email)}
                              className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50">
                              Reset pwd
                            </button>
                            <button onClick={() => deleteUser(user.id, user.email)}
                              className="px-2.5 py-1 text-xs border border-red-200 rounded-lg text-red-500 hover:bg-red-50">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!userLoading && filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-400">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-stone-100 text-xs text-stone-400">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} total
              </div>
            </div>
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <>
            <h1 className="text-lg font-medium text-stone-800 mb-5">Full service orders</h1>
            <FullServiceOrders supabase={supabase} />
          </>
        )}

      </div>
    </div>
  )
}

// ─── Full service orders component ───────────────────────────
function FullServiceOrders({ supabase }: { supabase: any }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('orders')
      .select('*, capsules(total_price_eur, items)')
      .order('created_at', { ascending: false })
      .then(({ data }: any) => { setOrders(data || []); setLoading(false) })
  }, [])

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  const statusColors: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700',
    ordered:   'bg-blue-50 text-blue-700',
    shipped:   'bg-purple-50 text-purple-700',
    delivered: 'bg-green-50 text-green-700',
  }

  if (loading) return <div className="text-center py-12 text-stone-400 text-sm animate-pulse">Loading orders...</div>

  return (
    <div className="space-y-3">
      {orders.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-400 text-sm">
          No full service orders yet
        </div>
      )}
      {orders.map(order => (
        <div key={order.id} className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-medium text-stone-800">{order.delivery_name}</div>
              <div className="text-xs text-stone-400 mt-0.5">
                {order.delivery_address?.line1}, {order.delivery_address?.city}, {order.delivery_address?.county} {order.delivery_address?.postal_code}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">{order.delivery_address?.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-stone-800">€{order.capsules?.total_price_eur?.toFixed(0)}</div>
              <div className="text-xs text-stone-400">{new Date(order.created_at).toLocaleDateString('ro-RO')}</div>
            </div>
          </div>

          {/* Items list */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {(order.capsules?.items || []).slice(0, 6).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                <img src={item.image_url} alt={item.name}
                  className="w-6 h-6 rounded object-cover bg-stone-200 flex-shrink-0" />
                <span className="text-xs text-stone-700 max-w-[100px] truncate">{item.name}</span>
                <span className="text-xs text-stone-400">€{item.price_eur?.toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Status + actions */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.status] || 'bg-stone-50 text-stone-500'}`}>
              {order.status}
            </span>
            {['pending','ordered','shipped','delivered'].map(s => (
              s !== order.status && (
                <button key={s} onClick={() => updateStatus(order.id, s)}
                  className="text-xs px-2.5 py-1 border border-stone-200 rounded-full text-stone-500 hover:bg-stone-50">
                  → {s}
                </button>
              )
            ))}
            <span className="text-xs text-stone-300 ml-auto font-mono">{order.id.slice(0, 8)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
function periodStart(p: Period): Date {
  const now = new Date()
  if (p === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7);   return d }
  if (p === 'month') { const d = new Date(now); d.setDate(1);                 return d }
  if (p === 'year')  { const d = new Date(now); d.setMonth(0); d.setDate(1);  return d }
  return new Date('2020-01-01')
}

function buildPeriodData(payments: any[], period: Period): PeriodData[] {
  if (period === 'week') {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    return days.map((label, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const dayPayments = payments.filter(p => {
        const pd = new Date(p.paid_at)
        return pd.toDateString() === d.toDateString()
      })
      return {
        label,
        unlock:       dayPayments.filter(p => p.tier === 'unlock').length,
        full_service: dayPayments.filter(p => p.tier === 'full_service').length,
        revenue:      dayPayments.reduce((s, p) => s + (p.amount_eur || 0), 0),
      }
    })
  }
  if (period === 'month') {
    const weeks = ['W1','W2','W3','W4']
    return weeks.map((label, i) => {
      const weekPayments = payments.filter(p => {
        const d = new Date(p.paid_at).getDate()
        return d >= i * 7 + 1 && d <= (i + 1) * 7
      })
      return {
        label,
        unlock:       weekPayments.filter(p => p.tier === 'unlock').length,
        full_service: weekPayments.filter(p => p.tier === 'full_service').length,
        revenue:      weekPayments.reduce((s, p) => s + (p.amount_eur || 0), 0),
      }
    })
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months.map((label, i) => {
    const monthPayments = payments.filter(p => new Date(p.paid_at).getMonth() === i)
    return {
      label,
      unlock:       monthPayments.filter(p => p.tier === 'unlock').length,
      full_service: monthPayments.filter(p => p.tier === 'full_service').length,
      revenue:      monthPayments.reduce((s, p) => s + (p.amount_eur || 0), 0),
    }
  })
}
