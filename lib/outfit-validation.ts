import type { ClothingCategory, ClothingItem } from './wardrobe-data'

export type OutfitSelections = Readonly<Record<ClothingCategory, readonly string[]>>

export interface OutfitValidationEntry {
  slot: ClothingCategory
  itemId: string
  item: ClothingItem | null
}

export type OutfitValidationErrorCode =
  | 'invalid-composition'
  | 'missing-item'
  | 'duplicate-item-id'
  | 'item-reference-mismatch'
  | 'category-slot-mismatch'
  | 'item-in-laundry'

export interface OutfitValidationError {
  code: OutfitValidationErrorCode
  itemId?: string
  slot?: ClothingCategory
}

export interface StrictOutfitValidationResult {
  isValid: boolean
  isStructurallyValid: boolean
  errors: OutfitValidationError[]
  hasShoes: boolean
  missingShoes: boolean
  readiness: 'invalid' | 'ready-with-shoes' | 'ready-without-shoes'
}

const singleItemCategories: readonly ClothingCategory[] = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
]

export function isValidManualOutfitComposition(selections: OutfitSelections): boolean {
  const hasDress = selections.Dresses.length === 1
  const hasSeparates = selections.Tops.length === 1 && selections.Bottoms.length === 1
  const hasConflictingBase =
    selections.Dresses.length > 0 && (selections.Tops.length > 0 || selections.Bottoms.length > 0)
  const hasMultipleSingleSlots = singleItemCategories.some(
    (category) => selections[category].length > 1,
  )

  return (hasDress || hasSeparates) && !hasConflictingBase && !hasMultipleSingleSlots
}

export function validateStrictOutfit(
  entries: readonly OutfitValidationEntry[],
): StrictOutfitValidationResult {
  const selections: Record<ClothingCategory, string[]> = {
    Tops: [],
    Bottoms: [],
    Dresses: [],
    Outerwear: [],
    Shoes: [],
    Bags: [],
    Accessories: [],
  }
  const errors: OutfitValidationError[] = []
  const seenItemIds = new Set<string>()
  let hasShoes = false

  for (const entry of entries) {
    selections[entry.slot].push(entry.itemId)

    if (seenItemIds.has(entry.itemId)) {
      errors.push({ code: 'duplicate-item-id', itemId: entry.itemId, slot: entry.slot })
    } else {
      seenItemIds.add(entry.itemId)
    }

    if (!entry.item) {
      errors.push({ code: 'missing-item', itemId: entry.itemId, slot: entry.slot })
      continue
    }

    if (entry.item.id !== entry.itemId) {
      errors.push({ code: 'item-reference-mismatch', itemId: entry.itemId, slot: entry.slot })
      continue
    }

    const categoryMatchesSlot = entry.item.category === entry.slot
    if (!categoryMatchesSlot) {
      errors.push({ code: 'category-slot-mismatch', itemId: entry.itemId, slot: entry.slot })
    }

    const isEligible = entry.item.status !== 'In laundry'
    if (!isEligible) {
      errors.push({ code: 'item-in-laundry', itemId: entry.itemId, slot: entry.slot })
    }

    if (entry.slot === 'Shoes' && categoryMatchesSlot && isEligible) {
      hasShoes = true
    }
  }

  const isStructurallyValid = isValidManualOutfitComposition(selections)
  if (!isStructurallyValid) {
    errors.unshift({ code: 'invalid-composition' })
  }

  const isValid = errors.length === 0
  return {
    isValid,
    isStructurallyValid,
    errors,
    hasShoes,
    missingShoes: !hasShoes,
    readiness: !isValid
      ? 'invalid'
      : hasShoes
        ? 'ready-with-shoes'
        : 'ready-without-shoes',
  }
}
