import { requireAdmin } from '@/lib/auth'
import { getBusinessConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import type { BusinessConfig } from '@/types'
import OnboardingWizard from '@/components/admin/OnboardingWizard'

export const revalidate = 0

export default async function OnboardingPage() {
  const [, config] = await Promise.all([requireAdmin(), getBusinessConfig()])

  // If already completed, go to admin
  if (config?.onboarding_completed) {
    redirect('/admin')
  }

  return <OnboardingWizard initialConfig={config as BusinessConfig} />
}
