import type { Metadata } from 'next'
import { UserRound } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return (
    <PagePlaceholder
      eyebrow="Hieu Nguyen"
      title="Profile"
      icon={UserRound}
      description="Manage your style preferences, sizes, and account settings. Your profile is coming next."
    />
  )
}
