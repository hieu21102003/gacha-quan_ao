import type { Metadata } from 'next'
import { OutfitCollection } from '@/components/outfits/outfit-collection'

export const metadata: Metadata = { title: 'My Outfits' }

export default function OutfitsPage() {
  return <OutfitCollection />
}
