import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Capsology — AI Personal Stylist',
  description: 'Garderoba ta personalizată, creată de AI. Stilul tău, bugetul tău, viața ta.',
  keywords: 'capsule wardrobe, personal stylist, AI fashion, garderobă capsulă, stil personal',
  openGraph: {
    title: 'Capsology — AI Personal Stylist',
    description: 'Garderoba ta personalizată, creată de AI. De la €3.',
    type: 'website',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-stone-50 font-body antialiased">
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
