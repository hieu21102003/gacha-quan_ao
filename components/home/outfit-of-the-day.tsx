'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/section-heading'
import { suggestedOutfits } from '@/lib/wardrobe-data'
import { OutfitDetailsDialog } from './outfit-details-dialog'

export function OutfitOfTheDay() {
  const [index, setIndex] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const outfit = suggestedOutfits[index]

  const changeOutfit = () => setIndex((current) => (current + 1) % suggestedOutfits.length)

  return (
    <section aria-labelledby="todays-outfit-heading" className="flex flex-col gap-5">
      <SectionHeading
        id="todays-outfit-heading"
        eyebrow="Your daily inspiration"
        title="Today's Outfit"
        action={
          <span className="text-xs tabular-nums text-muted-foreground">
            {index + 1} / {suggestedOutfits.length}
          </span>
        }
      />

      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-secondary">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={outfit.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={outfit.image}
              alt={outfit.imageAlt}
              fill
              priority={index === 0}
              sizes="(min-width: 1024px) 560px, (min-width: 768px) 70vw, 100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={outfit.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          <h3 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {outfit.name}
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Outfit tags">
            {outfit.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        <Button
          onClick={changeOutfit}
          className="h-12 flex-1 rounded-full text-sm font-semibold sm:flex-none sm:px-6"
        >
          <RefreshCw aria-hidden="true" />
          Change Outfit
        </Button>
        <Button
          variant="outline"
          onClick={() => setDetailsOpen(true)}
          className="h-12 flex-1 rounded-full border-border text-sm font-semibold sm:flex-none sm:px-6"
        >
          View Details
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </div>

      <OutfitDetailsDialog outfit={outfit} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </section>
  )
}
