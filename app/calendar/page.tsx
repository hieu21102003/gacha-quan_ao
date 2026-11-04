import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const metadata: Metadata = { title: 'Calendar' }

export default function CalendarPage() {
  return (
    <PagePlaceholder
      eyebrow="Plan ahead"
      title="Outfit Calendar"
      icon={CalendarDays}
      description="Plan what to wear for the week and look back on what you wore. Your calendar is coming next."
    />
  )
}
