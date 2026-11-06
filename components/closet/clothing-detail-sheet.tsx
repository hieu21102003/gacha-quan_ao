'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Pencil, Shirt, Trash2 } from 'lucide-react'
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
import type { ClothingItem, WearStatus } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

interface ClothingDetailSheetProps {
  item: ClothingItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleFavorite: (id: string) => Promise<void>
  onUpdateStatus: (id: string, status: WearStatus) => Promise<void>
  onEdit: (item: ClothingItem) => void
  onDelete: (id: string) => Promise<void>
}

export function ClothingDetailSheet({
  item,
  open,
  onOpenChange,
  onToggleFavorite,
  onUpdateStatus,
  onEdit,
  onDelete,
}: ClothingDetailSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null)
  const { src, error } = useClothingImage(item?.image)

  const handleUpdateStatus = async (status: Extract<WearStatus, 'Available' | 'In laundry'>) => {
    if (!item || status === item.status) return

    setIsUpdatingStatus(true)
    setActionError(null)
    setStatusFeedback(null)
    try {
      await onUpdateStatus(item.id, status)
      setStatusFeedback(`Marked ${item.name} ${status === 'Available' ? 'available' : 'in laundry'}.`)
    } catch (statusError) {
      setActionError(
        statusError instanceof Error
          ? statusError.message
          : 'Unable to update this clothing status.',
      )
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    setIsDeleting(true)
    setActionError(null)
    try {
      await onDelete(item.id)
      setConfirmingDelete(false)
      onOpenChange(false)
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete this clothing item.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && (isDeleting || isUpdatingStatus)) return
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
                <dd className="mt-1">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                      item.status === 'In laundry'
                        ? 'bg-amber-100 text-amber-900'
                        : item.status === 'Worn recently'
                          ? 'bg-secondary text-muted-foreground'
                          : 'bg-olive-soft text-olive-deep',
                    )}
                  >
                    {item.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Brand</dt>
                <dd className="mt-1 font-medium">{item.brand}</dd>
              </div>
            </dl>

            <section aria-labelledby="laundry-status-heading" className="rounded-2xl bg-secondary/60 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-olive-deep">
                  <Shirt className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id="laundry-status-heading" className="text-sm font-semibold">
                    Laundry status
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    Keep this piece in your closet while it is being washed.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['Available', 'In laundry'] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={item.status === status ? 'default' : 'outline'}
                        aria-pressed={item.status === status}
                        disabled={isUpdatingStatus}
                        onClick={() => void handleUpdateStatus(status)}
                        className={cn(
                          'h-10 rounded-full text-xs',
                          status === 'In laundry' &&
                            item.status === status &&
                            'bg-amber-700 text-white hover:bg-amber-800',
                        )}
                      >
                        {isUpdatingStatus && item.status !== status
                          ? 'Saving…'
                          : status}
                      </Button>
                    ))}
                  </div>
                  {statusFeedback && (
                    <p role="status" aria-live="polite" className="mt-2 text-xs text-olive-deep">
                      {statusFeedback}
                    </p>
                  )}
                  {actionError && (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {actionError}
                    </p>
                  )}
                </div>
              </div>
            </section>

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
                {actionError && (
                  <p role="alert" className="mt-2 text-xs text-destructive">{actionError}</p>
                )}
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
                    disabled={isDeleting}
                    onClick={() => void handleDelete()}
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
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
                    disabled={isUpdatingStatus}
                    onClick={() => void onToggleFavorite(item.id)}
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
                    disabled={isUpdatingStatus}
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
