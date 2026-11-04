'use client'

import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClosetHeaderProps {
  total: number
  query: string
  onQueryChange: (value: string) => void
  onOpenFilters: () => void
  onAddClothing: () => void
  activeFilterCount: number
}

export function ClosetHeader({
  total,
  query,
  onQueryChange,
  onOpenFilters,
  onAddClothing,
  activeFilterCount,
}: ClosetHeaderProps) {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive-deep">
            {total} {total === 1 ? 'piece' : 'pieces'}
          </p>
          <h1 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
            My Closet
          </h1>
          <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Everything you own, beautifully organized.
          </p>
        </div>
        <Button
          onClick={onAddClothing}
          className="hidden h-12 rounded-full px-5 text-sm font-semibold md:inline-flex"
        >
          <Plus aria-hidden="true" />
          Add Clothing
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search clothing</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by name"
            className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenFilters}
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Open filters'}
          className="relative h-12 w-12 shrink-0 rounded-full border-border p-0"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-olive text-[10px] font-semibold text-olive-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button
          onClick={onAddClothing}
          aria-label="Add Clothing"
          className="h-12 w-12 shrink-0 rounded-full p-0 md:hidden"
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
