'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

function ThanksInner() {
  const nr = useSearchParams().get('nr')

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />

      <div className="max-w-lg mx-auto px-6 py-20 text-center">

        <img src="/brand/icons/success-check-black.svg" alt=""
          className="w-14 h-14 mx-auto mb-8" />

        <h1 className="text-3xl font-bold mb-4">Am primit cererea ta.</h1>

        <p className="text-ink/60 leading-relaxed mb-10">
          Un stilist se uită peste preferințele tale și îți construiește capsula
          manual. Îți ajunge pe email în maximum 48 de ore.
        </p>

        {nr && (
          <div className="inline-block bg-white border border-border-line rounded-card px-5 py-3 mb-10">
            <div className="text-[11px] text-ink/45 mb-0.5">Referința ta</div>
            <div className="font-mono font-semibold">
              CERERE-{String(nr).padStart(3, '0')}
            </div>
          </div>
        )}

        <div className="bg-white border border-border-line rounded-card-lg p-6 text-left mb-8">
          <div className="text-sm font-semibold mb-4">Ce urmează</div>
          {[
            { n: '1', t: 'Analizăm preferințele tale', d: 'Buget, culori, ocazii, mărimi.' },
            { n: '2', t: 'Construim capsula manual',   d: 'Piese care se asortează între ele.' },
            { n: '3', t: 'Primești capsula pe email',  d: 'Cu linkuri directe către magazine.' },
          ].map(s => (
            <div key={s.n} className="flex gap-3.5 mb-4 last:mb-0">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                {s.n}
              </span>
              <div>
                <div className="text-sm font-medium mb-0.5">{s.t}</div>
                <div className="text-xs text-ink/50">{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink/45 mb-8">
          Verifică și folderul de spam. Scriem de la
          <span className="text-ink/70"> salut@capsology.ro</span>
        </p>

        <Link href="/"
          className="inline-block border border-border-line rounded-btn px-6 py-3 text-sm hover:bg-white transition">
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  )
}

export default function ThanksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-warm-white" />}>
      <ThanksInner />
    </Suspense>
  )
}
