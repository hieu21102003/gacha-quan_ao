import type { Metadata } from 'next'
import { ClosetView } from '@/components/closet/closet-view'

export const metadata: Metadata = { title: 'Closet' }

export default function ClosetPage() {
  return <ClosetView />
}
