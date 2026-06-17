'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LangToggle, useLang } from '@/lib/lang'
import type { QuizAnswers } from '@/lib/types'

const STEPS = [
  { id: 'gender', label: 'Pentru cine?',     type: 'gender' },
  { id: 'budget', label: 'Bugetul tău',      type: 'budget' },
  { id: 'style',  label: 'Stilul tău',       type: 'style'  },
  { id: 'colors', label: 'Paleta de culori', type: 'colors' },
  { id: 'sizes',  label: 'Mărimile tale',    type: 'sizes'  },
] as const

const STYLES = [
  {
    id: 'minimalist', name: 'Minimalist', icon: '◻',
    desc: 'Linii curate, mai puțin înseamnă mai mult',
    tags: ['minimalist','clean','simple','sleek','refined','timeless','modern','pared-back','understated'],
    occasions: ['everyday','birou'],
  },
  {
    id: 'casual', name: 'Casual', icon: '◯',
    desc: 'Confortabil și relaxat pentru fiecare zi',
    tags: ['casual','relaxed','easy','weekend','street','urban','comfy','laid-back','athleisure'],
    occasions: ['weekend','casual zilnic','ieșiri'],
  },
  {
    id: 'elegant', name: 'Elegant', icon: '◆',
    desc: 'Rafinat, structurat, impecabil',
    tags: ['elegant','tailored','smart','polished','formal','chic','sharp','structured','business','workwear','office'],
    occasions: ['birou','seara','events'],
  },
  {
    id: 'artist', name: 'Artist', icon: '◈',
    desc: 'Creativ, expresiv, inconfundabil',
    tags: ['boho','bohemian','romantic','vintage','retro','eclectic','feminine','artistic','flowy','dreamy'],
    occasions: ['ieșiri','petrecere','weekend'],
  },
] as const

const COLOR_GROUPS = [
  {
    id: 'neutre', name: 'Tonuri neutre',
    desc: 'Bej, gri, crem, taupe, alb rupt',
    swatches: ['#F5F0E8','#E8E0D0','#C8BEA8','#A89880','#8A7A68'],
    tags: ['beige','cream','taupe','sand','ivory','off-white','stone','nude','ecru','linen','gray','grey','light gray'],
  },
  {
    id: 'pamantii', name: 'Culori pământii',
    desc: 'Camel, terra, rust, maro, kaki',
    swatches: ['#C8A882','#B08850','#8B5E3C','#6B4226','#C47A45'],
    tags: ['camel','brown','rust','terra','earthy','khaki','olive','tan','cognac','tobacco','copper','toffee'],
  },
  {
    id: 'vii', name: 'Culori vii',
    desc: 'Bleumarin, verde, burgundy, albastru',
    swatches: ['#2C4A7C','#3A6B4A','#6B2737','#1A5276','#8B4513'],
    tags: ['navy','dark blue','green','burgundy','emerald','forest green','deep red','wine','cobalt','teal','hunter'],
  },
  {
    id: 'nb', name: 'Negru & alb',
    desc: 'Contrast pur, alb, negru, gri antracit',
    swatches: ['#FFFFFF','#E8E8E8','#A0A0A0','#484848','#1A1A1A'],
    tags: ['black','white','charcoal','anthracite','monochrome','black and white','dark gray','off black'],
  },
] as const

