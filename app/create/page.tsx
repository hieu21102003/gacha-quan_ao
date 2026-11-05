import type { Metadata } from 'next'
import { OutfitStudio } from '@/components/create/outfit-studio'

export const metadata: Metadata = { title: 'Create Outfit' }

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>
}) {
  const edit = (await searchParams).edit
  const editId = typeof edit === 'string' ? edit : undefined
  return <OutfitStudio key={editId ?? 'new'} editId={editId} />
}
