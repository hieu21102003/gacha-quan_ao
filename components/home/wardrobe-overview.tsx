'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useOutfits } from '@/components/providers/outfit-provider'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { useWearLogs } from '@/components/providers/wear-log-provider'

export function WardrobeOverview() {
  const { items } = useWardrobe()
  const { outfits } = useOutfits()
  const { logs } = useWearLogs()
  const stats = [
    { label: 'Items', value: items.length.toString() },
    { label: 'Outfits', value: outfits.length.toString() },
    { label: 'Confirmed wears', value: logs.length.toString() },
  ]

  return (
    <section aria-labelledby="wardrobe-overview-heading" className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between">
        <h2
          id="wardrobe-overview-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Your Wardrobe
        </h2>
        <Link
          href="/closet"
          aria-label="Open closet"
          className="-mr-1 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0">
            <dt className="order-2 text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="order-1 truncate text-xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
