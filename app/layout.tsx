import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Capsology — Arată bine. Fără să te complici.',
  description:
    'Spune-ne bugetul și stilul tău. Un stilist îți construiește o capsulă completă și ți-o trimite în 48 de ore. Gratuit.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon-180.png',
  },
  openGraph: {
    title: 'Capsology — Arată bine. Fără să te complici.',
    description: 'Capsulă completă, construită manual pentru tine. În 48 de ore, gratuit.',
    url: 'https://capsology.ro',
    siteName: 'Capsology',
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630 }],
    locale: 'ro_RO',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="ro">
      <head>
        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen bg-warm-white antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
