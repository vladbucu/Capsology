import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      first_name, last_name, email, phone,
      budget, colors, styles, occasions,
      size_top, size_bottom, size_shoes, notes,
      consent_marketing,
    } = body

    // ── Validare ──────────────────────────────────────────
    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json({ error: 'Numele și prenumele sunt obligatorii.' }, { status: 400 })
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Adresa de email nu pare validă.' }, { status: 400 })
    }
    if (!budget || budget < 250) {
      return NextResponse.json({ error: 'Bugetul minim este 250 RON.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Anti-duplicat: aceeasi adresa in ultimele 24h ─────
    const dayAgo = new Date(Date.now() - 86400000).toISOString()
    const { data: recent } = await supabase
      .from('capsule_requests')
      .select('id')
      .eq('email', cleanEmail)
      .gte('created_at', dayAgo)
      .limit(1)

    if (recent?.length) {
      return NextResponse.json({
        error: 'Am primit deja o cerere de la această adresă în ultimele 24 de ore. Îți pregătim capsula.',
      }, { status: 429 })
    }

    const { data, error } = await supabase
      .from('capsule_requests')
      .insert({
        first_name: first_name.trim(),
        last_name:  last_name.trim(),
        email:      cleanEmail,
        phone:      phone?.trim() || null,
        budget_ron: budget,
        colors:     colors    || [],
        styles:     styles    || [],
        occasions:  occasions || [],
        size_top, size_bottom, size_shoes,
        notes:      notes?.trim() || null,
        consent_marketing: !!consent_marketing,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) || null,
      })
      .select('id, request_number')
      .single()

    if (error) {
      console.error('capsule_requests insert:', error)
      return NextResponse.json({ error: 'Nu am putut salva cererea. Încearcă din nou.' }, { status: 500 })
    }

    // ── Cont client + capsula-ciorna (best-effort) ────────
    // Esecul aici NU strica raspunsul catre client: cererea e deja salvata.
    try {
      // 1. Find-or-create user Supabase (fara parola, email confirmat)
      let userId: string | null = null
      const created = await supabase.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: { full_name: `${first_name.trim()} ${last_name.trim()}`.trim() },
      })
      if (created.data?.user) {
        userId = created.data.user.id
      } else {
        // user existent -> ia id-ul din profiles (email deja normalizat la signup)
        const { data: prof } = await supabase
          .from('profiles').select('id').eq('email', cleanEmail).maybeSingle()
        userId = prof?.id ?? null
      }

      if (userId) {
        // 2. leaga cererea de user
        await supabase.from('capsule_requests')
          .update({ user_id: userId }).eq('id', data.id)

        // 3. capsula-ciorna, vizibila imediat in /admin -> tab "Capsule"
        const { data: caps } = await supabase
          .from('capsules')
          .insert({
            user_id:          userId,
            request_id:       data.id,
            title:            `Capsulă ${first_name.trim()}`,
            unlock_price_ron: 49,
            is_published:     false,
            status:           'draft',
            items:            [], // coloana veche NOT NULL; modelul curatat foloseste capsule_items
          })
          .select('id')
          .single()

        // 4. leaga capsula de cerere
        if (caps?.id) {
          await supabase.from('capsule_requests')
            .update({ capsule_id: caps.id }).eq('id', data.id)
        }
      } else {
        console.error('capsule-request: nu am putut obtine user_id pentru', cleanEmail, created.error?.message)
      }
    } catch (chainErr: any) {
      console.error('capsule-request: creare cont/capsula esuata:', chainErr?.message || chainErr)
    }

    return NextResponse.json({
      ok: true,
      request_id:     data.id,
      request_number: data.request_number,
    })

  } catch (e: any) {
    console.error('capsule-request:', e)
    return NextResponse.json({ error: 'Eroare de server.' }, { status: 500 })
  }
}
