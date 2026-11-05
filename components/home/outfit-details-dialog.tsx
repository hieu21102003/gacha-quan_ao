'use client'

import { Shirt } from 'lucide-react'
import { OutfitClothingPhoto } from '@/components/outfits/outfit-clothing-photo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveOutfitItems, type ClothingItem, type Outfit } from '@/lib/wardrobe-data'

interface OutfitDetailsDialogProps {
  outfit: Outfit
  items: ClothingItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OutfitDetailsDialog({
  outfit,
  items,
  open,
  onOpenChange,
}: OutfitDetailsDialogProps) {
  const resolved = resolveOutfitItems(outfit, items)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,52rem)] gap-5 overflow-y-auto rounded-3xl p-5 sm:max-w-md">
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">{outfit.name}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {outfit.description || 'A look from your saved wardrobe.'}
          </DialogDescription>
        </DialogHeader>
        {resolved.items.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3">
            {resolved.items.map((item, index) => (
              <li key={`${item.id}-${index}`} className="min-w-0">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
                  <OutfitClothingPhoto item={item} />
                </div>
                <p className="mt-2 truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category} · {item.color}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-secondary px-5 text-center">
            <Shirt className="size-6 text-olive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No referenced clothing is available.</p>
          </div>
        )}
        {resolved.missingItemIds.length > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            {resolved.missingItemIds.length} referenced{' '}
            {resolved.missingItemIds.length === 1 ? 'item is' : 'items are'} no longer in your closet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
