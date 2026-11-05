'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Circle,
  Footprints,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  Sparkles,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react'
import { OutfitClothingPhoto } from '@/components/outfits/outfit-clothing-photo'
import { useOutfits } from '@/components/providers/outfit-provider'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  type ClothingCategory,
  type ClothingItem,
  type Outfit,
} from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

const slotDetails: Record<ClothingCategory, { description: string; icon: LucideIcon }> = {
  Tops: { description: 'Shirts, knits, and more', icon: Shirt },
  Bottoms: { description: 'Trousers, skirts, and more', icon: Circle },
  Dresses: { description: 'A one-piece look', icon: Shirt },
  Outerwear: { description: 'An optional extra layer', icon: Wind },
  Shoes: { description: 'Finish the look', icon: Footprints },
  Bags: { description: 'Carry it your way', icon: ShoppingBag },
  Accessories: { description: 'Add a personal touch', icon: Sparkles },
}

const slotOrder: ClothingCategory[] = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
]

function emptySelections(): Record<ClothingCategory, string[]> {
  return {
    Tops: [],
    Bottoms: [],
    Dresses: [],
    Outerwear: [],
    Shoes: [],
    Bags: [],
    Accessories: [],
  }
}

function selectionsForOutfit(outfit: Outfit | undefined, items: ClothingItem[]) {
  const selections = emptySelections()
  if (!outfit) return selections

  const itemsById = new Map(items.map((item) => [item.id, item]))
  for (const id of outfit.itemIds) {
    const item = itemsById.get(id)
    if (item) selections[item.category].push(id)
  }
  return selections
}

function isValidComposition(selections: Record<ClothingCategory, string[]>) {
  const hasDress = selections.Dresses.length === 1
  const hasSeparates = selections.Tops.length === 1 && selections.Bottoms.length === 1
  const hasConflictingBase = selections.Dresses.length > 0 && (selections.Tops.length > 0 || selections.Bottoms.length > 0)
  const hasMultipleSingleSlots = slotOrder
    .filter((category) => category !== 'Accessories')
    .some((category) => selections[category].length > 1)

  return (hasDress || hasSeparates) && !hasConflictingBase && !hasMultipleSingleSlots
}

