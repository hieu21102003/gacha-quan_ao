import type { Metadata } from 'next'
import { Layers } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const metadata: Metadata = { title: 'Create Outfit' }

export default function CreatePage() {
  return (
    <PagePlaceholder
      eyebrow="Outfit builder"
      title="Create an Outfit"
      icon={Layers}
      description="Mix and match pieces from your closet into new looks. The outfit builder is coming next."
    />
  )
}
