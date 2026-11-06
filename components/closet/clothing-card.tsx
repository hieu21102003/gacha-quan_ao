'use client'

import Image from 'next/image'
import { Heart } from 'lucide-react'
import { useClothingImage } from '@/components/closet/use-clothing-image'
import type { ClothingItem } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

interface ClothingCardProps {
  item: ClothingItem
  onSelect: (item: ClothingItem) => void
  onToggleFavorite: (id: string) => Promise<void>
}

export function ClothingCard({ item, onSelect, onToggleFavorite }: ClothingCardProps) {
  const { src, error } = useClothingImage(item.image)

  return (
    <article className="group flex flex-col gap-2.5">
      <div className="relative">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-secondary text-left outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          {src ? (
            <Image
              src={src}
              alt={item.imageAlt}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              unoptimized={src.startsWith('blob:')}
            />
          ) : (
            error && (
              <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
                Image unavailable
              </span>
            )
          )}
        </button>
        <button
          type="button"
          onClick={() => void onToggleFavorite(item.id)}
          aria-label={item.favorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
          aria-pressed={item.favorite}
          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur transition-transform active:scale-95"
        >
          <Heart
            className={cn('size-3.5', item.favorite && 'fill-olive text-olive')}
            aria-hidden="true"
          />
        </button>
        {item.status !== 'Available' && (
          <span
            className={cn(
              'absolute bottom-2.5 left-2.5 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur',
              item.status === 'In laundry'
                ? 'bg-amber-100/95 text-amber-900'
                : 'bg-background/90 text-foreground',
            )}
          >
            {item.status}
          </span>
        )}
      </div>
      <div className="px-0.5">
        <h3 className="truncate text-sm font-medium tracking-tight text-foreground">{item.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
      </div>
    </article>
  )
}
