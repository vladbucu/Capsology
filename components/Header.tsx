'use client'
import Link from 'next/link'

const NAV = [
  { href: '/#cum-functioneaza', label: 'Cum funcționează' },
  { href: '/#intrebari',        label: 'Întrebări' },
  { href: '/#despre',           label: 'Despre noi' },
]

export default function Header() {
  return (
    <header className="bg-ink text-white sticky top-0 z-50">
      <div className="max-w-content mx-auto px-6 lg:px-12 h-[72px] flex items-center justify-between">

        <Link href="/" aria-label="Capsology — acasă" className="flex items-center">
          <img
            src="/brand/logo/wordmark-white.svg"
            alt="CAPSOLOGY"
            className="h-[18px] w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className="text-sm text-white/60 hover:text-white transition">
              {n.label}
            </Link>
          ))}
        </nav>

        <Link href="/quiz"
          className="text-xs font-medium bg-white text-ink rounded-btn px-4 py-2.5 hover:bg-white/90 transition">
          Capsula mea gratuită
        </Link>
      </div>
    </header>
  )
}
