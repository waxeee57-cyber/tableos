import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'TableOS',
  description: 'Restaurant ordering and management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={inter.variable}>
      <body className="font-sans antialiased min-h-full">{children}</body>
    </html>
  )
}
