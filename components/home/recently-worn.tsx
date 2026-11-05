'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, Shirt } from 'lucide-react'
import { useWearLogs } from '@/components/providers/wear-log-provider'
import { SectionHeading } from '@/components/ui/section-heading'
import { cn } from '@/lib/utils'

function formatWornDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RecentlyWorn() {
  const { logs } = useWearLogs()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const recentlyWorn = [...logs]
    .sort((a, b) => b.wornOn.localeCompare(a.wornOn) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const selected = recentlyWorn.find((item) => item.id === selectedId)

  return (
    <section aria-labelledby="recently-worn-heading" className="flex flex-col gap-4">
      <SectionHeading
        id="recently-worn-heading"
        title="Recently Worn"
        action={
          <Link
            href="/profile"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See history
          </Link>
        }
      />

      {recentlyWorn.length > 0 ? (
        <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {recentlyWorn.map((log) => {
          const isSelected = log.id === selectedId
          return (
            <li key={log.id} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto">
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : log.id)}
                className="group flex w-full flex-col gap-2.5 text-left focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-2xl bg-secondary ring-offset-2 ring-offset-background transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ring',
                    isSelected && 'ring-2 ring-foreground',
                  )}
                >
                  <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-olive-soft via-secondary to-[#f7f4ed]" />
                  <span className="absolute inset-0 flex flex-col justify-between p-3.5 sm:p-4">
                    <span className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.16em] text-olive-deep">
                      <span className="inline-flex items-center gap-1">
                        <Shirt className="size-3.5" aria-hidden="true" />
                        Worn look
                      </span>
                      <span>{log.items.length} pcs</span>
                    </span>
                    <span className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
                      {log.outfitName}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {log.items.slice(0, 3).map((item, index) => (
                        <span
                          key={`${item.clothingItemId}-${index}`}
                          className="max-w-full truncate rounded-full border border-white/70 bg-white/65 px-2 py-1 text-[9px] font-medium text-foreground/80 backdrop-blur-sm"
                        >
                          {item.name}
                        </span>
                      ))}
                    </span>
                  </span>
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="px-0.5">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {log.outfitName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatWornDate(log.wornOn)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
        </ul>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-olive/30 bg-secondary/40 px-5 text-center">
          <CalendarDays className="size-5 text-olive-deep" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">No confirmed wears yet</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            Mark a scheduled outfit as worn in Calendar to start your real wear history.
          </p>
        </div>
      )}

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
                <span className="font-semibold">{selected.outfitName}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · worn {formatWornDate(selected.wornOn)}
                  {selected.note ? ` · ${selected.note}` : ''}
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
