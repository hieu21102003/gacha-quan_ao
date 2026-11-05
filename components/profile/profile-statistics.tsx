'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Shirt,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import { useCalendar } from '@/components/providers/calendar-provider'
import { useOutfits } from '@/components/providers/outfit-provider'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { useWearLogs } from '@/components/providers/wear-log-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  calculateItemCostPerWear,
  calculateOutfitCostPerWear,
  countWearsByClothingItem,
  countWearsByOutfit,
  type WearLog,
  type WearLogItemSnapshot,
} from '@/lib/wear-log-data'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

function formatWearDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function latestItemSnapshots(logs: readonly WearLog[]) {
  const snapshots = new Map<string, WearLogItemSnapshot>()
  for (const log of logs) {
    for (const item of log.items) {
      if (!snapshots.has(item.clothingItemId)) snapshots.set(item.clothingItemId, item)
    }
  }
  return snapshots
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-olive-deep">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function ProfileStatistics() {
  const { items } = useWardrobe()
  const { outfits } = useOutfits()
  const { entries } = useCalendar()
  const { logs } = useWearLogs()

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => b.wornOn.localeCompare(a.wornOn) || b.createdAt.localeCompare(a.createdAt),
      ),
    [logs],
  )
  const itemWearCounts = useMemo(() => countWearsByClothingItem(logs), [logs])
  const outfitWearCounts = useMemo(() => countWearsByOutfit(logs), [logs])
  const itemSnapshots = useMemo(() => latestItemSnapshots(sortedLogs), [sortedLogs])

  const itemCostRows = useMemo(() => {
    const itemIds = new Set([...items.map((item) => item.id), ...itemWearCounts.keys()])
    const currentItems = new Map(items.map((item) => [item.id, item]))

    return [...itemIds]
      .map((id) => {
        const snapshot = itemSnapshots.get(id)
        const current = currentItems.get(id)
        return {
          id,
          name: snapshot?.name ?? current?.name ?? 'Unknown clothing item',
          category: snapshot?.category ?? current?.category ?? 'Historical item',
          isDeleted: !current,
          hasKnownCurrentPrice:
            current !== undefined && Number.isFinite(current.price) && current.price > 0,
          result: calculateItemCostPerWear(id, logs),
        }
      })
      .sort(
        (a, b) =>
          b.result.wearCount - a.result.wearCount || a.name.localeCompare(b.name),
      )
  }, [items, itemSnapshots, itemWearCounts, logs])

  const outfitCostRows = useMemo(() => {
    const outfitIds = new Set([...outfits.map((outfit) => outfit.id), ...outfitWearCounts.keys()])
    const currentOutfits = new Map(outfits.map((outfit) => [outfit.id, outfit]))
    const latestNames = new Map<string, string>()
    for (const log of sortedLogs) {
      if (!latestNames.has(log.outfitId)) latestNames.set(log.outfitId, log.outfitName)
    }

    return [...outfitIds]
      .map((id) => ({
        id,
        name: currentOutfits.get(id)?.name ?? latestNames.get(id) ?? 'Deleted outfit',
        isDeleted: !currentOutfits.has(id),
        result: calculateOutfitCostPerWear(id, logs),
      }))
      .sort(
        (a, b) =>
          b.result.wearCount - a.result.wearCount || a.name.localeCompare(b.name),
      )
  }, [logs, outfitWearCounts, outfits, sortedLogs])

  const mostWornItems = itemCostRows.filter((item) => item.result.wearCount > 0).slice(0, 5)

  const stats = [
    { label: 'Clothing items', value: items.length, icon: Shirt, tone: 'olive' },
    { label: 'Saved outfits', value: outfits.length, icon: Sparkles, tone: 'sand' },
    { label: 'Favorite clothing', value: items.filter((item) => item.favorite).length, icon: Heart, tone: 'rose' },
    { label: 'Favorite outfits', value: outfits.filter((outfit) => outfit.favorite).length, icon: Heart, tone: 'rose' },
    { label: 'Scheduled looks', value: entries.length, icon: CalendarDays, tone: 'sand' },
    { label: 'Confirmed wears', value: logs.length, icon: Check, tone: 'olive' },
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 sm:px-5 md:gap-12 md:px-10 md:pt-12 lg:px-14">
      <header className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-20 border border-border sm:size-24">
            <AvatarFallback className="bg-olive-soft text-xl font-semibold text-olive-deep">
              <Shirt className="size-8" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-olive-deep">
              Your style space
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Your profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Your wardrobe, saved locally</p>
          </div>
          <Link
            href="/closet"
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full border border-border px-4 text-xs font-semibold transition-colors hover:bg-secondary sm:self-center"
          >
            <Shirt className="size-4" aria-hidden="true" />
            Open closet
          </Link>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
          A local overview of your wardrobe, saved looks, and confirmed wear history.
        </p>
      </header>

      <Section eyebrow="Collection overview" title="Your wardrobe at a glance">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-4">
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full',
                    stat.tone === 'olive' && 'bg-olive-soft text-olive-deep',
                    stat.tone === 'sand' && 'bg-secondary text-foreground',
                    stat.tone === 'rose' && 'bg-rose-50 text-rose-800',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <dt className="mt-4 text-xs leading-5 text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {stat.value}
                </dd>
              </div>
            )
          })}
        </dl>
      </Section>

      <div className="grid gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-8">
        <Section eyebrow="Confirmed wear" title="Wear history">
          {sortedLogs.length > 0 ? (
            <ol className="space-y-3">
              {sortedLogs.map((log) => (
                <li key={log.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{log.outfitName}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        Worn {formatWearDate(log.wornOn)}
                      </p>
                    </div>
                    <span className="rounded-full bg-olive-soft px-3 py-1 text-xs font-semibold text-olive-deep">
                      {log.outfitValue !== null
                        ? `Historical value · ${formatPrice(log.outfitValue)}`
                        : 'Historical value incomplete'}
                    </span>
                  </div>
                  <ul className="mt-4 divide-y divide-border border-y border-border">
                    {log.items.map((item, index) => (
                      <li
                        key={`${item.clothingItemId}-${index}`}
                        className="flex min-w-0 items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.category} · {item.brand || 'Brand not recorded'}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.price !== null && item.price > 0
                            ? formatPrice(item.price)
                            : 'Price unknown'}
                        </span>
                      </li>
                    ))}
                    {log.items.length === 0 && (
                      <li className="py-3 text-xs text-muted-foreground">
                        No clothing snapshots were recorded for this wear.
                      </li>
                    )}
                  </ul>
                  {log.note && (
                    <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      {log.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-olive/30 bg-secondary/40 px-5 text-center">
              <Clock3 className="size-6 text-olive-deep" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">No confirmed wears yet</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Scheduled outfits appear here only after you confirm Mark as Worn in Calendar.
              </p>
              <Link href="/calendar" className="mt-3 text-xs font-semibold text-olive-deep hover:underline">
                Open calendar
              </Link>
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-9">
          <Section eyebrow="From your history" title="Most worn items">
            {mostWornItems.length > 0 ? (
              <ol className="space-y-2">
                {mostWornItems.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-olive-soft text-xs font-semibold text-olive-deep">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category}
                        {item.isDeleted ? ' · removed from closet' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {item.result.wearCount}{' '}
                      {item.result.wearCount === 1 ? 'wear' : 'wears'}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center">
                <p className="text-sm font-semibold">Your most-worn pieces will show here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirm an outfit wear to start building your history.
                </p>
              </div>
            )}
          </Section>

          <Section eyebrow="Value over time" title="Item cost per wear">
            {itemCostRows.length > 0 ? (
              <ul className="space-y-2">
                {itemCostRows.map((item) => (
                  <li
                    key={item.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.category}{item.isDeleted ? ' · historical item' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs font-semibold">
                      {item.result.wearCount === 0
                        ? !item.hasKnownCurrentPrice
                          ? 'Not worn yet · price unknown'
                          : 'Not worn yet'
                        : item.result.costPerWear !== null
                          ? `${formatPrice(item.result.costPerWear)} / wear`
                          : item.result.hasInconsistentPrice
                            ? 'Price changed · incomplete'
                            : 'Price unknown · incomplete'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center text-xs text-muted-foreground">
                Add clothing to your closet to see cost-per-wear estimates.
              </p>
            )}
          </Section>

          <Section eyebrow="Saved looks" title="Outfit cost per wear">
            {outfitCostRows.length > 0 ? (
              <ul className="space-y-2">
                {outfitCostRows.map((outfit) => (
                  <li
                    key={outfit.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{outfit.name}</p>
                      {outfit.isDeleted && (
                        <p className="text-xs text-muted-foreground">Historical outfit</p>
                      )}
                    </div>
                    <span className="shrink-0 text-right text-xs font-semibold">
                      {outfit.result.wearCount === 0
                        ? 'Not worn yet'
                        : outfit.result.costPerWear !== null
                          ? `${formatPrice(outfit.result.costPerWear)} / wear`
                          : outfit.result.hasInconsistentPrice
                            ? 'Value changed · incomplete'
                            : 'Value unknown · incomplete'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center text-xs text-muted-foreground">
                Save an outfit to see its cost per confirmed wear.
              </p>
            )}
            <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
              <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-olive-deep" aria-hidden="true" />
              Estimates use confirmed WearLog snapshots only. Missing, zero, or changing prices are not treated as free.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
