'use client'

import { closetTabCategories, type ClosetTabCategory } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

interface CategoryTabsProps {
  value: ClosetTabCategory
  counts: Record<ClosetTabCategory, number>
  onChange: (value: ClosetTabCategory) => void
}

export function CategoryTabs({ value, counts, onChange }: CategoryTabsProps) {
  return (
    <div className="-mx-5 overflow-x-auto no-scrollbar md:mx-0" role="tablist" aria-label="Clothing categories">
      <div className="flex w-max gap-2 px-5 md:w-full md:flex-wrap md:px-0">
        {closetTabCategories.map((category) => {
          const selected = value === category
          const count = counts[category]
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(category)}
              className={cn(
                'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
                selected
                  ? 'bg-olive text-olive-foreground'
                  : 'bg-secondary text-foreground hover:bg-olive-soft',
              )}
            >
              {category}
              {(category === 'All Items' || count > 0) && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    selected ? 'text-olive-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
