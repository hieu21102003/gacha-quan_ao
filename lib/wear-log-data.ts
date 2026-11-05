import { isCalendarDate, type CalendarEntry } from '@/lib/calendar-data'
import {
  clothingCategories,
  resolveOutfitItems,
  type ClothingCategory,
  type ClothingItem,
  type Outfit,
} from '@/lib/wardrobe-data'

export interface WearLogItemSnapshot {
  clothingItemId: string
  name: string
  category: ClothingCategory
  brand: string
  price: number | null
}

export interface WearLog {
  id: string
  outfitId: string
  calendarEntryId: string | null
  wornOn: string
  note: string
  items: WearLogItemSnapshot[]
  outfitName: string
  outfitValue: number | null
  createdAt: string
}

export type NewWearLog = Omit<WearLog, 'id' | 'createdAt'>

export class DuplicateCalendarWearError extends Error {
  constructor() {
    super('This calendar entry has already been recorded as worn.')
    this.name = 'DuplicateCalendarWearError'
  }
}

export interface CostPerWear {
  wearCount: number
  costPerWear: number | null
  hasUnknownPrice: boolean
  hasInconsistentPrice: boolean
}

export interface UnknownWearPrice {
  wearLogId: string
  outfitId: string
  scope: 'item' | 'outfit'
  clothingItemId: string | null
  itemName: string | null
}

export function isWearLog(value: unknown): value is WearLog {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  const allowedFields = new Set([
    'id',
    'outfitId',
    'calendarEntryId',
    'wornOn',
    'note',
    'items',
    'outfitName',
    'outfitValue',
    'createdAt',
  ])
  if (Object.keys(record).some((field) => !allowedFields.has(field))) return false
  if (
    typeof record.id !== 'string' ||
    record.id.length === 0 ||
    typeof record.outfitId !== 'string' ||
    record.outfitId.length === 0 ||
    (record.calendarEntryId !== null &&
      (typeof record.calendarEntryId !== 'string' || record.calendarEntryId.length === 0)) ||
    typeof record.wornOn !== 'string' ||
    !isCalendarDate(record.wornOn) ||
    typeof record.note !== 'string' ||
    typeof record.outfitName !== 'string' ||
    record.outfitName.trim().length === 0 ||
    (record.outfitValue !== null &&
      (typeof record.outfitValue !== 'number' ||
        !Number.isFinite(record.outfitValue) ||
        record.outfitValue <= 0)) ||
    typeof record.createdAt !== 'string' ||
    Number.isNaN(Date.parse(record.createdAt)) ||
    !Array.isArray(record.items)
  ) {
    return false
  }

  const validItems = record.items.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false
    const snapshot = item as Record<string, unknown>
    const snapshotFields = new Set(['clothingItemId', 'name', 'category', 'brand', 'price'])
    if (Object.keys(snapshot).some((field) => !snapshotFields.has(field))) return false
    return (
      typeof snapshot.clothingItemId === 'string' &&
      snapshot.clothingItemId.length > 0 &&
      typeof snapshot.name === 'string' &&
      snapshot.name.trim().length > 0 &&
      clothingCategories.includes(snapshot.category as ClothingCategory) &&
      typeof snapshot.brand === 'string' &&
      (snapshot.price === null ||
        (typeof snapshot.price === 'number' &&
          Number.isFinite(snapshot.price) &&
          snapshot.price > 0))
    )
  })
  if (!validItems) return false

  const items = record.items as WearLogItemSnapshot[]
  const hasCompletePrices =
    items.length > 0 && items.every((item) => item.price !== null && item.price > 0)
  const summedValue = hasCompletePrices
    ? items.reduce((total, item) => total + (item.price ?? 0), 0)
    : null
  const calculatedValue =
    summedValue !== null && Number.isFinite(summedValue) && summedValue > 0 ? summedValue : null
  return record.outfitValue === calculatedValue
}

