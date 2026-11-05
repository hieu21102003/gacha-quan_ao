import type { Metadata } from 'next'
import { ProfileStatistics } from '@/components/profile/profile-statistics'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return <ProfileStatistics />
}
