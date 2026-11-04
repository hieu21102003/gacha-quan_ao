'use client'

import { ClothingCard } from './clothing-card'
import type { ClothingItem } from '@/lib/wardrobe-data'

interface ClosetGridProps {
  items: ClothingItem[]
  onSelect: (item: ClothingItem) => void
  onToggleFavorite: (id: string) => void
}

export function ClosetGrid({ items, onSelect, onToggleFavorite }: ClosetGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4">
      {items.map((item) => (
        <ClothingCard
          key={item.id}
          item={item}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}
