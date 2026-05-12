import type { Metadata } from 'next'
import { Bricolage_Grotesque, Onest } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-bricolage',
  weight: ['400', '600', '700', '800'],
})

const onest = Onest({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-onest',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'TableOS',
  description: 'Restaurant ordering and management',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${bricolage.variable} ${onest.variable}`}>
      <body className="font-sans antialiased min-h-full">{children}</body>
    </html>
  )
}
