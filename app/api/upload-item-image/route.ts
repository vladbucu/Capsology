import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  if (!await isAdmin())
    return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const itemId = formData.get('itemId') as string

    if (!file || !itemId)
      return NextResponse.json({ error: 'Lipsește file sau itemId' }, { status: 400 })

    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'Fișierul e prea mare (max 5MB)' }, { status: 400 })

    // Citeșe ca buffer
    const buffer = await file.arrayBuffer()

    // Generează nume unic (timestamp + itemId)
    const ext = file.type.includes('jpeg') ? 'jpg' : 'png'
    const fileName = `${Date.now()}-${itemId}.${ext}`
    const path = `item-images/${fileName}`

    // Upload în Supabase Storage
    const { error: uploadErr } = await admin.storage
      .from('item-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadErr)
      throw new Error(`Upload failed: ${uploadErr.message}`)

    // Generează URL semnat (24 ore)
    const { data: signedData, error: signErr } = await admin.storage
      .from('item-images')
      .createSignedUrl(path, 86400) // 24 * 60 * 60 secunde

    if (signErr || !signedData?.signedUrl)
      throw new Error(`Signed URL failed: ${signErr?.message}`)

    return NextResponse.json({ imageUrl: signedData.signedUrl, fileName })
  } catch (e: any) {
    console.error('upload-item-image:', e?.message || e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
