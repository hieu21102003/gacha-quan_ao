'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { useClothingImage } from '@/components/closet/use-clothing-image'
import type { ClothingItem } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

export function OutfitClothingPhoto({
  item,
  className,
}: {
  item: ClothingItem
  className?: string
}) {
  const { src, error } = useClothingImage(item.image)
  const [failedSource, setFailedSource] = useState<string | null>(null)

  useEffect(() => {
    setFailedSource(null)
  }, [src])

  const isUnavailable = Boolean(error) || failedSource === src

  return (
    <div className="relative flex size-full items-center justify-center overflow-hidden">
      {src && !isUnavailable ? (
        <Image
          src={src}
          alt={item.imageAlt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 35vw, 70vw"
          className={cn('object-contain p-2', className)}
          unoptimized={src.startsWith('blob:')}
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span className="flex flex-col items-center gap-2 px-3 text-center text-xs text-muted-foreground">
          <ShoppingBag className="size-5 text-olive" aria-hidden="true" />
          {isUnavailable ? 'Image unavailable' : 'Loading photo'}
        </span>
      )}
    </div>
  )
}
