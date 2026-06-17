'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'ro' | 'en'

interface LangContextType {
  lang: Lang
  toggle: () => void
  t: (ro: string, en: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'ro',
  toggle: () => {},
  t: (ro) => ro,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ro')

  useEffect(() => {
    const saved = localStorage.getItem('capsology_lang') as Lang
    if (saved === 'en' || saved === 'ro') setLang(saved)
  }, [])

  const toggle = () => {
    const next: Lang = lang === 'ro' ? 'en' : 'ro'
    setLang(next)
    localStorage.setItem('capsology_lang', next)
  }

  const t = (ro: string, en: string) => lang === 'en' ? en : ro

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)

// ─── Language toggle button component ─────────────────────────
export function LangToggle() {
  const { lang, toggle } = useLang()
  return (
    <button onClick={toggle}
      className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-full px-2.5 py-1 transition-all hover:border-stone-400"
      title={lang === 'ro' ? 'Switch to English' : 'Schimbă în română'}>
      <span className="text-base leading-none">{lang === 'ro' ? '🇷🇴' : '🇬🇧'}</span>
      <span className="font-medium uppercase tracking-wide">{lang === 'ro' ? 'RO' : 'EN'}</span>
    </button>
  )
}