export default function QuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [ans, setAns] = useState({
    gender: '' as string,
    budget: 200,
    styles: [] as string[],
    colors: [] as string[],
    size_top: 'M',
    size_bottom: 'M',
    size_shoes: '38',
  })

  const currentStep = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  const update = (key: string, val: any) => setAns(p => ({ ...p, [key]: val }))

  const toggleArr = (key: 'styles' | 'colors', val: string) => {
    const arr = ans[key]
    update(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const canGo = () => {
    if (currentStep.type === 'gender') return ans.gender !== ''
    if (currentStep.type === 'budget') return ans.budget > 0
    if (currentStep.type === 'style')  return ans.styles.length > 0
    if (currentStep.type === 'colors') return ans.colors.length > 0
    return true
  }

  const handleNext = useCallback(async () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return }

    setGenerating(true)
    try {
      const sessionId = crypto.randomUUID()
      sessionStorage.setItem('session_id', sessionId)

      // Flatten selected styles into tags + occasions for the AI
      const selectedStyles = STYLES.filter(s => ans.styles.includes(s.id))
      const styleTags     = selectedStyles.flatMap(s => s.tags)
      const occasionTags  = selectedStyles.flatMap(s => s.occasions)

      // Flatten selected color groups into individual color tags
      const colorTags = COLOR_GROUPS
        .filter(c => ans.colors.includes(c.id))
        .flatMap(c => c.tags)

      const finalAnswers: QuizAnswers = {
        gender:      ans.gender as any,
        budget:      ans.budget,
        style:       styleTags,
        colors:      colorTags,
        occasion:    occasionTags,
        avoid:       [],
        size_top:    ans.size_top,
        size_bottom: ans.size_bottom,
        size_shoes:  ans.size_shoes,
      }

      const res = await fetch('/api/generate-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Save quiz session to database (non-blocking — don't await)
      fetch('/api/quiz/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          session_id: sessionId,
          capsule_id: data.capsule_id,
        }),
      }).catch(() => {}) // silently fail — quiz still works

      sessionStorage.setItem('capsule_id', data.capsule_id)
      router.push(`/capsule/${data.capsule_id}`)
    } catch (err: any) {
      alert('Eroare: ' + err.message)
      setGenerating(false)
    }
  }, [step, ans, router])

  const avgPrice = Math.round(ans.budget / 10)
  const pieces   = ans.budget < 150 ? '6–8' : ans.budget < 250 ? '8–10' : ans.budget < 400 ? '10–12' : '12+'

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-md mx-auto">
      {/* Nav */}
      <div className="flex justify-between items-center px-5 py-4">
        <Link href="/" className="text-stone-400 hover:text-stone-700 text-sm">← Acasă</Link>
        <span className="font-display text-xl tracking-wide">capsule</span>
        <div className="flex items-center gap-2">
          <LangToggle />
          <span className="text-xs text-stone-500">Pasul {step + 1} din {STEPS.length}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-px bg-stone-200 mx-5">
        <div className="h-full bg-stone-900 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-7 pb-4 quiz-step" key={step}>
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-2">
          {currentStep.label}
        </p>

        {/* ── GENDER ── */}
        {currentStep.type === 'gender' && (
          <>
            <h2 className="font-display text-3xl font-light mb-2">Garderobă pentru <em>cine?</em></h2>
            <p className="text-sm text-stone-500 mb-6">Filtrăm catalogul în funcție de selecție.</p>
            <div className="space-y-2.5">
              {[
                { val: 'women',  icon: '👗', title: 'Femei',   desc: 'Colecții feminine'  },
                { val: 'men',    icon: '👔', title: 'Bărbați', desc: 'Colecții masculine' },
                { val: 'unisex', icon: '✦',  title: 'Unisex',  desc: 'Stil neutru'        },
              ].map(opt => (
                <button key={opt.val} onClick={() => update('gender', opt.val)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    ans.gender === opt.val
                      ? 'border-stone-800 bg-white'
                      : 'border-stone-200 bg-stone-50 hover:border-stone-400'
                  }`}>
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">{opt.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-800">{opt.title}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{opt.desc}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    ans.gender === opt.val ? 'bg-stone-800 border-stone-800' : 'border-stone-300'
                  }`}>
                    {ans.gender === opt.val && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── BUDGET ── */}
        {currentStep.type === 'budget' && (
          <>
            <h2 className="font-display text-3xl font-light mb-2">Care este <em>bugetul tău?</em></h2>
            <p className="text-sm text-stone-500 mb-5">Costul total al capsulei. Setează cu sliderul.</p>
            <div className="text-center mb-5">
              <span className="font-display text-6xl font-light text-stone-900">
                €{ans.budget}{ans.budget >= 500 ? '+' : ''}
              </span>
            </div>
            {/* Budget metadata cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-stone-100 rounded-xl p-3 text-center">
                <div className="text-xl font-medium text-stone-900">€{avgPrice}</div>
                <div className="text-xs text-stone-500 mt-1">preț mediu / piesă</div>
              </div>
              <div className="bg-stone-100 rounded-xl p-3 text-center">
                <div className="text-xl font-medium text-stone-900">{pieces}</div>
                <div className="text-xs text-stone-500 mt-1">piese în capsulă</div>
              </div>
            </div>
            <input type="range" min="80" max="500" step="10" value={ans.budget}
              onChange={e => update('budget', parseInt(e.target.value))}
              className="w-full accent-stone-800 mb-2" />
            <div className="flex justify-between text-xs text-stone-400">
              <span>€80</span><span>€290</span><span>€500+</span>
            </div>
          </>
        )}

        {/* ── STYLE + OCCASIONS combined ── */}
        {currentStep.type === 'style' && (
          <>
            <h2 className="font-display text-3xl font-light mb-2">Cum arată <em>viața ta de zi cu zi?</em></h2>
            <p className="text-sm text-stone-500 mb-4">Selectează stilurile care ți se potrivesc — poți alege mai multe.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {STYLES.map(st => {
                const on = ans.styles.includes(st.id)
                return (
                  <button key={st.id} onClick={() => toggleArr('styles', st.id)}
                    className={`relative text-left p-3 rounded-xl border transition-all ${
                      on ? 'border-stone-800 bg-white' : 'border-stone-200 bg-stone-50'
                    }`}>
                    {/* Check */}
                    <div className={`absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                      on ? 'bg-stone-800 border-stone-800' : 'border-stone-300'
                    }`} style={{ width: '18px', height: '18px' }}>
                      {on && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                    <div className="text-xl mb-1.5">{st.icon}</div>
                    <div className="text-sm font-medium text-stone-800 mb-1">{st.name}</div>
                    <div className="text-xs text-stone-500 leading-snug mb-2">{st.desc}</div>
                    <div className="flex flex-wrap gap-1">
                      {st.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full border border-stone-200 bg-white text-stone-500">{t}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
            {ans.styles.length > 0 && (
              <p className="text-xs text-stone-500 mt-3 text-center">
                <span className="font-medium text-stone-800">{ans.styles.length}</span> {ans.styles.length === 1 ? 'stil selectat' : 'stiluri selectate'}
              </p>
            )}
          </>
        )}

        {/* ── COLORS ── */}
        {currentStep.type === 'colors' && (
          <>
            <h2 className="font-display text-3xl font-light mb-2">Ce <em>culori</em> preferi?</h2>
            <p className="text-sm text-stone-500 mb-4">Capsula va fi construită în jurul paletei tale.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {COLOR_GROUPS.map(col => {
                const on = ans.colors.includes(col.id)
                return (
                  <button key={col.id} onClick={() => toggleArr('colors', col.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      on ? 'border-stone-800 bg-white' : 'border-stone-200 bg-stone-50'
                    }`}>
                    {/* Color swatches */}
                    <div className="flex gap-1 mb-2.5">
                      {col.swatches.map((sw, i) => (
                        <div key={i} className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ background: sw, border: sw === '#FFFFFF' ? '0.5px solid #ccc' : 'none' }} />
                      ))}
                    </div>
                    <div className="text-sm font-medium text-stone-800 mb-1">{col.name}</div>
                    <div className="text-xs text-stone-500 leading-snug">{col.desc}</div>
                  </button>
                )
              })}
            </div>
            {ans.colors.length > 0 && (
              <p className="text-xs text-stone-500 mt-3 text-center">
                <span className="font-medium text-stone-800">{ans.colors.length}</span> {ans.colors.length === 1 ? 'paletă selectată' : 'palete selectate'}
              </p>
            )}
          </>
        )}

        {/* ── SIZES ── */}
        {currentStep.type === 'sizes' && (
          <>
            <h2 className="font-display text-3xl font-light mb-2">Care sunt <em>mărimile</em> tale?</h2>
            <p className="text-sm text-stone-500 mb-6">Filtrăm strict pe mărimile disponibile în stoc.</p>
            <div className="space-y-5">
              {[
                { label: 'Bluze & topuri', key: 'size_top',    opts: ['XS','S','M','L','XL','XXL'] },
                { label: 'Pantaloni & fuste', key: 'size_bottom', opts: ['XS','S','M','L','XL','XXL'] },
                { label: 'Pantofi (EU)',    key: 'size_shoes',  opts: ['36','37','38','39','40','41','42','43'] },
              ].map(g => (
                <div key={g.key}>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-2">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.opts.map(o => (
                      <button key={o} onClick={() => update(g.key, o)}
                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                          (ans as any)[g.key] === o
                            ? 'border-stone-800 bg-white text-stone-800 font-medium'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-3 border-t border-stone-100">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="text-xs text-stone-400 mb-3 block hover:text-stone-600">
            ← Înapoi
          </button>
        )}
        <button onClick={handleNext} disabled={!canGo() || generating}
          className={`w-full py-4 rounded-xl text-sm font-medium transition-all ${
            canGo() && !generating
              ? 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}>
          {generating ? 'Se generează capsula...'
            : step === STEPS.length - 1 ? 'Generează capsula mea →'
            : 'Continuă'}
        </button>
        <div className="flex justify-center gap-1.5 mt-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-4 bg-stone-800' : i < step ? 'w-1.5 bg-stone-500' : 'w-1.5 bg-stone-300'
            }`} />
          ))}
        </div>
      </div>
    </div>
  )
}