export function OutfitStudio({ editId }: { editId?: string }) {
  const { items } = useWardrobe()
  const { outfits, addOutfit, updateOutfit } = useOutfits()
  const editingOutfit = editId ? outfits.find((outfit) => outfit.id === editId) : undefined
  const [selections, setSelections] = useState<Record<ClothingCategory, string[]>>(() =>
    selectionsForOutfit(editingOutfit, items),
  )
  const [activeSlot, setActiveSlot] = useState<ClothingCategory | null>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState(editingOutfit?.name ?? '')
  const [description, setDescription] = useState(editingOutfit?.description ?? '')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const missingItemIds = editingOutfit
    ? editingOutfit.itemIds.filter((id) => !itemById.has(id))
    : []
  const selectedItems = useMemo(
    () =>
      slotOrder.flatMap((category) =>
        selections[category]
          .map((id) => itemById.get(id))
          .filter((item): item is ClothingItem => item !== undefined),
      ),
    [itemById, selections],
  )
  const activeItems = useMemo(() => {
    if (!activeSlot) return []
    const query = search.trim().toLowerCase()
    return items.filter(
      (item) =>
        item.category === activeSlot &&
        (!query ||
          [item.name, item.brand, item.color, ...item.seasons, ...item.styles]
            .join(' ')
            .toLowerCase()
            .includes(query)),
    )
  }, [activeSlot, items, search])

  useEffect(() => {
    setSelections((current) => {
      let changed = false
      const next = { ...current }
      for (const category of slotOrder) {
        const validIds = current[category].filter((id) => {
          const item = itemById.get(id)
          return item?.category === category
        })
        if (validIds.length !== current[category].length) {
          next[category] = validIds
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [itemById])

  const baseIsValid =
    isValidComposition(selections) || Boolean(editingOutfit && missingItemIds.length > 0)

  const openSlot = (category: ClothingCategory) => {
    setSearch('')
    setActiveSlot(category)
  }

  const clearSlot = (category: ClothingCategory) => {
    setSelections((current) => ({ ...current, [category]: [] }))
    setFeedback(null)
  }

  const selectItem = (item: ClothingItem) => {
    setSelections((current) => {
      if (item.category === 'Accessories') {
        const selected = current.Accessories.includes(item.id)
        return {
          ...current,
          Accessories: selected
            ? current.Accessories.filter((id) => id !== item.id)
            : [...current.Accessories, item.id],
        }
      }

      const next = { ...current, [item.category]: [item.id] }
      if (item.category === 'Dresses') {
        next.Tops = []
        next.Bottoms = []
      } else if (item.category === 'Tops' || item.category === 'Bottoms') {
        next.Dresses = []
      }
      return next
    })
    setFeedback(null)
    if (item.category !== 'Accessories') setActiveSlot(null)
  }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Add a name for your outfit before saving.' })
      return
    }

    if (!isValidComposition(selections) && !(editingOutfit && missingItemIds.length > 0)) {
      setFeedback({
        type: 'error',
        message: 'Choose a dress, or select both a top and bottoms to complete your look.',
      })
      return
    }

    const selectedItemIds = slotOrder.flatMap((category) => selections[category])
    if (selectedItemIds.some((id) => !itemById.has(id))) {
      setFeedback({ type: 'error', message: 'One or more selected pieces are no longer in your wardrobe.' })
      return
    }
    const itemIds = [...selectedItemIds, ...missingItemIds]

    try {
      if (editingOutfit) {
        updateOutfit(editingOutfit.id, {
          name: trimmedName,
          description: description.trim(),
          itemIds,
        })
        setFeedback({ type: 'success', message: 'Your outfit changes were saved.' })
      } else {
        addOutfit({
          name: trimmedName,
          description: description.trim(),
          itemIds,
          favorite: false,
        })
        setName('')
        setDescription('')
        setSelections(emptySelections())
        setFeedback({ type: 'success', message: 'Your outfit was saved to your collection.' })
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to save this outfit.',
      })
    }
  }

  if (editId && !editingOutfit) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 pt-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">This outfit isn’t available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted or is no longer saved in this browser.
        </p>
        <Link href="/outfits" className="mt-5 text-sm font-semibold text-olive-deep hover:underline">
          Back to your outfits
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 md:gap-9 md:px-10 md:pt-12 lg:px-14">
      <header className="max-w-2xl">
        {editingOutfit && (
          <Link
            href="/outfits"
            className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to saved outfits
          </Link>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-deep">
          Your personal styling space
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          {editingOutfit ? 'Edit your outfit' : 'The Outfit Studio'}
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
          Build a look from the pieces you already love.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-start lg:gap-7">
        <section className="order-1 rounded-3xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(23,23,23,0.03)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-olive-deep">01 / Compose</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Choose your pieces</h2>
            </div>
            <span className="rounded-full bg-olive-soft px-3 py-1.5 text-xs font-medium text-olive-deep">
              {selectedItems.length} {selectedItems.length === 1 ? 'piece' : 'pieces'}
            </span>
          </div>

          {!items.length && (
            <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                Your wardrobe is waiting for its first piece. Add clothing to start creating a look.
              </p>
              <Link
                href="/closet"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-olive-deep hover:underline"
              >
                Add clothing <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {slotOrder.map((category) => {
              const { description: slotDescription, icon: Icon } = slotDetails[category]
              const selected = selections[category]
                .map((id) => itemById.get(id))
                .filter((item): item is ClothingItem => item !== undefined)
              return (
                <div
                  key={category}
                  className={cn(
                    'relative min-w-0 rounded-2xl border border-border transition-colors',
                    selected.length > 0 && 'border-olive/40 bg-olive-soft/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openSlot(category)}
                    aria-label={`Choose ${category.toLowerCase()}${selected.length ? `, currently ${selected.map((item) => item.name).join(', ')}` : ''}`}
                    className="flex min-h-[5.5rem] w-full items-center gap-3 rounded-2xl p-3.5 pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-olive-deep">
                      <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {category}
                        {category === 'Accessories' && (
                          <span className="text-[10px] font-medium text-muted-foreground">MULTI-SELECT</span>
                        )}
                      </span>
                      {selected.length ? (
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {selected.map((item) => item.name).join(', ')}
                        </span>
                      ) : (
                        <span className="mt-1 block text-xs text-muted-foreground">{slotDescription}</span>
                      )}
                    </span>
                    <span className="absolute right-3.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-background text-olive-deep">
                      <Plus className="size-4" aria-hidden="true" />
                    </span>
                  </button>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearSlot(category)}
                      aria-label={`Clear ${category.toLowerCase()}`}
                      className="absolute right-3.5 top-3 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex gap-2 rounded-xl bg-secondary/70 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-olive" aria-hidden="true" />
            <p>
              Choose a dress, or pair a top with bottoms. Adding either option automatically clears the other.
            </p>
          </div>

          <form onSubmit={handleSave} className="mt-7 border-t border-border pt-6">
            <p className="text-xs font-medium text-olive-deep">
              02 / {editingOutfit ? 'Update your look' : 'Save your look'}
            </p>
            <div className="mt-4 grid gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="outfit-name" className="text-sm font-medium">
                  Outfit name <span className="text-olive-deep">*</span>
                </label>
                <input
                  id="outfit-name"
                  name="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setFeedback(null)
                  }}
                  placeholder="e.g. Sunday in the city"
                  className="h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="outfit-description" className="text-sm font-medium">
                  Description <span className="font-normal text-muted-foreground">· optional</span>
                </label>
                <textarea
                  id="outfit-description"
                  name="description"
                  maxLength={280}
                  rows={3}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                    setFeedback(null)
                  }}
                  placeholder="A note about where or how you’ll wear it"
                  className="resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-5 outline-none transition focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
            </div>

            {!baseIsValid && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Add a top and bottoms, or choose a dress, to save this outfit.
              </p>
            )}
            {editingOutfit && missingItemIds.length > 0 && (
              <p className="mt-3 text-xs leading-5 text-amber-800" role="status">
                {missingItemIds.length} unavailable clothing reference{missingItemIds.length === 1 ? '' : 's'} will be kept when you save.
              </p>
            )}
            {feedback && (
              <p
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className={cn(
                  'mt-3 text-sm leading-5',
                  feedback.type === 'error' ? 'text-destructive' : 'text-olive-deep',
                )}
              >
                {feedback.message}
              </p>
            )}
            <Button
              type="submit"
              disabled={!baseIsValid || !name.trim()}
              className="mt-5 h-11 w-full rounded-full bg-olive text-sm font-semibold text-olive-foreground hover:bg-olive-deep"
            >
              {editingOutfit ? 'Save changes' : 'Save outfit'}
            </Button>
          </form>
        </section>

        <section className="order-2 lg:sticky lg:top-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-[#f7f6f2] shadow-[0_8px_30px_rgba(23,23,23,0.03)]">
            <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-7">
              <div>
                <p className="text-xs font-medium text-olive-deep">LIVE PREVIEW</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Your composition</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedItems.length} {selectedItems.length === 1 ? 'piece' : 'pieces'} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:gap-4 sm:px-7 sm:pb-7">
              {selectedItems.length ? (
                selectedItems.map((item) => (
                  <article key={item.id} className="min-w-0">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white/80">
                      <OutfitClothingPhoto item={item} />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground backdrop-blur">
                        {item.category}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-xs font-medium text-foreground sm:text-sm">{item.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.color}{item.brand ? ` · ${item.brand}` : ''}
                    </p>
                  </article>
                ))
              ) : (
                <div className="col-span-2 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-olive/30 bg-white/50 px-6 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-olive-soft text-olive-deep">
                    <Shirt className="size-5" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">A look starts with one piece</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                    Select a dress, or build a base with a top and bottoms.
                  </p>
                </div>
              )}
            </div>
            {name.trim() && (
              <div className="border-t border-black/5 bg-white/60 px-5 py-4 sm:px-7">
                <p className="truncate text-sm font-semibold">{name.trim()}</p>
                {description.trim() && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description.trim()}</p>
                )}
              </div>
            )}
          </div>
          <p className="mt-3 px-1 text-center text-[11px] leading-5 text-muted-foreground">
            Pieces are linked from your wardrobe. Photos and clothing details stay in your closet.
          </p>
        </section>
      </div>

      <Dialog
        open={activeSlot !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSlot(null)
        }}
      >
        <DialogContent className="grid max-h-[min(88dvh,52rem)] max-w-4xl grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-3xl p-4 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Choose {activeSlot?.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {activeSlot === 'Accessories'
                ? 'Select as many accessories as you like, then finish when you’re ready.'
                : activeSlot === 'Dresses'
                  ? 'Choosing a dress will replace any selected top and bottoms.'
                  : activeSlot === 'Tops' || activeSlot === 'Bottoms'
                    ? 'Choosing separates will replace a selected dress.'
                    : `Choose one ${activeSlot?.toLowerCase()} from your wardrobe.`}
            </DialogDescription>
          </DialogHeader>

          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-input bg-background px-3.5 focus-within:border-olive focus-within:ring-2 focus-within:ring-ring/30">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, color, or brand"
              aria-label="Search wardrobe items"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="min-h-0 overflow-y-auto overscroll-contain pr-1">
            {activeItems.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {activeItems.map((item) => {
                  const isSelected = selections[item.category].includes(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item)}
                      aria-pressed={isSelected}
                      className={cn(
                        'group min-w-0 rounded-2xl border bg-background p-2 text-left outline-none transition hover:border-olive/60 focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected ? 'border-olive ring-1 ring-olive/30' : 'border-border',
                      )}
                    >
                      <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-secondary">
                        <OutfitClothingPhoto item={item} />
                        {isSelected && (
                          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-olive text-white">
                            <Check className="size-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block truncate text-xs font-semibold text-foreground sm:text-sm">
                        {item.name}
                      </span>
                      <span className="mt-1 flex min-w-0 items-center justify-between gap-1 text-[10px] text-muted-foreground sm:text-xs">
                        <span className="truncate">{item.color} · {item.brand}</span>
                        <span className="shrink-0">{item.status}</span>
                      </span>
                      <span className="mt-1.5 block truncate text-[10px] text-muted-foreground">
                        {item.seasons.join(' · ')}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-secondary/70 px-6 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-background text-olive-deep">
                  <BriefcaseBusiness className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {items.length ? `No ${activeSlot?.toLowerCase()} found` : 'Your wardrobe is empty'}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {items.length
                    ? search
                      ? 'Try another search, or add this category to your wardrobe.'
                      : `Add a ${activeSlot?.toLowerCase()} to your wardrobe to use this slot.`
                    : 'Add a few clothing pieces first, then come back to build your look.'}
                </p>
                <Link
                  href="/closet"
                  onClick={() => setActiveSlot(null)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-olive-deep hover:underline"
                >
                  Add clothing <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            {selections[activeSlot ?? 'Tops'].length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (activeSlot) clearSlot(activeSlot)
                  setActiveSlot(null)
                }}
                className="text-muted-foreground"
              >
                Clear {activeSlot?.toLowerCase()}
              </Button>
            ) : (
              <span className="hidden text-xs text-muted-foreground sm:block">
                {activeSlot === 'Accessories' ? 'Tap items to add or remove them.' : 'Selecting an item replaces the current one.'}
              </span>
            )}
            <Button
              type="button"
              onClick={() => setActiveSlot(null)}
              className="h-10 rounded-full bg-olive px-5 text-olive-foreground hover:bg-olive-deep"
            >
              {activeSlot === 'Accessories' ? 'Done' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
