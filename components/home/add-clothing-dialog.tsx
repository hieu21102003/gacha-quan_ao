'use client'

import { useEffect, useId, useState } from 'react'
import { Check, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { clothingCategories, type ClothingCategory } from '@/lib/wardrobe-data'

interface AddClothingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClothingDialog({ open, onOpenChange }: AddClothingDialogProps) {
  const inputId = useId()
  const nameId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [category, setCategory] = useState<ClothingCategory>('Tops')
  const [name, setName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const reset = () => {
    setFile(null)
    setName('')
    setCategory('Tops')
    setSubmitted(false)
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const acceptFile = (candidate: File | undefined) => {
    if (candidate && candidate.type.startsWith('image/')) setFile(candidate)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">Add Clothing</DialogTitle>
          <DialogDescription>
            Snap or upload a photo of your piece. A clean, flat background works best.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-olive-soft px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-olive text-olive-foreground">
              <Check className="size-5" aria-hidden="true" />
            </span>
            <p className="text-base font-semibold text-foreground">
              {name || 'Your item'} is ready
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Saving to your closet arrives in the next update. Your photo stays on this device.
            </p>
            <Button variant="outline" className="mt-2 h-10 rounded-full px-5" onClick={reset}>
              Add another
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (file) setSubmitted(true)
            }}
          >
            {previewUrl ? (
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={previewUrl} alt="Selected clothing preview" className="size-full object-contain" />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Remove photo"
                  className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                htmlFor={inputId}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  acceptFile(event.dataTransfer.files[0])
                }}
                className={cn(
                  'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary px-6 text-center transition-colors',
                  isDragging && 'border-olive bg-olive-soft',
                )}
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-background">
                  <ImagePlus className="size-5 text-olive-deep" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-foreground">Tap to upload a photo</span>
                <span className="text-xs text-muted-foreground">or drag and drop · PNG, JPG</span>
              </label>
            )}
            <input
              id={inputId}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />

            <div className="flex flex-col gap-2">
              <label htmlFor={nameId} className="text-xs font-medium text-muted-foreground">
                Item name
              </label>
              <input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Oversized Poplin Shirt"
                className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-medium text-muted-foreground">Category</legend>
              <div className="flex flex-wrap gap-2">
                {clothingCategories.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={category === option}
                    onClick={() => setCategory(option)}
                    className={cn(
                      'h-9 rounded-full border px-3.5 text-xs font-medium transition-colors',
                      category === option
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-foreground hover:bg-secondary',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <Button type="submit" disabled={!file} className="h-12 rounded-full text-sm font-semibold">
              Continue
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
