'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || '/profile'
  const capsuleId    = searchParams.get('capsule_id') || ''

  useEffect(() => {
    async function handle() {
      const supabase = createClient()

      // Wait for Supabase to exchange the OAuth code for a session
      const { data: { session } } = await supabase.auth.getSession()

      if (session && capsuleId) {
        // Associate anonymous capsule with this user account
        await fetch('/api/capsule/associate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ capsule_id: capsuleId }),
        })
      }

      router.replace(redirectTo)
    }
    handle()
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-stone-500">Se finalizează autentificarea...</p>
      </div>
    </div>
  )
}
