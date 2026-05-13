import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Onest, Caveat } from 'next/font/google'
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

const caveat = Caveat({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-caveat',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'TableOS',
  description: 'Restaurant ordering and management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'TableOS',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#E85D04',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${bricolage.variable} ${onest.variable} ${caveat.variable}`}>
      <body className="font-sans antialiased min-h-full">{children}</body>
    </html>
  )
}
