import type { Metadata } from 'next'
import { GachaStudio } from '@/components/gacha/gacha-studio'

export const metadata: Metadata = { title: 'Gacha' }

export default function GachaPage() {
  return <GachaStudio />
}
