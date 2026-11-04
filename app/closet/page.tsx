import type { Metadata } from 'next'
import { Shirt } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const metadata: Metadata = { title: 'Closet' }

export default function ClosetPage() {
  return (
    <PagePlaceholder
      eyebrow="42 pieces"
      title="My Closet"
      icon={Shirt}
      description="Browse, filter, and organize every piece you own. Your full closet view is coming next."
    />
  )
}
