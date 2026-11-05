'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Heart,
  Layers,
  Pencil,
  Search,
  Shirt,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { OutfitClothingPhoto } from '@/components/outfits/outfit-clothing-photo'
import { useOutfits } from '@/components/providers/outfit-provider'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveOutfitItems, type ClothingItem, type Outfit } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

type OutfitFilter = 'All outfits' | 'Favorites'

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function OutfitPreview({
  items,
  missingCount,
}: {
  items: ClothingItem[]
  missingCount: number
}) {
  const visibleItems = items.slice(0, 4)

  if (!visibleItems.length) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl bg-secondary px-5 text-center">
        <Shirt className="size-7 text-olive" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-xs text-muted-foreground">
          {missingCount ? 'Clothing items unavailable' : 'No clothing items in this outfit'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid aspect-[4/3] grid-cols-2 gap-1 overflow-hidden rounded-2xl bg-secondary',
        visibleItems.length === 1 && 'grid-cols-1',
      )}
    >
      {visibleItems.map((item, index) => (
        <span
          key={`${item.id}-${index}`}
          className="relative min-h-0 overflow-hidden bg-[#f7f6f2]"
        >
          <OutfitClothingPhoto item={item} />
          {index === 3 && items.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-sm font-semibold text-background backdrop-blur-[1px]">
              +{items.length - 4}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

function OutfitCard({
  outfit,
  items,
  onOpen,
  onToggleFavorite,
}: {
  outfit: Outfit
  items: ClothingItem[]
  onOpen: () => void
  onToggleFavorite: () => void
}) {
  const { items: outfitItems, missingItemIds } = resolveOutfitItems(outfit, items)

  return (
    <article className="group min-w-0">
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View outfit ${outfit.name}`}
          className="block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <OutfitPreview items={outfitItems} missingCount={missingItemIds.length} />
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={outfit.favorite ? `Remove ${outfit.name} from favorites` : `Add ${outfit.name} to favorites`}
          aria-pressed={outfit.favorite}
          className="absolute right-2.5 top-2.5 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-transform active:scale-95"
        >
          <Heart
            className={cn('size-4', outfit.favorite && 'fill-olive text-olive')}
            aria-hidden="true"
          />
        </button>
      </div>
      <button type="button" onClick={onOpen} className="mt-3 block w-full text-left">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          {outfit.name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            {outfitItems.length} {outfitItems.length === 1 ? 'available piece' : 'available pieces'}
          </span>
          {missingItemIds.length > 0 && (
            <span className="text-amber-800">
              · {missingItemIds.length} unavailable
            </span>
          )}
        </span>
      </button>
    </article>
  )
}

function OutfitDetailsDialog({
  outfit,
  items,
  open,
  onOpenChange,
  onToggleFavorite,
  onDelete,
}: {
  outfit: Outfit | null
  items: ClothingItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const resolved = outfit ? resolveOutfitItems(outfit, items) : null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setConfirmingDelete(false)
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(90dvh,52rem)] gap-5 overflow-y-auto rounded-3xl p-5 sm:max-w-2xl sm:p-7">
        {outfit && resolved && (
          <>
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-olive-deep">
                Saved outfit
              </p>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {outfit.name}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {outfit.description || 'A look from your personal wardrobe.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {resolved.items.map((item, index) => (
                <article key={`${item.id}-${index}`} className="min-w-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
                    <OutfitClothingPhoto item={item} />
                    <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold">{item.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {item.color}{item.brand ? ` · ${item.brand}` : ''}
                  </p>
                </article>
              ))}
              {resolved.items.length === 0 && (
                <div className="col-span-2 flex min-h-36 flex-col items-center justify-center rounded-2xl bg-secondary px-5 text-center sm:col-span-3">
                  <Shirt className="size-6 text-olive" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">No available clothing images</p>
                </div>
              )}
            </div>

            {resolved.missingItemIds.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <h3 className="text-sm font-semibold text-amber-950">
                  {resolved.missingItemIds.length} clothing reference
                  {resolved.missingItemIds.length === 1 ? '' : 's'} unavailable
                </h3>
                <p className="mt-1 text-xs leading-5 text-amber-900/80">
                  These clothing records are no longer in your wardrobe. The references remain saved with this outfit.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-950">
                  {resolved.missingItemIds.map((id, index) => (
                    <li key={`${id}-${index}`} className="break-all">
                      {id}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/70 p-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="mt-1 font-medium">{formatDate(outfit.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="mt-1 font-medium">{formatDate(outfit.updatedAt)}</dd>
              </div>
            </dl>

            {confirmingDelete ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-semibold">Delete “{outfit.name}”?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  This removes the saved outfit only. Clothing items in your wardrobe will not be changed.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-full"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep outfit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 flex-1 rounded-full"
                    onClick={() => {
                      onDelete(outfit.id)
                      setConfirmingDelete(false)
                      onOpenChange(false)
                    }}
                  >
                    Delete outfit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Link
                  href={`/create?edit=${encodeURIComponent(outfit.id)}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-olive px-4 text-sm font-semibold text-olive-foreground hover:bg-olive-deep"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit outfit
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  aria-pressed={outfit.favorite}
                  onClick={() => onToggleFavorite(outfit.id)}
                >
                  <Heart
                    className={cn(outfit.favorite && 'fill-olive text-olive')}
                    aria-hidden="true"
                  />
                  {outfit.favorite ? 'Favorited' : 'Favorite'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-2 h-11 rounded-full text-destructive sm:col-span-1"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function OutfitCollection() {
  const { outfits, toggleOutfitFavorite, deleteOutfit } = useOutfits()
  const { items } = useWardrobe()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<OutfitFilter>('All outfits')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sortedOutfits = useMemo(
    () => [...outfits].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [outfits],
  )
  const filteredOutfits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sortedOutfits.filter(
      (outfit) =>
        (filter === 'All outfits' || outfit.favorite) &&
        (!normalizedQuery || outfit.name.toLowerCase().includes(normalizedQuery)),
    )
  }, [filter, query, sortedOutfits])
  const selectedOutfit = selectedId
    ? (outfits.find((outfit) => outfit.id === selectedId) ?? null)
    : null

  const clearFilters = () => {
    setQuery('')
    setFilter('All outfits')
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 md:gap-9 md:px-10 md:pt-12 lg:px-14">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-deep">
            Curated by you
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Saved outfits
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Your favorite looks, thoughtfully put together from your wardrobe.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-olive px-5 text-sm font-semibold text-olive-foreground transition-colors hover:bg-olive-deep"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Create an outfit
        </Link>
      </header>

      <section aria-label="Saved outfit filters" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex h-11 w-full items-center gap-2.5 rounded-full border border-input bg-card px-4 sm:max-w-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search outfits"
              aria-label="Search outfits by name"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear outfit search"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </label>

          <div className="flex items-center gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Filter outfits">
            {(['All outfits', 'Favorites'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={cn(
                  'h-9 rounded-full px-4 text-xs font-semibold transition-colors',
                  filter === option
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option}
                {option === 'All outfits' && (
                  <span className="ml-1.5 text-muted-foreground">{outfits.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {outfits.length === 0 ? (
          <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-3xl border border-dashed border-olive/30 bg-secondary/40 px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-background text-olive-deep">
              <Layers className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Your collection starts here</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Save an outfit from pieces in your wardrobe and it will appear here.
            </p>
            <Link
              href="/create"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-olive px-5 text-sm font-semibold text-olive-foreground hover:bg-olive-deep"
            >
              Create your first outfit <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-3xl bg-secondary/60 px-6 text-center">
            <Search className="size-6 text-olive" strokeWidth={1.6} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">No outfits found</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              {filter === 'Favorites' && !query.trim()
                ? 'You haven’t favorited any outfits yet.'
                : 'Try a different name or switch to all outfits.'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-10 rounded-full px-5"
              onClick={clearFilters}
            >
              Clear search and filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filteredOutfits.length} {filteredOutfits.length === 1 ? 'outfit' : 'outfits'}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-4 lg:gap-x-6">
              {filteredOutfits.map((outfit) => {
                return (
                  <OutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    items={items}
                    onOpen={() => setSelectedId(outfit.id)}
                    onToggleFavorite={() => toggleOutfitFavorite(outfit.id)}
                  />
                )
              })}
            </div>
          </>
        )}
      </section>

      <OutfitDetailsDialog
        outfit={selectedOutfit}
        items={items}
        open={Boolean(selectedOutfit)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onToggleFavorite={toggleOutfitFavorite}
        onDelete={deleteOutfit}
      />
    </div>
  )
}
