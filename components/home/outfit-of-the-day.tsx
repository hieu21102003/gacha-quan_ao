'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, RefreshCw, Shirt } from 'lucide-react'
import { OutfitClothingPhoto } from '@/components/outfits/outfit-clothing-photo'
import { useOutfits } from '@/components/providers/outfit-provider'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/section-heading'
import { resolveOutfitItems } from '@/lib/wardrobe-data'
import { OutfitDetailsDialog } from './outfit-details-dialog'

export function OutfitOfTheDay() {
  const { outfits } = useOutfits()
  const { items } = useWardrobe()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const outfit = outfits.length > 0 ? outfits[selectedIndex % outfits.length] : null
  const resolved = outfit ? resolveOutfitItems(outfit, items) : null

  const changeOutfit = () => {
    if (outfits.length > 1) {
      setSelectedIndex((current) => (current + 1) % outfits.length)
    }
  }

  return (
    <section aria-labelledby="todays-outfit-heading" className="flex flex-col gap-5">
      <SectionHeading
        id="todays-outfit-heading"
        eyebrow="Your personal collection"
        title="Saved Outfits"
        action={
          outfit ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {(selectedIndex % outfits.length) + 1} / {outfits.length}
            </span>
          ) : null
        }
      />

      {outfit && resolved ? (
        <>
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
                {resolved.items.length > 0 ? (
                  <div
                    className={`grid h-full gap-1 bg-background ${
                      resolved.items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    } ${resolved.items.length > 2 ? 'grid-rows-2' : 'grid-rows-1'}`}
                  >
                    {resolved.items.slice(0, 4).map((item, index) => (
                      <div key={item.id} className="relative min-h-0 overflow-hidden bg-[#f7f6f2]">
                        <OutfitClothingPhoto item={item} />
                        {index === 3 && resolved.items.length > 4 && (
                          <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-sm font-semibold text-background backdrop-blur-[1px]">
                            +{resolved.items.length - 4}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <Shirt className="size-8 text-olive" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      {resolved.missingItemIds.length > 0
                        ? 'The clothing in this outfit is no longer available.'
                        : 'This outfit has no clothing items yet.'}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            {resolved.missingItemIds.length > 0 && resolved.items.length > 0 && (
              <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-amber-900 backdrop-blur">
                {resolved.missingItemIds.length} unavailable reference
                {resolved.missingItemIds.length === 1 ? '' : 's'}
              </span>
            )}
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
              <p className="mt-2 text-sm text-muted-foreground">
                {resolved.items.length} available{' '}
                {resolved.items.length === 1 ? 'piece' : 'pieces'}
                {resolved.missingItemIds.length > 0
                  ? ` · ${resolved.missingItemIds.length} unavailable`
                  : ''}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {outfits.length > 1 && (
              <Button
                onClick={changeOutfit}
                className="h-12 flex-1 rounded-full text-sm font-semibold sm:flex-none sm:px-6"
              >
                <RefreshCw aria-hidden="true" />
                Change Outfit
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(true)}
              className={`h-12 flex-1 rounded-full border-border text-sm font-semibold sm:flex-none sm:px-6 ${
                outfits.length < 2 ? 'sm:w-full' : ''
              }`}
            >
              View Details
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>

          <OutfitDetailsDialog
            outfit={outfit}
            items={items}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
          />
        </>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-olive/30 bg-secondary/40 px-6 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-background text-olive-deep">
            <Shirt className="size-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-semibold tracking-tight">
            Your outfits will appear here
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Start with your wardrobe pieces, then save an outfit to see its real clothing photos here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/create"
              className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Create an outfit
            </Link>
            <Link
              href="/closet"
              className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-background"
            >
              Explore closet
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
