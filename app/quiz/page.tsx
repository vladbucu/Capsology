'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import {
  COLOUR_GROUPS, STYLES, OCCASIONS,
  SIZES_TOP, SIZES_BOTTOM, SIZES_SHOES,
} from '@/lib/constants'

const STEPS = ['Buget', 'Culori', 'Ocazii', 'Stil', 'Mărimi', 'Contact']

function QuizInner() {
  const router = useRouter()
  const params = useSearchParams()

  const [step, setStep] = useState(0)
  const [budget, setBudget]       = useState(Number(params.get('budget')) || 1000)
  const [colours, setColours]     = useState<string[]>(
    params.get('colors')?.split(',').filter(Boolean) || []
  )
  const [occasions, setOccasions] = useState<string[]>([])
  const [styles, setStyles]       = useState<string[]>([])
  const [sizeTop, setSizeTop]       = useState('')
  const [sizeBottom, setSizeBottom] = useState('')
  const [sizeShoes, setSizeShoes]   = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [notes, setNotes]         = useState('')
  const [consentTerms, setConsentTerms]         = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

  const canProceed = [
    budget >= 250,
    colours.length > 0,
    occasions.length > 0,
    styles.length > 0,
    !!(sizeTop && sizeBottom && sizeShoes),
    !!(firstName.trim() && lastName.trim() && emailValid && consentTerms),
  ][step]

  const submit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/capsule-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName, last_name: lastName, email, phone,
          budget, colors: colours, styles, occasions,
          size_top: sizeTop, size_bottom: sizeBottom, size_shoes: sizeShoes,
          notes, consent_marketing: consentMarketing,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/multumim?nr=${data.request_number}`)
    } catch (e: any) {
      setError(e.message || 'Ceva n-a mers. Încearcă din nou.')
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <div className="flex flex-col items-center justify-center py-40 gap-5">
        <div className="w-8 h-8 border-2 border-border-line border-t-ink rounded-full animate-spin" />
        <div className="text-center">
          <div className="font-semibold mb-1">Îți înregistrăm cererea</div>
          <div className="text-sm text-ink/50">Un moment…</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-[3px] rounded-full transition-all ${i <= step ? 'bg-ink' : 'bg-border-line'}`} />
              <div className={`text-[10px] mt-2 ${i === step ? 'text-ink font-medium' : 'text-ink/35'}`}>
                {s}
              </div>
            </div>
          ))}
        </div>

        {/* ── 1. BUGET ─────────────────────────────────── */}
        {step === 0 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold mb-3">Cât vrei să cheltui?</h1>
            <p className="text-sm text-ink/55 mb-10">
              Construim o capsulă completă care se încadrează în acest buget.
            </p>
            <div className="bg-white rounded-card-lg border border-border-line p-7">
              <div className="text-5xl font-bold text-center mb-7">
                {budget} <span className="text-2xl font-medium text-ink/50">RON</span>
              </div>
              <input type="range" min={250} max={2500} step={50}
                value={budget} onChange={e => setBudget(Number(e.target.value))}
                className="w-full accent-ink cursor-pointer" />
              <div className="flex justify-between text-xs text-ink/40 mt-2">
                <span>250 RON</span><span>2500+ RON</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. CULORI ────────────────────────────────── */}
        {step === 1 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold mb-3">Ce culori porți?</h1>
            <p className="text-sm text-ink/55 mb-8">
              Selectează oricâte vrei. Paleta e gândită pentru piese clasice,
              care se asortează între ele.
            </p>

            {COLOUR_GROUPS.map(g => (
              <div key={g.group} className="mb-7">
                <div className="text-[11px] uppercase tracking-[0.1em] text-ink/40 mb-3">
                  {g.group}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {g.colours.map(c => {
                    const on = colours.includes(c.id)
                    return (
                      <button key={c.id} onClick={() => toggle(colours, setColours, c.id)}
                        aria-pressed={on}
                        className={`rounded-card border p-2 transition-all ${
                          on ? 'border-ink bg-white shadow-subtle' : 'border-border-line bg-white hover:border-ink/25'
                        }`}>
                        <span className="block w-full aspect-square rounded-md mb-1.5 border border-border-line/60"
                          style={{ background: c.hex }} />
                        <span className="text-[10px] leading-tight block">{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <p className="text-xs text-ink/45">
              {colours.length === 0
                ? 'Selectează cel puțin o culoare'
                : `${colours.length} ${colours.length === 1 ? 'culoare selectată' : 'culori selectate'}`}
            </p>
          </div>
        )}

        {/* ── 3. OCAZII ────────────────────────────────── */}
        {step === 2 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold mb-3">Pentru ce ocazii?</h1>
            <p className="text-sm text-ink/55 mb-8">Poți alege mai multe.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {OCCASIONS.map(o => {
                const on = occasions.includes(o)
                return (
                  <button key={o} onClick={() => toggle(occasions, setOccasions, o)}
                    className={`rounded-card border p-5 font-medium transition-all ${
                      on ? 'bg-ink text-white border-ink' : 'bg-white border-border-line hover:border-ink/25'
                    }`}>
                    {o}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 4. STIL ──────────────────────────────────── */}
        {step === 3 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold mb-3">Ce stil te reprezintă?</h1>
            <p className="text-sm text-ink/55 mb-8">Poți alege mai multe.</p>
            <div className="space-y-3">
              {STYLES.map(st => {
                const on = styles.includes(st.id)
                return (
                  <button key={st.id} onClick={() => toggle(styles, setStyles, st.id)}
                    aria-pressed={on}
                    className={`w-full rounded-card border p-5 text-left transition-all ${
                      on ? 'bg-ink text-white border-ink' : 'bg-white border-border-line hover:border-ink/25'
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-[18px] h-[18px] rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        on ? 'bg-white border-white' : 'border-border-line'
                      }`}>
                        {on && <span className="text-ink text-[10px] leading-none">✓</span>}
                      </span>
                      <div>
                        <div className="font-semibold mb-1">{st.label}</div>
                        <div className={`text-xs leading-relaxed ${on ? 'text-white/65' : 'text-ink/55'}`}>
                          {st.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 5. MARIMI ────────────────────────────────── */}
        {step === 4 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold mb-3">Ce mărimi porți?</h1>
            <p className="text-sm text-ink/55 mb-8">Ca să-ți alegem doar ce ți se potrivește.</p>
            {[
              { label: 'Tricouri și cămăși', opts: SIZES_TOP,    val: sizeTop,    set: setSizeTop },
              { label: 'Pantaloni',          opts: SIZES_BOTTOM, val: sizeBottom, set: setSizeBottom },
              { label: 'Încălțăminte',       opts: SIZES_SHOES,  val: sizeShoes,  set: setSizeShoes },
            ].map(g => (
              <div key={g.label} className="mb-7">
                <div className="text-xs text-ink/50 mb-2.5">{g.label}</div>
                <div className="flex flex-wrap gap-2">
                  {g.opts.map(o => (
                    <button key={o} onClick={() => g.set(o)}
                      className={`px-4 py-2.5 rounded-btn border text-sm transition-all ${
                        g.val === o ? 'bg-ink text-white border-ink' : 'bg-white border-border-line hover:border-ink/25'
                      }`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 6. CONTACT ───────────────────────────────── */}
        {step === 5 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold mb-3">Unde îți trimitem capsula?</h1>
            <p className="text-sm text-ink/55 mb-8">
              O construim manual pentru tine și îți ajunge pe email
              în maximum <strong className="text-ink">48 de ore</strong>. Gratuit.
            </p>

            <div className="bg-white rounded-card-lg border border-border-line p-6 space-y-5">

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Prenume" required>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Andrei" autoComplete="given-name" className={inputCls} />
                </Field>
                <Field label="Nume" required>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Popescu" autoComplete="family-name" className={inputCls} />
                </Field>
              </div>

              <Field label="Email" required
                hint={email && !emailValid ? 'Adresa nu pare validă' : undefined}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="andrei@exemplu.ro" autoComplete="email"
                  className={`${inputCls} ${email && !emailValid ? 'border-[#DC2626]' : ''}`} />
              </Field>

              <Field label="Telefon" hint="Opțional — doar dacă preferi să te sunăm">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="07xx xxx xxx" autoComplete="tel" className={inputCls} />
              </Field>

              <Field label="Ceva ce ar trebui să știm?" hint="Opțional">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3} placeholder="Ex: evit culorile deschise, am nevoie de ceva pentru o nuntă…"
                  className={`${inputCls} resize-none`} />
              </Field>

              <div className="space-y-3 pt-1">
                <Check checked={consentTerms} onChange={setConsentTerms}>
                  Sunt de acord cu <a href="/terms" target="_blank" className="underline hover:text-ink">termenii
                  și condițiile</a> și cu prelucrarea datelor mele pentru a primi capsula.
                  <span className="text-[#DC2626]"> *</span>
                </Check>
                <Check checked={consentMarketing} onChange={setConsentMarketing}>
                  Vreau să primesc ocazional idei de stil și noutăți pe email.
                  Mă pot dezabona oricând.
                </Check>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-card px-4 py-3 text-sm text-[#B91C1C] mt-6">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-10">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-6 py-3.5 border border-border-line rounded-btn text-sm hover:bg-white transition">
              Înapoi
            </button>
          )}
          <button
            onClick={() => step === 5 ? submit() : setStep(s => s + 1)}
            disabled={!canProceed}
            className="flex-1 bg-ink text-white rounded-btn py-3.5 text-sm font-semibold
                       hover:bg-dark-grey transition disabled:opacity-25 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2">
            {step === 5 ? 'Trimite cererea' : 'Continuă'}
            <span className="opacity-60">→</span>
          </button>
        </div>

        {step === 5 && (
          <p className="text-[11px] text-ink/40 text-center mt-4 leading-relaxed">
            Nu îți cerem datele cardului. Capsula este gratuită și fără obligații.
          </p>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3 rounded-btn border border-border-line bg-warm-white text-sm ' +
  'placeholder:text-ink/30 focus:outline-none focus:border-ink transition'

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink/70 mb-1.5 block">
        {label}{required && <span className="text-[#DC2626]"> *</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-ink/40 mt-1 block">{hint}</span>}
    </label>
  )
}

function Check({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button type="button" role="checkbox" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-[18px] h-[18px] rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
          checked ? 'bg-ink border-ink' : 'bg-white border-border-line group-hover:border-ink/40'
        }`}>
        {checked && <span className="text-white text-[10px] leading-none">✓</span>}
      </button>
      <span className="text-[12px] text-ink/60 leading-relaxed">{children}</span>
    </label>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-warm-white" />}>
      <QuizInner />
    </Suspense>
  )
}
