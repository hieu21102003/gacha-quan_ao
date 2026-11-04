'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Outfit } from '@/lib/wardrobe-data'

interface OutfitDetailsDialogProps {
  outfit: Outfit
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OutfitDetailsDialog({ outfit, open, onOpenChange }: OutfitDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-secondary">
          <Image src={outfit.image} alt={outfit.imageAlt} fill sizes="448px" className="object-cover" />
        </div>
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">{outfit.name}</DialogTitle>
          <DialogDescription className="leading-relaxed">{outfit.note}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border border-y border-border">
          {outfit.pieces.map((piece) => (
            <li key={piece.name} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{piece.name}</p>
                <p className="text-xs text-muted-foreground">{piece.category}</p>
              </div>
              <span className="text-xs text-muted-foreground">{piece.color}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
