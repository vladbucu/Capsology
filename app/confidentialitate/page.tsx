import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politica de confidențialitate — Capsology',
  description: 'Cum prelucrează 97 HUB SRL datele personale în cadrul platformei Capsology.',
}

const COMPANY     = '97 HUB SRL'
const CUI         = 'CUI 55676566'
const REG_COM     = 'J2026057047007'
const SEDIU       = 'Aleea Istru 2, Bl. A14B, Sc. 3, Et. P, Ap. 32, Sector 6, București, cod 061912'
const BRAND       = 'Capsology'
const EMAIL_GDPR  = 'gdpr@capsology.ro'
const UPDATED     = '14 octombrie 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-stone-400 hover:text-stone-700 text-sm">← Acasă</Link>
        <span className="font-display text-lg tracking-wide">Capsology</span>
        <div className="w-16" />
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Document legal</p>
          <h1 className="font-display text-4xl font-light text-stone-900 mb-2">Politica de confidențialitate</h1>
          <p className="text-sm text-stone-500">Ultima actualizare: {UPDATED}</p>
        </div>

        <div className="space-y-8 text-stone-700 text-sm leading-relaxed">

          <Section title="1. Operatorul de date">
            <p>
              Datele personale sunt prelucrate de <strong>{COMPANY}</strong>, {CUI},
              număr de înregistrare la Registrul Comerțului <strong>{REG_COM}</strong>, cu sediul în{' '}
              <strong>{SEDIU}</strong>, în calitate de operator, pentru platforma {BRAND}.
            </p>
            <p>
              Solicitările privind datele personale se transmit la{' '}
              <a href={`mailto:${EMAIL_GDPR}`} className="underline">{EMAIL_GDPR}</a>.
            </p>
          </Section>

          <Section title="2. Categoriile de date colectate">
            <ul className="list-none space-y-1 ml-4">
              <Li>Date de identificare: adresă email, nume (opțional, la înregistrare)</Li>
              <Li>Date de contact și livrare: adresă, telefon (doar pentru Serviciul Complet)</Li>
              <Li>Date comportamentale din quiz: preferințe de stil, buget, culori, ocazii de purtare, mărimi</Li>
              <Li>Date tehnice: adresă IP, tip browser, pagini accesate (prin cookies de sesiune)</Li>
            </ul>
          </Section>

          <Section title="3. Temeiul juridic al prelucrării">
            <ul className="list-none space-y-1 ml-4">
              <Li>Art. 6(1)(b) GDPR — executarea contractului: pentru procesarea plăților și livrarea serviciilor</Li>
              <Li>Art. 6(1)(a) GDPR — consimțământ: pentru datele comportamentale din quiz utilizate la îmbunătățirea algoritmului</Li>
              <Li>Art. 6(1)(f) GDPR — interes legitim: pentru securitatea platformei și prevenirea fraudei</Li>
            </ul>
          </Section>

          <Section title="4. Datele de plată">
            <p>
              <strong>Datele de card</strong> sunt procesate exclusiv de Stripe Inc., în calitate de
              operator independent. {COMPANY} nu stochează, nu accesează și nu procesează direct niciun
              dat de card. Stripe este certificat PCI DSS Level 1.
            </p>
          </Section>

          <Section title="5. Drepturile utilizatorului">
            <ul className="list-none space-y-1 ml-4">
              <Li>Dreptul de acces (art. 15 GDPR)</Li>
              <Li>Dreptul la rectificare (art. 16 GDPR)</Li>
              <Li>Dreptul la ștergere („dreptul de a fi uitat") (art. 17 GDPR)</Li>
              <Li>Dreptul la restricționarea prelucrării (art. 18 GDPR)</Li>
              <Li>Dreptul la portabilitatea datelor (art. 20 GDPR)</Li>
              <Li>Dreptul de opoziție (art. 21 GDPR)</Li>
            </ul>
            <p>
              Solicitările se transmit la{' '}
              <a href={`mailto:${EMAIL_GDPR}`} className="underline">{EMAIL_GDPR}</a>.
              Răspundem în termen de maximum 30 de zile.
            </p>
            <p>
              Aveți dreptul de a depune o plângere la{' '}
              <strong>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
              (ANSPDCP)</strong>, cu sediul în Bd. G-ral. Gheorghe Magheru 28-30, București,{' '}
              <a href="https://www.dataprotection.ro" className="underline" target="_blank" rel="noopener noreferrer">
                www.dataprotection.ro
              </a>.
            </p>
          </Section>

          <Section title="6. Cookies și documente conexe">
            <p>
              Detalii despre cookies și despre celelalte condiții de utilizare a platformei sunt în{' '}
              <Link href="/terms" className="underline">Termenii și Condițiile</Link>.
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-6 border-t border-stone-200 text-center space-y-1">
          <p className="text-xs text-stone-500 font-medium">{COMPANY}</p>
          <p className="text-xs text-stone-400">{CUI} · {REG_COM}</p>
          <p className="text-xs text-stone-400">{SEDIU}</p>
          <p className="text-xs text-stone-400">
            <a href={`mailto:${EMAIL_GDPR}`} className="underline">{EMAIL_GDPR}</a>
          </p>
          <p className="text-xs text-stone-400 mt-2">Ultima actualizare: {UPDATED}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-stone-600 underline hover:text-stone-900">
            Înapoi la {BRAND}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-light text-stone-900 mb-3 pb-2 border-b border-stone-100">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-stone-300 mt-0.5 flex-shrink-0">—</span>
      <span>{children}</span>
    </li>
  )
}
