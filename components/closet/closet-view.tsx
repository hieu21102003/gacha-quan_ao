'use client'

import { useMemo, useState } from 'react'
import { CategoryTabs } from './category-tabs'
import { ClosetEmptyState } from './closet-empty-state'
import { ClosetFilters } from './closet-filters'
import { ClosetGrid } from './closet-grid'
import { ClosetHeader } from './closet-header'
import { ClothingDetailSheet } from './clothing-detail-sheet'
import { AddClothingDialog } from '@/components/home/add-clothing-dialog'
import {
  activeFilterCount,
  countByCategory,
  emptyClosetFilters,
  filterClosetItems,
  hasActiveFilters,
  useWardrobe,
  type ClosetFiltersState,
} from '@/components/providers/wardrobe-provider'
import type { ClosetTabCategory, ClothingItem } from '@/lib/wardrobe-data'

export function ClosetView() {
  const { items, toggleFavorite, deleteItem } = useWardrobe()
  const [category, setCategory] = useState<ClosetTabCategory>('All Items')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ClosetFiltersState>(emptyClosetFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<ClothingItem | null>(null)
  const [selected, setSelected] = useState<ClothingItem | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const counts = useMemo(() => countByCategory(items), [items])
  const selectedItem = selected ? (items.find((item) => item.id === selected.id) ?? null) : null

  const visibleItems = useMemo(
    () => filterClosetItems(items, { category, query, filters }),
    [items, category, query, filters],
  )

  const openAdd = () => {
    setEditing(null)
    setAddOpen(true)
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id)
      setMutationError(null)
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to update this favorite.')
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem(id)
      setMutationError(null)
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to delete this item.')
      throw error
    }
  }

  const emptyVariant = !items.length
    ? 'collection'
    : query.trim() && !visibleItems.length
      ? 'search'
      : !visibleItems.length
        ? 'category'
        : null

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8 md:gap-10 md:px-10 md:pt-12 lg:px-14">
      <ClosetHeader
        total={items.length}
        query={query}
        onQueryChange={setQuery}
        onOpenFilters={() => setFiltersOpen(true)}
        onAddClothing={openAdd}
        activeFilterCount={activeFilterCount(filters)}
      />
      {mutationError && (
        <p role="alert" className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {mutationError}
        </p>
      )}

      <CategoryTabs value={category} counts={counts} onChange={setCategory} />

      {emptyVariant ? (
        <ClosetEmptyState
          variant={emptyVariant}
          categoryLabel={
            hasActiveFilters(filters) && category === 'All Items' ? 'matching items' : category
          }
          onAddClothing={openAdd}
          onClear={() => {
            if (emptyVariant === 'search') {
              setQuery('')
              return
            }
            setCategory('All Items')
            setFilters(emptyClosetFilters)
          }}
        />
      ) : (
        <ClosetGrid
          items={visibleItems}
          onSelect={setSelected}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      <ClothingDetailSheet
        item={selectedItem}
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onToggleFavorite={handleToggleFavorite}
        onEdit={(item) => {
          setSelected(null)
          setEditing(item)
          setAddOpen(true)
        }}
        onDelete={handleDeleteItem}
      />

      <ClosetFilters
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filters}
        onChange={setFilters}
      />

      <AddClothingDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setEditing(null)
        }}
        item={editing}
      />
    </div>
  )
}
