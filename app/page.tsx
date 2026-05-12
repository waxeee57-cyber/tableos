import { TableOSHome } from '@/components/marketing/TableOSHome'
import { ZoldfeszekHome } from '@/components/marketing/ZoldfeszekHome'

export default function HomePage() {
  const tenant = process.env.NEXT_PUBLIC_TENANT
  if (tenant === 'zoldfeszek') return <ZoldfeszekHome />
  return <TableOSHome />
}

