import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termeni și Condiții — Capsology',
  description: 'Termenii și condițiile de utilizare ale platformei Capsology, un produs al Robot Lab SRL',
}

const COMPANY     = 'Robot Lab SRL'
const CUI         = 'CIF 42723909'
const REG_COM     = 'J20/2000/743840/4'
const BRAND       = 'Capsology'
const DOMAIN      = 'capsology.ro'
const EMAIL_LEGAL = 'legal@capsology.ro'
const EMAIL_GDPR  = 'gdpr@capsology.ro'
const UPDATED     = '15 iunie 2026'

export default function TermsPage() {
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
          <h1 className="font-display text-4xl font-light text-stone-900 mb-2">Termeni și Condiții</h1>
          <p className="text-sm text-stone-500">Ultima actualizare: {UPDATED}</p>
        </div>

        <div className="space-y-8 text-stone-700 text-sm leading-relaxed">

          <Section title="1. Identificarea operatorului și definiții">
            <p>
              Platforma <strong>{BRAND}</strong> (accesibilă la <strong>{DOMAIN}</strong>) este operată de{' '}
              <strong>{COMPANY}</strong>, societate cu răspundere limitată înregistrată în România,{' '}
              <strong>{CUI}</strong>, număr de înregistrare la Registrul Comerțului{' '}
              <strong>{REG_COM}</strong>, cu sediul social în România.
            </p>
            <p>
              {BRAND} este un brand și produs digital al {COMPANY}. Prin utilizarea platformei,
              utilizatorul încheie un contract cu {COMPANY} în calitate de operator al serviciilor descrise mai jos.
            </p>
            <p>Contact legal: <a href={`mailto:${EMAIL_LEGAL}`} className="underline">{EMAIL_LEGAL}</a></p>
            <p><strong>Definiții:</strong></p>
            <ul className="list-none space-y-1 ml-4">
              <Li><strong>„Platforma"</strong> — site-ul web {DOMAIN} și toate serviciile digitale asociate</Li>
              <Li><strong>„Utilizatorul"</strong> — orice persoană fizică cu vârsta de minimum 18 ani care accesează Platforma</Li>
              <Li><strong>„Capsula"</strong> — selecția curatoriată de articole vestimentare generată de algoritmul AI</Li>
              <Li><strong>„Parteneri retaileri"</strong> — platformele de comerț electronic (About You, Zalando, FashionDays etc.) de la care provin produsele</Li>
              <Li><strong>„Date comportamentale"</strong> — preferințele de stil, buget, culori și ocazii colectate prin chestionarul de stil</Li>
            </ul>
          </Section>

          <Section title="2. Descrierea serviciilor">
            <p>{BRAND} oferă un serviciu de curatorie vestimentară bazat pe inteligență artificială. Serviciile plătite disponibile sunt:</p>
            <ul className="list-none space-y-2 ml-4">
              <Li>
                <strong>Serviciul Deblochează (€3)</strong> — acces la brandurile și linkurile afiliate
                ale produselor din capsula generată. Utilizatorul plasează comanda direct pe platformele
                partenere. {BRAND} acționează exclusiv ca intermediar de curatorie și nu este parte în
                contractul de vânzare-cumpărare dintre utilizator și retailer.
              </Li>
              <Li>
                <strong>Serviciul Complet (€15)</strong> — {COMPANY} plasează comanda pe platformele
                partenere în numele utilizatorului, la adresa de livrare furnizată, prin integrare API
                sau manual, după caz. Taxa de €15 acoperă exclusiv activitatea de comandă și coordonare.
                Contractul de vânzare-cumpărare pentru produse se încheie direct între utilizator și
                retailerul partener.
              </Li>
            </ul>
            <p>
              Generarea capsulei și vizualizarea produselor (fără branduri sau linkuri) sunt gratuite
              și nu necesită crearea unui cont.
            </p>
          </Section>

          <Section title="3. Politica de nerambursare — dispoziție esențială">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
              <p className="font-semibold text-amber-900 mb-2">⚠ Taxele de serviciu {BRAND} nu sunt rambursabile.</p>
              <p className="text-amber-800 mb-2">
                <strong>Serviciul Deblochează (€3):</strong> Conform art. 16 lit. (m) din Directiva
                2011/83/UE privind drepturile consumatorilor, transpusă în legislația română prin OUG
                34/2014, dreptul de retragere de 14 zile nu se aplică contractelor privind conținutul
                digital furnizat pe suport nematerial, dacă executarea a început cu acordul prealabil
                expres al consumatorului și cu confirmarea că înțelege că pierde dreptul de retragere.
                Prin bifarea căsuței de consimțământ la plată, utilizatorul acordă acest acord expres
                și irevocabil.
              </p>
              <p className="text-amber-800">
                <strong>Serviciul Complet (€15):</strong> Taxa de serviciu nu este rambursabilă odată
                ce comanda a fost inițiată la retailerul partener, întrucât serviciul a fost prestat
                integral. Anulările de comenzi plasate la About You sau Zalando sunt supuse exclusiv
                politicii de anulare a acestor platforme.
              </p>
            </div>
          </Section>

          <Section title="4. Condiții de utilizare și vârstă minimă">
            <p>
              Utilizarea platformei {BRAND} este permisă exclusiv persoanelor cu vârsta de minimum{' '}
              <strong>18 ani</strong>. Prin utilizarea platformei, confirmați că aveți cel puțin 18 ani.
            </p>
            <p>
              Conform art. 8 din Regulamentul (UE) 2016/679 (GDPR) și legislației române aplicabile,
              prelucrarea datelor persoanelor cu vârsta sub 16 ani necesită consimțământul părintelui
              sau al tutorelui legal. {COMPANY} nu colectează în mod intenționat date de la persoane
              sub 18 ani. Dacă aflăm că un utilizator sub 18 ani a furnizat date personale, le vom
              șterge imediat.
            </p>
            <p>Utilizatorul se obligă să:</p>
            <ul className="list-none space-y-1 ml-4">
              <Li>Furnizeze informații corecte și complete la înregistrare și checkout</Li>
              <Li>Nu utilizeze platforma în scopuri frauduloase sau ilegale</Li>
              <Li>Nu încerce să acceseze date ale altor utilizatori</Li>
              <Li>Respecte drepturile de proprietate intelectuală ale {COMPANY}</Li>
            </ul>
          </Section>

          <Section title="5. Politica de retur pentru produsele vestimentare">
            <p>
              <strong>{COMPANY} nu este vânzătorul produselor vestimentare</strong> și nu poate procesa
              returnări pentru acestea. {BRAND} acționează exclusiv ca serviciu de curatorie și intermediar
              de recomandare.
            </p>
            <p>Toate returnările se gestionează direct prin platformele partenere:</p>
            <ul className="list-none space-y-1 ml-4">
              <Li>About You: politică de retur de 30 de zile, livrare retur gratuită</Li>
              <Li>Zalando: politică de retur de 30 de zile, livrare retur gratuită</Li>
              <Li>FashionDays: conform politicii proprii afișate pe platformă</Li>
              <Li>Alte platforme partenere: conform politicii proprii a fiecărei platforme</Li>
            </ul>
            <p>
              Utilizatorul contactează direct retailerul pentru inițierea procedurii de retur.{' '}
              {COMPANY} nu intermediază și nu poate interveni în aceste procese.
            </p>
          </Section>

          <Section title="6. Linkuri afiliate și transparență comercială">
            <p>
              {COMPANY} participă la programe de afiliere ale partenerilor retaileri prin rețele de
              afiliere (Awin, Profitshare, Tradedoubler și altele). Linkurile de cumpărare furnizate
              prin Serviciul Deblochează sunt linkuri afiliate — {COMPANY} primește un comision din
              vânzare, fără niciun cost suplimentar pentru utilizator și fără modificarea prețului
              produselor.
            </p>
            <p>
              Comisioanele afiliate nu influențează selecția produselor din capsulă, care se face
              exclusiv pe baza preferințelor utilizatorului și a algoritmului de curatorie AI.
            </p>
            <p><strong>Valabilitatea linkurilor afiliate:</strong></p>
            <ul className="list-none space-y-1 ml-4">
              <Li>Linkuri About You: valabile 7 zile de la deblocare (limita cookie-ului afiliat)</Li>
              <Li>Linkuri Zalando: valabile 30 de zile de la deblocare</Li>
              <Li>Alte platforme: conform specificațiilor tehnice ale fiecărui program</Li>
            </ul>
            <p>
              {BRAND} va transmite o notificare email cu minimum 48 de ore înainte de expirarea
              linkurilor About You. Expirarea linkurilor nu conferă dreptul la rambursarea taxei de serviciu.
            </p>
          </Section>

          <Section title="7. Prelucrarea datelor cu caracter personal (GDPR)">
            <p>
              {COMPANY}, în calitate de operator de date, prelucrează datele personale ale utilizatorilor
              în conformitate cu Regulamentul (UE) 2016/679 (GDPR), Legea nr. 190/2018 de implementare
              a GDPR în România și legislația națională aplicabilă.
            </p>
            <p><strong>Categorii de date colectate:</strong></p>
            <ul className="list-none space-y-1 ml-4">
              <Li>Date de identificare: adresă email, nume (opțional, la înregistrare)</Li>
              <Li>Date de contact și livrare: adresă, telefon (doar pentru Serviciul Complet)</Li>
              <Li>Date comportamentale din quiz: preferințe de stil, buget, culori, ocazii de purtare, mărimi</Li>
              <Li>Date tehnice: adresă IP, tip browser, pagini accesate (prin cookies de sesiune)</Li>
            </ul>
            <p><strong>Temeiul juridic al prelucrării:</strong></p>
            <ul className="list-none space-y-1 ml-4">
              <Li>Art. 6(1)(b) GDPR — executarea contractului: pentru procesarea plăților și livrarea serviciilor</Li>
              <Li>Art. 6(1)(a) GDPR — consimțământ: pentru datele comportamentale din quiz utilizate la îmbunătățirea algoritmului</Li>
              <Li>Art. 6(1)(f) GDPR — interes legitim: pentru securitatea platformei și prevenirea fraudei</Li>
            </ul>
            <p>
              <strong>Datele de card</strong> sunt procesate exclusiv de Stripe Inc., în calitate de
              operator independent. {COMPANY} nu stochează, nu accesează și nu procesează direct niciun
              dat de card. Stripe este certificat PCI DSS Level 1.
            </p>
            <p><strong>Drepturile utilizatorului conform GDPR:</strong></p>
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

          <Section title="8. Cookies">
            <p>
              Platforma utilizează cookies strict necesare pentru funcționarea serviciului (autentificare,
              sesiune) și cookies afiliate plasate de platformele partenere la click pe linkurile de
              cumpărare. Prin utilizarea platformei, acceptați utilizarea cookies strict necesare.
              Cookies de marketing și analiză sunt utilizate doar cu consimțământul explicit.
            </p>
          </Section>

          <Section title="9. Proprietate intelectuală">
            <p>
              Algoritmul de curatorie AI, interfața grafică, denumirea comercială „{BRAND}", logoul și
              toate elementele de design ale Platformei sunt proprietatea {COMPANY} și sunt protejate
              de Legea nr. 8/1996 privind dreptul de autor și drepturile conexe, precum și de
              legislația europeană aplicabilă.
            </p>
            <p>
              Imaginile produselor aparțin respectiv platformelor partenere (About You, Zalando etc.)
              și sunt utilizate în baza acordurilor de afiliere încheiate cu acestea.
            </p>
          </Section>

          <Section title="10. Răspundere limitată">
            <p>{COMPANY} nu garantează și nu răspunde pentru:</p>
            <ul className="list-none space-y-1 ml-4">
              <Li>Disponibilitatea continuă a produselor în catalogul partenerilor retaileri</Li>
              <Li>Acuratețea prețurilor afișate — prețurile pot varia între momentul generării capsulei și momentul achiziției</Li>
              <Li>Disponibilitatea în stoc la momentul comenzii</Li>
              <Li>Timpii de livrare ai partenerilor retaileri</Li>
              <Li>Calitatea, conformitatea sau caracteristicile produselor — responsabilitate exclusivă a retailerilor</Li>
              <Li>Întreruperi temporare ale serviciului datorate unor cauze tehnice independente de voința {COMPANY}</Li>
            </ul>
            <p>
              Răspunderea totală a {COMPANY} față de un utilizator nu poate depăși suma plătită de
              acesta cu titlu de taxă de serviciu în ultimele 12 luni, cu excepția cazurilor de dol
              sau culpă gravă.
            </p>
          </Section>

          <Section title="11. Litigii, legislație aplicabilă și soluționare alternativă">
            <p>
              Prezentul contract este guvernat de legislația română, în special de:
            </p>
            <ul className="list-none space-y-1 ml-4">
              <Li>Codul Civil al României (Legea nr. 287/2009)</Li>
              <Li>OUG 34/2014 privind drepturile consumatorilor în contractele la distanță</Li>
              <Li>Legea nr. 365/2002 privind comerțul electronic</Li>
              <Li>Legea nr. 190/2018 privind măsurile de punere în aplicare a GDPR</Li>
            </ul>
            <p>
              Orice litigiu se va soluționa pe cale amiabilă în primul rând, prin contactarea{' '}
              <a href={`mailto:${EMAIL_LEGAL}`} className="underline">{EMAIL_LEGAL}</a>.
              În caz de nerezolvare, litigiile vor fi soluționate de instanțele judecătorești
              competente din România.
            </p>
            <p>
              <strong>Soluționare alternativă a litigiilor (SAL/ODR):</strong> Consumatorii din UE pot
              utiliza platforma europeană de soluționare online a litigiilor:{' '}
              <a href="https://ec.europa.eu/consumers/odr" className="underline" target="_blank" rel="noopener noreferrer">
                ec.europa.eu/consumers/odr
              </a>.
            </p>
            <p>
              <strong>ANPC</strong> (Autoritatea Națională pentru Protecția Consumatorilor):{' '}
              <a href="https://www.anpc.ro" className="underline" target="_blank" rel="noopener noreferrer">
                www.anpc.ro
              </a>{' '}
              — pentru sesizări privind nerespectarea drepturilor consumatorilor.
            </p>
            <p>
              <strong>SAL ANPC</strong> — soluționare alternativă a litigiilor:{' '}
              <a href="https://anpc.ro/ce-facem/sal/" className="underline" target="_blank" rel="noopener noreferrer">
                anpc.ro/ce-facem/sal/
              </a>
            </p>
          </Section>

          <Section title="12. Modificarea termenilor">
            <p>
              {COMPANY} poate modifica prezentul document cu notificare prealabilă de minimum{' '}
              <strong>15 zile</strong> prin email la adresa înregistrată în cont sau prin afișare
              prominentă pe platformă. Continuarea utilizării Platformei după intrarea în vigoare a
              modificărilor constituie acceptarea acestora. Dacă nu sunteți de acord cu modificările,
              aveți dreptul să vă ștergeți contul înainte de data intrării în vigoare.
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-6 border-t border-stone-200 text-center space-y-1">
          <p className="text-xs text-stone-500 font-medium">{COMPANY}</p>
          <p className="text-xs text-stone-400">{CUI} · {REG_COM}</p>
          <p className="text-xs text-stone-400">
            <a href={`mailto:${EMAIL_LEGAL}`} className="underline">{EMAIL_LEGAL}</a>
            {' · '}
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
