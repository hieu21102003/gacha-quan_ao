import type { Outfit } from '@/lib/wardrobe-data'

export interface CalendarEntry {
  id: string
  outfitId: string
  date: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface MissingOutfitReference {
  entryId: string
  outfitId: string
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsedDate = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value
}

export function findMissingOutfitReferences(
  entries: readonly CalendarEntry[],
  outfits: readonly Outfit[],
): MissingOutfitReference[] {
  const outfitIds = new Set(outfits.map((outfit) => outfit.id))
  return entries
    .filter((entry) => !outfitIds.has(entry.outfitId))
    .map(({ id, outfitId }) => ({ entryId: id, outfitId }))
}
