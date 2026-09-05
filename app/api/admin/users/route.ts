import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function isAdmin(): Promise<boolean> {
  try {
    const { createServerComponentClient } = await import('@/lib/supabase')
    const sb = await createServerComponentClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    const { data } = await sb.from('profiles').select('role').eq('id', user.id).single()
    return data?.role === 'admin'
  } catch { return false }
}

// Lista completa de utilizatori. RLS pe `profiles` permite anon-ului sa vada
// doar propriul rand, deci dropdown-ul din editorul de capsula (client anon)
// vedea doar adminul. Aici citim cu service_role.
export async function GET() {
  if (!await isAdmin())
    return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })

  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data || [] })
}
