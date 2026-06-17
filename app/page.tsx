'use client'
import Link from 'next/link'
import { useLang, LangToggle } from '@/lib/lang'

export default function HomePage() {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 px-5 py-3 flex items-center justify-between">
        <span className="font-display text-xl tracking-wide">Capsology</span>
        <div className="flex items-center gap-3">
          <LangToggle />
          <Link href="/auth/login"
            className="text-xs text-stone-500 hover:text-stone-800">
            {t('Contul meu', 'My account')}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center max-w-lg mx-auto">
        <p className="text-xs uppercase tracking-widest text-stone-400 mb-4">
          {t('Asistent personal de stil', 'AI Personal Stylist')}
        </p>
        <h1 className="font-display text-5xl font-light text-stone-900 leading-tight mb-4">
          {t('Garderoba ta,\ncreată de AI', 'Your wardrobe,\ncurated by AI')}
        </h1>
        <p className="text-stone-500 text-base leading-relaxed mb-8">
          {t(
            'Răspunde la 5 întrebări despre stilul tău și primești o capsulă vestimentară personalizată din catalogul About You, Zalando și FashionDays.',
            'Answer 5 questions about your style and receive a personalized capsule wardrobe from About You, Zalando and FashionDays.'
          )}
        </p>
        <Link href="/quiz"
          className="px-8 py-4 bg-stone-900 text-white text-sm font-medium rounded-2xl hover:bg-stone-800 active:scale-[0.98] transition-all">
          {t('Creează capsula mea →', 'Create my capsule →')}
        </Link>
        <p className="text-xs text-stone-400 mt-4">
          {t('Gratuit să vizualizezi · €3 să deblochezi linkurile', 'Free to browse · €3 to unlock links')}
        </p>

        {/* How it works */}
        <div className="mt-16 grid grid-cols-3 gap-6 w-full">
          {[
            { icon: '◻', title: t('Quiz de stil', 'Style quiz'), desc: t('5 întrebări simple', '5 simple questions') },
            { icon: '◆', title: t('Capsulă AI', 'AI capsule'),  desc: t('8–12 piese coordonate', '8–12 coordinated pieces') },
            { icon: '◈', title: t('Cumpără',     'Shop'),        desc: t('Linkuri directe la magazine', 'Direct links to stores') },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl mb-2">{step.icon}</div>
              <div className="text-xs font-medium text-stone-700">{step.title}</div>
              <div className="text-xs text-stone-400 mt-1">{step.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-5 py-4 flex items-center justify-between text-xs text-stone-400">
        <span>© 2026 Robot Lab SRL · Capsology</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-stone-700">{t('Termeni', 'Terms')}</Link>
          <Link href="/auth/login" className="hover:text-stone-700">{t('Cont', 'Account')}</Link>
        </div>
      </footer>
    </div>
  )
}
