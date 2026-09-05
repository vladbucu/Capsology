import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, accessLinkEmail } from '@/lib/email'

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

export async function POST(req: NextRequest) {
  if (!await isAdmin())
    return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })

  try {
    const { capsule_id, capsule, items } = await req.json()

    if (!capsule?.user_id)
      return NextResponse.json({ error: 'Alege un utilizator.' }, { status: 400 })

    const payload = {
      user_id:          capsule.user_id,
      request_id:       capsule.request_id || null,
      title:            capsule.title || 'Capsulă personalizată',
      description:      capsule.description || null,
      unlock_price_ron: capsule.unlock_price_ron ?? 49,
      is_published:     !!capsule.is_published,
      published_at:     capsule.is_published ? new Date().toISOString() : null,
      status:           capsule.is_published ? 'published' : 'draft',
    }

    let cid = capsule_id

    // Starea de dinainte de salvare — ca sa trimitem emailul de acces o singura data
    let alreadySentAccessEmail = false
    if (cid) {
      const { data: existing } = await admin.from('capsules')
        .select('access_email_sent_at').eq('id', cid).maybeSingle()
      alreadySentAccessEmail = !!existing?.access_email_sent_at
    }

    if (!cid) {
      const { data, error } = await admin.from('capsules').insert(payload).select('id').single()
      if (error) throw error
      cid = data.id
    } else {
      const { error } = await admin.from('capsules').update(payload).eq('id', cid)
      if (error) throw error
    }

    // ── Articole ────────────────────────────────────────
    const toDelete = items.filter((i: any) => i._deleted && i.id).map((i: any) => i.id)
    if (toDelete.length)
      await admin.from('capsule_items').delete().in('id', toDelete)

    const live = items.filter((i: any) => !i._deleted)

    for (const [pos, it] of live.entries()) {
      const row = {
        capsule_id:  cid,
        position:    pos,
        name:        it.name || 'Articol',
        brand:       it.brand || null,
        category:    it.category || 'tops',
        price_ron:   Number(it.price_ron) || 0,
        image_url:   it.image_url || null,
        product_url: it.product_url || null,
        colours:     it.colours || [],
        size_label:  it.size_label || null,
        notes:       it.notes || null,
        is_unlocked: !!it.is_unlocked,
        updated_at:  new Date().toISOString(),
      }
      if (it.id) await admin.from('capsule_items').update(row).eq('id', it.id)
      else       await admin.from('capsule_items').insert(row)
    }

    // Marcheaza cererea ca trimisa
    if (payload.is_published && capsule.request_id) {
      await admin.from('capsule_requests')
        .update({ status: 'sent', sent_at: new Date().toISOString(), capsule_id: cid })
        .eq('id', capsule.request_id)
    }

    // ── Email cu link de logare — doar la prima publicare ─
    let warning: string | undefined
    if (payload.is_published && !alreadySentAccessEmail) {
      try {
        const { data: prof } = await admin.from('profiles')
          .select('email, full_name').eq('id', payload.user_id).maybeSingle()

        if (!prof?.email) {
          warning = 'email_no_address'
        } else {
          const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: prof.email,
            options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/seteaza-pin` },
          })
          const actionLink = link?.properties?.action_link
          if (linkErr || !actionLink) {
            warning = 'email_link_failed'
            console.error('admin/capsule: generateLink', linkErr?.message)
          } else {
            const sent = await sendEmail({
              to: prof.email,
              subject: 'Capsula ta Capsology e gata',
              html: accessLinkEmail({
                firstName: (prof.full_name || '').split(' ')[0] || undefined,
                actionLink,
                capsuleTitle: payload.title,
              }),
            })
            if (sent.ok) {
              await admin.from('capsules')
                .update({ access_email_sent_at: new Date().toISOString() }).eq('id', cid)
            } else {
              warning = 'email_failed'
            }
          }
        }
      } catch (mailErr: any) {
        warning = 'email_failed'
        console.error('admin/capsule: email acces esuat:', mailErr?.message || mailErr)
      }
    }

    return NextResponse.json({ ok: true, capsule_id: cid, warning })

  } catch (e: any) {
    console.error('admin/capsule:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
