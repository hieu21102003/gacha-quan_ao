import {
  validateStrictOutfit,
  type OutfitValidationEntry,
} from '../outfit-validation'
import type { ClothingCategory, ClothingItem } from '../wardrobe-data'

export const gachaOccasions = [
  'Work',
  'Casual',
  'Date',
  'Home',
  'Sport',
  'Special event',
] as const

export type GachaOccasion = (typeof gachaOccasions)[number]

export type GachaWeatherContext =
  | { availability: 'available' }
  | { availability: 'unavailable' }
  | { availability: 'not-checked' }

export interface GachaEngineInput {
  items: readonly ClothingItem[]
  occasion: GachaOccasion
  weather: GachaWeatherContext
  recentlyWornItemIds?: readonly string[]
  previousCompositionItemIds?: readonly string[]
  random: () => number
}

export type GachaWarningCode =
  | 'missing-shoes'
  | 'anti-repeat-relaxed'
  | 'duplicate-wardrobe-ids'
  | 'malformed-wardrobe-items'
  | 'invalid-random-source'

export interface GachaWarning {
  code: GachaWarningCode
}

export interface GachaDiagnostics {
  duplicateWardrobeIds: string[]
  malformedWardrobeItemCount: number
  excludedInLaundryItemCount: number
  strictValidationRejectionCount: number
  missingBaseCategories: ClothingCategory[]
}

export interface GachaAntiRepeatResult {
  avoidedRecentlyWornItems: boolean
  avoidedPreviousComposition: boolean
  constraintsRelaxed: boolean
}

export interface GachaOutfitCandidate {
  itemIds: string[]
  items: ClothingItem[]
  baseComposition: 'dress' | 'top-bottom'
  hasShoes: boolean
  shoeReadiness: 'with-shoes' | 'missing-shoes'
  occasion: GachaOccasion
  weather: GachaWeatherContext
  antiRepeat: GachaAntiRepeatResult
  warnings: GachaWarning[]
}

export type GachaGenerationResult =
  | { success: true; candidate: GachaOutfitCandidate; diagnostics: GachaDiagnostics }
  | {
      success: false
      reason: 'empty-wardrobe' | 'no-eligible-items' | 'no-eligible-base-composition'
      diagnostics: GachaDiagnostics
      warnings: GachaWarning[]
      occasion: GachaOccasion
      weather: GachaWeatherContext
    }

interface BaseComposition {
  type: GachaOutfitCandidate['baseComposition']
  items: ClothingItem[]
}

const categories: readonly ClothingCategory[] = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
]
const statuses = ['Available', 'In laundry', 'Worn recently'] as const
const provenanceValues = ['seed', 'user', 'unknown'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isClothingItem(value: unknown): value is ClothingItem {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    categories.includes(value.category as ClothingCategory) &&
    typeof value.image === 'string' &&
    typeof value.imageAlt === 'string' &&
    typeof value.color === 'string' &&
    typeof value.brand === 'string' &&
    isStringArray(value.seasons) &&
    isStringArray(value.styles) &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    statuses.includes(value.status as (typeof statuses)[number]) &&
    typeof value.favorite === 'boolean' &&
    provenanceValues.includes(value.provenance as (typeof provenanceValues)[number])
  )
}

function entryFor(item: ClothingItem): OutfitValidationEntry {
  return { slot: item.category, itemId: item.id, item }
}

function sameComposition(itemIds: readonly string[], previousIds: readonly string[]) {
  if (itemIds.length !== previousIds.length) return false
  const previous = new Set(previousIds)
  return previous.size === previousIds.length && itemIds.every((id) => previous.has(id))
}

function createRandomPicker(random: () => number) {
  let invalidRandomCount = 0

  const next = () => {
    let value: number
    try {
      value = random()
    } catch {
      invalidRandomCount += 1
      return 0
    }
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      invalidRandomCount += 1
      return 0
    }
    return value
  }

  return {
    next,
    pick<T>(values: readonly T[]): T {
      return values[Math.floor(next() * values.length)]
    },
    get invalidRandomCount() {
      return invalidRandomCount
    },
  }
}

function getMissingBaseCategories(
  eligibleByCategory: Record<ClothingCategory, ClothingItem[]>,
): ClothingCategory[] {
  const missing: ClothingCategory[] = []
  if (eligibleByCategory.Dresses.length === 0) missing.push('Dresses')
  if (eligibleByCategory.Tops.length === 0) missing.push('Tops')
  if (eligibleByCategory.Bottoms.length === 0) missing.push('Bottoms')
  return missing
}

function createBaseCompositions(
  eligibleByCategory: Record<ClothingCategory, ClothingItem[]>,
): BaseComposition[] {
  const bases: BaseComposition[] = eligibleByCategory.Dresses.map((item) => ({
    type: 'dress',
    items: [item],
  }))

  for (const top of eligibleByCategory.Tops) {
    for (const bottom of eligibleByCategory.Bottoms) {
      bases.push({ type: 'top-bottom', items: [top, bottom] })
    }
  }
  return bases
}

