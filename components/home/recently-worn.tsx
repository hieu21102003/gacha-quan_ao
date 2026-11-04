'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { SectionHeading } from '@/components/ui/section-heading'
import { cn } from '@/lib/utils'
import { recentlyWorn } from '@/lib/wardrobe-data'

function formatWornDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function RecentlyWorn() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = recentlyWorn.find((item) => item.id === selectedId)

  return (
    <section aria-labelledby="recently-worn-heading" className="flex flex-col gap-4">
      <SectionHeading
        id="recently-worn-heading"
        title="Recently Worn"
        action={
          <Link
            href="/calendar"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See all
          </Link>
        }
      />

      <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {recentlyWorn.map((item) => {
          const isSelected = item.id === selectedId
          return (
            <li key={item.id} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto">
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                className="group flex w-full flex-col gap-2.5 text-left focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-2xl bg-secondary ring-offset-2 ring-offset-background transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ring',
                    isSelected && 'ring-2 ring-foreground',
                  )}
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(min-width: 768px) 220px, 42vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="px-0.5">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatWornDate(item.wornOn)} · {item.occasion}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="selected-outfit"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              aria-live="polite"
              className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3"
            >
              <p className="min-w-0 text-sm text-foreground">
                <span className="font-semibold">{selected.name}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · worn {formatWornDate(selected.wornOn)}
                </span>
              </p>
              <Link
                href="/calendar"
                className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
              >
                Wear again
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
