import Link from 'next/link'

export default function CheckoutSuccess({
  searchParams
}: {
  searchParams: { tier?: string; capsule_id?: string }
}) {
  const tier       = searchParams.tier || 'unlock'
  const capsuleId  = searchParams.capsule_id || ''
  const isUnlock   = tier === 'unlock'

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M2 11L10 19L26 3" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="font-display text-3xl font-light text-stone-900 mb-3">
          {isUnlock ? 'Capsulă deblocată!' : 'Comandă plasată!'}
        </h1>

        <p className="text-sm text-stone-500 leading-relaxed mb-8">
          {isUnlock
            ? 'Linkurile și brandurile sunt acum vizibile. Vei primi un email de confirmare. Linkurile About You sunt valabile 7 zile.'
            : 'Am primit comanda ta. Vei primi un email cu detaliile de livrare în cel mai scurt timp.'}
        </p>

        <div className="bg-white border border-stone-200 rounded-xl px-4 py-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Serviciu</span>
            <span className="font-medium text-stone-800">{isUnlock ? 'Deblochează — €3' : 'Serviciu complet — €15'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Status</span>
            <span className="text-green-600 font-medium">Plată confirmată ✓</span>
          </div>
        </div>

        {capsuleId && capsuleId !== 'test-123' && (
          <Link href={`/capsule/${capsuleId}`}
            className="block w-full py-3.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 mb-3">
            {isUnlock ? 'Vezi capsula deblocată →' : 'Urmărește comanda →'}
          </Link>
        )}

        <Link href="/quiz"
          className="block w-full py-3 border border-stone-200 text-stone-600 text-sm rounded-xl hover:bg-stone-50">
          Creează o capsulă nouă
        </Link>

        <p className="text-xs text-stone-400 mt-6 leading-relaxed">
          Ai întrebări? Scrie-ne la{' '}
          <a href="mailto:hello@capsology.ro" className="underline">hello@capsology.ro</a>
        </p>
      </div>
    </div>
  )
}
