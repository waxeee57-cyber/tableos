import { CartProvider } from '@/contexts/CartContext'
import type { Metadata } from 'next'
import { getBusinessConfig } from '@/lib/config'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getBusinessConfig()
  return {
    title: config?.business_name ?? 'TableOS',
    description: config?.meta_description ?? config?.tagline ?? 'Fresh food, delivered fast.',
    openGraph: {
      title: config?.business_name ?? 'TableOS',
      description: config?.meta_description ?? config?.tagline ?? '',
      images: config?.og_image_url ? [config.og_image_url] : [],
    },
  }
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
