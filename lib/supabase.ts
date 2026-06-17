import { createBrowserClient } from '@supabase/ssr'

// ─── Browser client ───────────────────────────────────────────
// Use this in any Client Component ('use client')
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Server client ────────────────────────────────────────────
// Use this only in API routes and Server Components
// next/headers is imported dynamically to avoid build errors
export async function createServerComponentClient() {
  const { cookies } = await import('next/headers')
  const { createServerClient } = await import('@supabase/ssr')

  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
