'use client'

import { FilterChip } from './filter-chip'
import { sheetContentClass } from './sheet-content'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clothingColors, clothingSeasons, clothingStyles, wearStatuses } from '@/lib/wardrobe-data'
import {
  emptyClosetFilters,
  type ClosetFiltersState,
} from '@/components/providers/wardrobe-provider'
import { cn } from '@/lib/utils'

interface ClosetFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ClosetFiltersState
  onChange: (next: ClosetFiltersState) => void
}

function toggle(list: string[], option: string) {
  return list.includes(option) ? list.filter((entry) => entry !== option) : [...list, option]
}

export function ClosetFilters({ open, onOpenChange, value, onChange }: ClosetFiltersProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sheetContentClass, 'gap-5')}>
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">Filters</DialogTitle>
          <DialogDescription>Refine by color, season, style, and availability.</DialogDescription>
        </DialogHeader>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Primary color</legend>
          <div className="flex flex-wrap gap-2">
            {clothingColors.map((option) => (
              <FilterChip
                key={option}
                label={option}
                selected={value.colors.includes(option)}
                onClick={() => onChange({ ...value, colors: toggle(value.colors, option) })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Season</legend>
          <div className="flex flex-wrap gap-2">
            {clothingSeasons.map((option) => (
              <FilterChip
                key={option}
                label={option}
                selected={value.seasons.includes(option)}
                onClick={() => onChange({ ...value, seasons: toggle(value.seasons, option) })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Style</legend>
          <div className="flex flex-wrap gap-2">
            {clothingStyles.map((option) => (
              <FilterChip
                key={option}
                label={option}
                selected={value.styles.includes(option)}
                onClick={() => onChange({ ...value, styles: toggle(value.styles, option) })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Availability</legend>
          <div className="flex flex-wrap gap-2">
            {wearStatuses.map((option) => (
              <FilterChip
                key={option}
                label={option}
                selected={value.statuses.includes(option)}
                onClick={() =>
                  onChange({
                    ...value,
                    statuses: value.statuses.includes(option)
                      ? value.statuses.filter((entry) => entry !== option)
                      : [...value.statuses, option],
                  })
                }
              />
            ))}
          </div>
        </fieldset>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-full"
            onClick={() => onChange(emptyClosetFilters)}
          >
            Clear filters
          </Button>
          <Button type="button" className="h-12 flex-1 rounded-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
