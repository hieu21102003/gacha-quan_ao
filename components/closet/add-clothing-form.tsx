'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/closet/filter-chip'
import { useClothingImage } from '@/components/closet/use-clothing-image'
import { cn } from '@/lib/utils'
import { deleteImage, isStoredImageReference, saveImage } from '@/lib/image-storage'
import {
  clothingCategories,
  clothingColors,
  clothingSeasons,
  clothingStyles,
  type ClothingCategory,
  type ClothingItem,
} from '@/lib/wardrobe-data'
import { useWardrobe } from '@/components/providers/wardrobe-provider'

interface AddClothingFormProps {
  item?: ClothingItem | null
  onSaved: () => void
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

export function AddClothingForm({ item, onSaved }: AddClothingFormProps) {
  const { addItem, updateItem } = useWardrobe()
  const inputId = useId()
  const nameId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState<ClothingCategory>(item?.category ?? 'Tops')
  const [color, setColor] = useState(item?.color ?? 'White')
  const [seasons, setSeasons] = useState<string[]>(item?.seasons ?? ['All season'])
  const [styles, setStyles] = useState<string[]>(item?.styles ?? ['Minimal'])
  const [isDragging, setIsDragging] = useState(false)
  const existingImageReference = item?.image.startsWith('blob:') ? undefined : item?.image
  const { src: existingImageUrl, error: existingImageError } = useClothingImage(
    existingImageReference,
  )

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setFilePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const previewUrl = imageRemoved ? null : filePreviewUrl ?? existingImageUrl
  const legacyImageError =
    item?.image.startsWith('blob:') ? 'This temporary photo is no longer available. Please upload it again.' : null
  const imageError = errorMessage ?? (file || imageRemoved ? null : legacyImageError ?? existingImageError)

  const acceptFile = (candidate: File | undefined) => {
    if (candidate && candidate.type.startsWith('image/')) {
      setFile(candidate)
      setFilePreviewUrl(null)
      setImageRemoved(false)
      setErrorMessage(null)
    }
  }

  const canSave =
    name.trim().length > 0 &&
    Boolean(previewUrl) &&
    seasons.length > 0 &&
    styles.length > 0 &&
    !isSaving

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave || !previewUrl) return

    setIsSaving(true)
    setErrorMessage(null)
    let newlyStoredImage: string | null = null

    try {
      const imageReference = file
        ? (newlyStoredImage = await saveImage(file))
        : existingImageReference

      if (!imageReference || imageRemoved || imageReference.startsWith('blob:')) {
        throw new Error('Please choose a photo before saving this item.')
      }

      if (item && file && isStoredImageReference(item.image)) {
        await deleteImage(item.image)
      }

      const payload = {
        name: name.trim(),
        category,
        image: imageReference,
        imageAlt: `${name.trim()} on a studio background`,
        color,
        brand: item?.brand ?? 'Your collection',
        seasons,
        styles,
        price: item?.price ?? 0,
        status: item?.status ?? 'Available',
        favorite: item?.favorite ?? false,
      } as const

      if (item) {
        updateItem(item.id, payload)
      } else {
        addItem(payload)
      }
      onSaved()
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Unable to save this clothing item.'
      if (newlyStoredImage) {
        try {
          await deleteImage(newlyStoredImage)
        } catch (cleanupError) {
          const cleanupMessage =
            cleanupError instanceof Error ? cleanupError.message : 'Unable to clean up the new image.'
          message = `${message} ${cleanupMessage}`
        }
      }
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {previewUrl ? (
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element -- supports local object URLs */}
          <img src={previewUrl} alt="Selected clothing preview" className="size-full object-contain" />
          <button
            type="button"
            onClick={() => {
              setFile(null)
              setFilePreviewUrl(null)
              setImageRemoved(true)
              setErrorMessage(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
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
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          acceptFile(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-xs font-medium text-muted-foreground">
          Clothing name
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
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Category</legend>
        <div className="flex flex-wrap gap-2">
          {clothingCategories.map((option) => (
            <FilterChip
              key={option}
              label={option}
              selected={category === option}
              onClick={() => setCategory(option)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Primary color</legend>
        <div className="flex flex-wrap gap-2">
          {clothingColors.map((option) => (
            <FilterChip
              key={option}
              label={option}
              selected={color === option}
              onClick={() => setColor(option)}
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
              selected={seasons.includes(option)}
              onClick={() => setSeasons((current) => toggleValue(current, option))}
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
              selected={styles.includes(option)}
              onClick={() => setStyles((current) => toggleValue(current, option))}
            />
          ))}
        </div>
      </fieldset>

      {imageError && (
        <p role="alert" className="text-sm text-destructive">
          {imageError}
        </p>
      )}
      <Button type="submit" disabled={!canSave} className="h-12 rounded-full text-sm font-semibold">
        {isSaving ? 'Saving…' : item ? 'Save changes' : 'Save to closet'}
      </Button>
    </form>
  )
}