export function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createWearLogFromCalendar(
  entry: CalendarEntry,
  outfits: readonly Outfit[],
  wardrobeItems: readonly ClothingItem[],
  confirmedAt = new Date(),
  note = '',
): NewWearLog {
  if (!entry.id.trim() || !entry.outfitId.trim() || !isCalendarDate(entry.date)) {
    throw new TypeError('A valid calendar entry is required to record a wear.')
  }
  if (Number.isNaN(confirmedAt.getTime())) {
    throw new TypeError('A valid confirmation date is required to record a wear.')
  }

  const wornOn = getLocalDateKey(confirmedAt)
  if (entry.date > wornOn) {
    throw new Error('A future calendar entry cannot be recorded as worn yet.')
  }

  const outfit = outfits.find((candidate) => candidate.id === entry.outfitId)
  if (!outfit) {
    throw new Error('The saved outfit for this calendar entry is unavailable.')
  }

  const resolved = resolveOutfitItems(outfit, wardrobeItems)
  if (resolved.missingItemIds.length > 0) {
    throw new Error('Some clothing items in this outfit are unavailable, so its wear cannot be snapshotted.')
  }

  const snapshots = resolved.items.map((item) => ({
    clothingItemId: item.id,
    name: item.name,
    category: item.category,
    brand: item.brand,
    price: Number.isFinite(item.price) && item.price > 0 ? item.price : null,
  }))
  const outfitValue =
    snapshots.length > 0 && snapshots.every((item) => item.price !== null)
      ? snapshots.reduce((total, item) => total + (item.price ?? 0), 0)
      : null

  return {
    outfitId: outfit.id,
    calendarEntryId: entry.id,
    wornOn,
    note,
    items: snapshots,
    outfitName: outfit.name,
    outfitValue:
      outfitValue !== null && Number.isFinite(outfitValue) && outfitValue > 0
        ? outfitValue
        : null,
  }
}

export function countWearsByClothingItem(logs: readonly WearLog[]) {
  const counts = new Map<string, number>()
  for (const log of logs) {
    const itemIds = new Set(log.items.map((item) => item.clothingItemId))
    for (const itemId of itemIds) {
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
    }
  }
  return counts
}

export function countWearsByOutfit(logs: readonly WearLog[]) {
  const counts = new Map<string, number>()
  for (const log of logs) {
    counts.set(log.outfitId, (counts.get(log.outfitId) ?? 0) + 1)
  }
  return counts
}

export function calculateItemCostPerWear(
  clothingItemId: string,
  logs: readonly WearLog[],
): CostPerWear {
  const snapshots = logs.flatMap((log) => {
    const snapshot = log.items.find((item) => item.clothingItemId === clothingItemId)
    return snapshot ? [snapshot] : []
  })
  const knownPrices = new Set(
    snapshots.flatMap((item) => (item.price !== null && item.price > 0 ? [item.price] : [])),
  )
  const hasUnknownPrice = snapshots.some((item) => item.price === null || item.price <= 0)
  const hasInconsistentPrice = knownPrices.size > 1
  const wearCount = snapshots.length
  const price = [...knownPrices][0]

  return {
    wearCount,
    costPerWear:
      wearCount > 0 && !hasUnknownPrice && !hasInconsistentPrice && price !== undefined
        ? price / wearCount
        : null,
    hasUnknownPrice,
    hasInconsistentPrice,
  }
}

export function calculateOutfitCostPerWear(
  outfitId: string,
  logs: readonly WearLog[],
): CostPerWear {
  const outfitLogs = logs.filter((log) => log.outfitId === outfitId)
  const knownValues = new Set(
    outfitLogs.flatMap((log) =>
      log.outfitValue !== null && log.outfitValue > 0 ? [log.outfitValue] : [],
    ),
  )
  const hasUnknownPrice = outfitLogs.some((log) => log.outfitValue === null || log.outfitValue <= 0)
  const hasInconsistentPrice = knownValues.size > 1
  const wearCount = outfitLogs.length
  const outfitValue = [...knownValues][0]

  return {
    wearCount,
    costPerWear:
      wearCount > 0 && !hasUnknownPrice && !hasInconsistentPrice && outfitValue !== undefined
        ? outfitValue / wearCount
        : null,
    hasUnknownPrice,
    hasInconsistentPrice,
  }
}

export function findUnknownWearPrices(logs: readonly WearLog[]): UnknownWearPrice[] {
  const unknownPrices: UnknownWearPrice[] = []
  for (const log of logs) {
    for (const item of log.items) {
      if (item.price === null || item.price <= 0) {
        unknownPrices.push({
          wearLogId: log.id,
          outfitId: log.outfitId,
          scope: 'item',
          clothingItemId: item.clothingItemId,
          itemName: item.name,
        })
      }
    }
    if (log.outfitValue === null || log.outfitValue <= 0) {
      unknownPrices.push({
        wearLogId: log.id,
        outfitId: log.outfitId,
        scope: 'outfit',
        clothingItemId: null,
        itemName: null,
      })
    }
  }
  return unknownPrices
}
