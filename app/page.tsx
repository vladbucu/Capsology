'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { ALL_COLOURS } from '@/lib/constants'

// 3 poze locale cu ciclare la 3 secunde
const HERO_IMAGES = [
  '/hero/hero-1.jpg',
  '/hero/hero-2.jpg',
  '/hero/hero-3.jpg',
]

// Subset reprezentativ pe homepage; paleta completa e in formular
const COLOURS = ALL_COLOURS.filter(c =>
  ['negru', 'alb', 'gri', 'bej', 'camel', 'olive', 'bleumarin', 'denim'].includes(c.id)
)

export default function HomePage() {
  const router = useRouter()
  const [budget, setBudget]   = useState(600)
  const [colours, setColours] = useState<string[]>(['negru', 'alb'])
  const [heroImageIdx, setHeroImageIdx] = useState(0)

  // Ciclare imagini hero la fiecare 3 secunde
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIdx(prev => (prev + 1) % HERO_IMAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const toggleColour = (id: string) =>
    setColours(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])

  const start = () =>
    router.push(`/quiz?budget=${budget}&colors=${colours.join(',')}`)

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="bg-ink text-white">
        <div className="max-w-content mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-10 items-center pt-16 pb-12">

            <div>
              <span className="inline-block text-[11px] tracking-[0.14em] uppercase border border-white/20 rounded-full px-4 py-1.5 mb-8 text-white/70">
                Primele capsule sunt gratuite
              </span>

              <h1 className="text-hero font-bold mb-6">
                Arată bine.<br />Fără să te complici.
              </h1>

              <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-md">
                Spune-ne bugetul și stilul tău. Un stilist îți construiește
                o capsulă completă și ți-o trimite în 48 de ore.
              </p>

              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { icon: '/brand/icons/budget-white.svg',         t: 'Pentru orice buget',  d: 'De la 250 la 2500 RON' },
                  { icon: '/brand/icons/palette-colors-white.svg', t: 'Stil personalizat',   d: 'Alegi culorile, noi restul' },
                  { icon: '/brand/icons/capsule-outfit-white.svg', t: 'Capsulă completă',    d: 'Piese care se asortează' },
                ].map(f => (
                  <div key={f.t}>
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center mb-3">
                      <img src={f.icon} alt="" className="w-[18px] h-[18px]" />
                    </div>
                    <div className="text-sm font-semibold mb-1">{f.t}</div>
                    <div className="text-xs text-white/50 leading-relaxed">{f.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="aspect-[4/5] w-full max-w-[420px] rounded-card-lg bg-dark-grey
                              relative overflow-hidden">

                {/* Fallback */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <img src="/brand/logo/mark-white.svg" alt="" className="w-[40%] h-[40%] opacity-15" />
                </div>

                {/* Carousel de 3 poze cu ciclare la 3s */}
                {HERO_IMAGES.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="Ținută old money"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                      i === heroImageIdx ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer" />
                ))}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent px-5 pt-10 pb-4 z-10">
                  <p className="text-xs text-white/85 leading-relaxed">
                    O capsulă = o garderobă completă, cu piese care se asortează între ele.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── SELECTOR ─────────────────────────────── */}
          <div className="bg-dark-grey rounded-card-lg p-6 lg:p-8 mb-16">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">

              <div>
                <div className="text-sm text-white/50 mb-5">1. Alege bugetul</div>
                <div className="text-4xl font-bold mb-5 text-center">
                  {budget} <span className="text-2xl font-medium">RON</span>
                </div>
                <input type="range" min={250} max={2500} step={50}
                  value={budget} onChange={e => setBudget(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer" />
                <div className="flex justify-between text-xs text-white/40 mt-2">
                  <span>250 RON</span><span>2500+ RON</span>
                </div>
              </div>

              <div>
                <div className="text-sm text-white/50 mb-5">2. Alege paleta</div>
                <div className="flex flex-wrap gap-3">
                  {COLOURS.map(c => {
                    const on = colours.includes(c.id)
                    return (
                      <button key={c.id} onClick={() => toggleColour(c.id)}
                        aria-label={c.id} aria-pressed={on}
                        className={`w-11 h-11 rounded-full transition-all ${
                          on ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-grey scale-105'
                             : 'ring-1 ring-white/20 hover:ring-white/40'
                        }`}
                        style={{ background: c.hex }} />
                    )
                  })}
                </div>
                <p className="text-xs text-white/40 mt-4">
                  {colours.length === 0 ? 'Selectează cel puțin o culoare' : `${colours.length} culori selectate`}
                </p>
              </div>

              <div className="flex flex-col justify-between">
                <div className="text-sm text-white/50 mb-5">3. Primești capsula</div>
                <button onClick={start} disabled={colours.length === 0}
                  className="w-full bg-white text-ink rounded-btn py-4 px-6 font-semibold text-sm
                             hover:bg-white/90 active:scale-[0.99] transition-all
                             disabled:opacity-30 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2">
                  Vreau capsula mea <span>→</span>
                </button>
                <p className="text-[11px] text-white/40 text-center mt-3">
                  Gratuit · Fără card · În 48 de ore
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CUM FUNCTIONEAZA ──────────────────────────── */}
      <section id="cum-functioneaza" className="max-w-content mx-auto px-6 lg:px-12 py-20">
        <h2 className="text-section font-bold text-center mb-4">Cum funcționează</h2>
        <p className="text-sm text-ink/55 text-center mb-14 max-w-md mx-auto">
          Fără algoritmi. Un om se uită peste preferințele tale
          și alege fiecare piesă.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: '01', t: 'Completezi formularul', d: 'Buget, culori, ocazii, mărimi. Durează două minute.' },
            { n: '02', t: 'Construim capsula',     d: 'Un stilist alege piesele și verifică să se asorteze.' },
            { n: '03', t: 'O primești pe email',   d: 'În maximum 48 de ore, cu linkuri către magazine.' },
          ].map(s => (
            <div key={s.n}>
              <div className="text-[11px] font-mono text-olive mb-3">{s.n}</div>
              <div className="font-semibold mb-2">{s.t}</div>
              <p className="text-sm text-ink/55 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTREBARI ─────────────────────────────────── */}
      <section id="intrebari" className="bg-white border-y border-border-line">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <h2 className="text-section font-bold mb-12 text-center">Întrebări frecvente</h2>

          <div className="space-y-7">
            {[
              { q: 'Chiar e gratuit?',
                a: 'Da. Primele capsule sunt gratuite pentru că suntem la început și vrem să înțelegem ce își doresc oamenii. Nu îți cerem datele cardului.' },
              { q: 'Cine construiește capsula?',
                a: 'Un om, manual. Nu folosim încă generare automată — preferăm să livrăm ceva bun decât ceva rapid.' },
              { q: 'Trebuie să cumpăr ceva?',
                a: 'Nu. Primești capsula cu linkuri către magazine. Cumperi doar dacă îți place, direct de la magazin.' },
              { q: 'Ce fac cu datele mele?',
                a: 'Le folosim doar ca să-ți construim capsula. Nu le vindem și nu le dăm nimănui. Poți cere ștergerea lor oricând.' },
              { q: 'Cât durează?',
                a: 'Maximum 48 de ore. De obicei mai puțin.' },
            ].map(f => (
              <div key={f.q}>
                <div className="font-semibold mb-2">{f.q}</div>
                <p className="text-sm text-ink/55 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESPRE ────────────────────────────────────── */}
      <section id="despre" className="max-w-content mx-auto px-6 lg:px-12 py-20 text-center">
        <img src="/brand/logo/mark-black.svg" alt="" className="w-10 h-10 mx-auto mb-7" />
        <h2 className="text-section font-bold mb-5">Mai puține alegeri. Mai mult stil.</h2>
        <p className="text-ink/55 leading-relaxed max-w-lg mx-auto mb-10">
          Capsology pornește de la o idee simplă: majoritatea bărbaților nu au nevoie
          de mai multe opțiuni, ci de alegerile potrivite. Noi le facem pentru tine.
        </p>
        <Link href="/quiz"
          className="inline-block bg-ink text-white rounded-btn px-8 py-4 text-sm font-semibold hover:bg-dark-grey transition">
          Începe cu capsula gratuită →
        </Link>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="bg-ink text-white">
        <div className="max-w-content mx-auto px-6 lg:px-12 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <img src="/brand/logo/wordmark-white.svg" alt="CAPSOLOGY" className="h-[15px] w-auto" />
            <div className="flex gap-6 text-xs text-white/50">
              <Link href="/terms" className="hover:text-white transition">Termeni</Link>
              <Link href="/confidentialitate" className="hover:text-white transition">Confidențialitate</Link>
              <a href="mailto:salut@capsology.ro" className="hover:text-white transition">Contact</a>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center">
            <p className="text-[11px] text-white/35">
              © 2026 97 Hub SRL · Capsology · capsology.ro
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
