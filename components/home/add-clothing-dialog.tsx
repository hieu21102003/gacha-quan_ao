'use client'

import { AddClothingForm } from '@/components/closet/add-clothing-form'
import { sheetContentClass } from '@/components/closet/sheet-content'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ClothingItem } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

interface AddClothingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: ClothingItem | null
}

export function AddClothingDialog({ open, onOpenChange, item = null }: AddClothingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sheetContentClass, 'gap-5')}>
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {item ? 'Edit item' : 'Add Clothing'}
          </DialogTitle>
          <DialogDescription>
            {item
              ? 'Update the details of this piece. Changes appear in your closet immediately.'
              : 'Snap or upload a photo of your piece. A clean, flat background works best.'}
          </DialogDescription>
        </DialogHeader>
        <AddClothingForm key={item?.id ?? 'new'} item={item} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
