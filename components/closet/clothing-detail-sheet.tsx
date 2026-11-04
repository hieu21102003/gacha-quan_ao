'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Pencil, Trash2 } from 'lucide-react'
import { sheetContentClass } from './sheet-content'
import { useClothingImage } from '@/components/closet/use-clothing-image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPrice } from '@/lib/format'
import type { ClothingItem } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

interface ClothingDetailSheetProps {
  item: ClothingItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleFavorite: (id: string) => void
  onEdit: (item: ClothingItem) => void
  onDelete: (id: string) => void
}

export function ClothingDetailSheet({
  item,
  open,
  onOpenChange,
  onToggleFavorite,
  onEdit,
  onDelete,
}: ClothingDetailSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { src, error } = useClothingImage(item?.image)

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmingDelete(false)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(sheetContentClass, 'gap-5')}>
        {item && (
          <>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
              {src ? (
                <Image
                  src={src}
                  alt={item.imageAlt}
                  fill
                  sizes="512px"
                  className="object-cover"
                  unoptimized={src.startsWith('blob:')}
                />
              ) : (
                error && (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Image unavailable
                  </span>
                )
              )}
            </div>
            <DialogHeader className="gap-1.5 text-left">
              <DialogTitle className="text-xl font-semibold tracking-tight">{item.name}</DialogTitle>
              <DialogDescription>
                {item.brand} · {item.category}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Primary color</dt>
                <dd className="mt-1 font-medium">{item.color}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Purchase price</dt>
                <dd className="mt-1 font-medium">{formatPrice(item.price)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Wearing status</dt>
                <dd className="mt-1 font-medium">{item.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Brand</dt>
                <dd className="mt-1 font-medium">{item.brand}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Season</p>
              <ul className="flex flex-wrap gap-2">
                {item.seasons.map((season) => (
                  <li
                    key={season}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium"
                  >
                    {season}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Style</p>
              <ul className="flex flex-wrap gap-2">
                {item.styles.map((style) => (
                  <li
                    key={style}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium"
                  >
                    {style}
                  </li>
                ))}
              </ul>
            </div>

            {confirmingDelete ? (
              <div className="rounded-2xl bg-secondary p-4">
                <p className="text-sm font-medium text-foreground">Delete this piece?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.name} will be removed from your closet for this session.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-full"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11 flex-1 rounded-full"
                    onClick={() => {
                      onDelete(item.id)
                      setConfirmingDelete(false)
                      onOpenChange(false)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  className="h-12 rounded-full text-sm font-semibold"
                  onClick={() => onEdit(item)}
                >
                  <Pencil aria-hidden="true" />
                  Edit Item
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-12 rounded-full"
                    onClick={() => onToggleFavorite(item.id)}
                  >
                    <Heart
                      className={cn(item.favorite && 'fill-olive text-olive')}
                      aria-hidden="true"
                    />
                    {item.favorite ? 'Favorited' : 'Add to Favorites'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-full"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