export function generateGachaOutfit(input: GachaEngineInput): GachaGenerationResult {
  const rawIdCounts = new Map<string, number>()
  let malformedWardrobeItemCount = 0
  for (const value of input.items as readonly unknown[]) {
    if (isRecord(value) && typeof value.id === 'string' && value.id.trim()) {
      rawIdCounts.set(value.id, (rawIdCounts.get(value.id) ?? 0) + 1)
    }
    if (!isClothingItem(value)) malformedWardrobeItemCount += 1
  }

  const duplicateWardrobeIds = [...rawIdCounts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort()
  const duplicateIds = new Set(duplicateWardrobeIds)
  let excludedInLaundryItemCount = 0
  const eligibleByCategory: Record<ClothingCategory, ClothingItem[]> = {
    Tops: [],
    Bottoms: [],
    Dresses: [],
    Outerwear: [],
    Shoes: [],
    Bags: [],
    Accessories: [],
  }

  for (const value of input.items as readonly unknown[]) {
    if (!isClothingItem(value) || duplicateIds.has(value.id)) continue
    if (value.status === 'In laundry') {
      excludedInLaundryItemCount += 1
      continue
    }
    eligibleByCategory[value.category].push(value)
  }

  const diagnostics: GachaDiagnostics = {
    duplicateWardrobeIds,
    malformedWardrobeItemCount,
    excludedInLaundryItemCount,
    strictValidationRejectionCount: 0,
    missingBaseCategories: getMissingBaseCategories(eligibleByCategory),
  }
  const warnings: GachaWarning[] = []
  if (duplicateWardrobeIds.length > 0) warnings.push({ code: 'duplicate-wardrobe-ids' })
  if (malformedWardrobeItemCount > 0) warnings.push({ code: 'malformed-wardrobe-items' })

  const eligibleCount = categories.reduce(
    (count, category) => count + eligibleByCategory[category].length,
    0,
  )
  const fail = (
    reason: Extract<GachaGenerationResult, { success: false }>['reason'],
  ): GachaGenerationResult => ({
    success: false,
    reason,
    diagnostics,
    warnings,
    occasion: input.occasion,
    weather: input.weather,
  })

  if (input.items.length === 0) return fail('empty-wardrobe')
  if (eligibleCount === 0) return fail('no-eligible-items')

  const bases = createBaseCompositions(eligibleByCategory)
  const validBases = bases.filter((base) => {
    const result = validateStrictOutfit(base.items.map(entryFor))
    if (result.isValid) return true
    diagnostics.strictValidationRejectionCount += 1
    return false
  })
  if (validBases.length === 0) return fail('no-eligible-base-composition')
  diagnostics.missingBaseCategories = []

  const picker = createRandomPicker(input.random)
  const recentlyWorn = new Set(input.recentlyWornItemIds ?? [])
  const previousComposition = input.previousCompositionItemIds
  const shoes = eligibleByCategory.Shoes
  const freshShoes = shoes.filter((item) => !recentlyWorn.has(item.id))
  const optionalPool = (category: 'Outerwear' | 'Bags' | 'Accessories') =>
    eligibleByCategory[category].filter((item) => !recentlyWorn.has(item.id))

  const candidates: Array<{
    base: BaseComposition
    items: ClothingItem[]
    validation: ReturnType<typeof validateStrictOutfit>
  }> = []

  for (const base of validBases) {
    const candidateItems = [...base.items]

    if (shoes.length > 0) {
      candidateItems.push(picker.pick(freshShoes.length > 0 ? freshShoes : shoes))
    }

    for (const category of ['Outerwear', 'Bags'] as const) {
      const pool = optionalPool(category)
      if (pool.length > 0 && picker.next() < 0.35) {
        candidateItems.push(picker.pick(pool))
      }
    }

    for (const accessory of optionalPool('Accessories')) {
      if (picker.next() < 0.25) candidateItems.push(accessory)
    }

    const validation = validateStrictOutfit(candidateItems.map(entryFor))
    if (!validation.isValid) {
      diagnostics.strictValidationRejectionCount += 1
      continue
    }
    candidates.push({ base, items: candidateItems, validation })
  }

  if (candidates.length === 0) return fail('no-eligible-base-composition')

  const nonRepeated = previousComposition
    ? candidates.filter(
        ({ items }) => !sameComposition(items.map((item) => item.id), previousComposition),
      )
    : candidates
  const repeatAlternatives = nonRepeated.length > 0 ? nonRepeated : candidates
  const repeatRelaxed = nonRepeated.length === 0 && previousComposition !== undefined
  const fewestRecentItems = Math.min(
    ...repeatAlternatives.map(
      ({ items }) => items.filter((item) => recentlyWorn.has(item.id)).length,
    ),
  )
  const leastRecentlyWorn = repeatAlternatives.filter(
    ({ items }) => items.filter((item) => recentlyWorn.has(item.id)).length === fewestRecentItems,
  )
  const selected = picker.pick(leastRecentlyWorn)

  if (picker.invalidRandomCount > 0) warnings.push({ code: 'invalid-random-source' })
  if (!selected.validation.hasShoes) warnings.push({ code: 'missing-shoes' })
  const avoidedRecentlyWornItems = !selected.items.some((item) => recentlyWorn.has(item.id))
  const avoidedPreviousComposition =
    previousComposition === undefined ||
    !sameComposition(selected.items.map((item) => item.id), previousComposition)
  const constraintsRelaxed =
    !avoidedRecentlyWornItems || !avoidedPreviousComposition
  if (constraintsRelaxed) warnings.push({ code: 'anti-repeat-relaxed' })

  return {
    success: true,
    diagnostics,
    candidate: {
      itemIds: selected.items.map((item) => item.id),
      items: selected.items,
      baseComposition: selected.base.type,
      hasShoes: selected.validation.hasShoes,
      shoeReadiness: selected.validation.readiness === 'ready-with-shoes'
        ? 'with-shoes'
        : 'missing-shoes',
      occasion: input.occasion,
      weather: input.weather,
      antiRepeat: {
        avoidedRecentlyWornItems,
        avoidedPreviousComposition,
        constraintsRelaxed: constraintsRelaxed || repeatRelaxed,
      },
      warnings,
    },
  }
}
