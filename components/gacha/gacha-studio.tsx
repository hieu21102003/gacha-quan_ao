'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CloudOff,
  Footprints,
  ImageOff,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { OutfitClothingPhoto } from '@/components/outfits/outfit-clothing-photo'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { Button } from '@/components/ui/button'
import {
  generateGachaOutfit,
  gachaOccasions,
  type GachaGenerationResult,
  type GachaOccasion,
  type GachaOutfitCandidate,
} from '@/lib/gacha/gacha-engine'
import type { ClothingCategory, ClothingItem } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

type GachaViewState =
  | { status: 'idle' }
  | { status: 'generating' }
  | {
      status: 'revealing'
      candidate: GachaOutfitCandidate
      sequence: ClothingItem[]
      revealedCount: number
      spinId: number
    }
  | {
      status: 'result'
      candidate: GachaOutfitCandidate
      sequence: ClothingItem[]
      accepted: boolean
      spinId: number
    }
  | { status: 'error'; message: string; diagnostics?: string[] }

const revealOrder: Record<GachaOutfitCandidate['baseComposition'], ClothingCategory[]> = {
  dress: ['Dresses', 'Shoes', 'Outerwear', 'Accessories', 'Bags'],
  'top-bottom': ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories', 'Bags'],
}

const occasionDescriptions: Record<GachaOccasion, string> = {
  Work: 'A look for the workday',
  Casual: 'Easy pieces for everyday',
  Date: 'Something for a special plan',
  Home: 'Comfort for staying in',
  Sport: 'Ready for movement',
  'Special event': 'A look for the occasion',
}

function sequenceFor(candidate: GachaOutfitCandidate) {
  return revealOrder[candidate.baseComposition].flatMap((category) =>
    candidate.items.filter((item) => item.category === category),
  )
}

function messageForFailure(result: Extract<GachaGenerationResult, { success: false }>) {
  if (result.reason === 'empty-wardrobe') {
    return 'Your wardrobe is empty. Add a few pieces to build your first outfit.'
  }
  if (result.reason === 'no-eligible-items') {
    return 'There are no eligible pieces right now. Items in laundry are set aside until they are available.'
  }
  if (result.diagnostics.missingBaseCategories.length > 0) {
    return `A complete base needs either one dress or one top and one bottom. Currently unavailable: ${result.diagnostics.missingBaseCategories.join(', ')}.`
  }
  return 'We could not find a valid outfit combination in your current wardrobe. Please review your clothing and try again.'
}

function SlotCard({
  item,
  isNew,
  reducedMotion,
}: {
  item: ClothingItem
  isNew: boolean
  reducedMotion: boolean
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
      className="overflow-hidden rounded-3xl border border-border bg-background"
    >
      <div className="relative aspect-[4/3] bg-[#f7f6f2] sm:aspect-[4/5]">
        {item.image ? (
          <OutfitClothingPhoto item={item} />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <ImageOff className="size-5 text-olive" aria-hidden="true" />
            Image unavailable
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-olive-deep backdrop-blur">
          {item.category}
        </span>
        {isNew && (
          <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-olive-deep text-white">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="truncate text-sm font-semibold tracking-tight sm:text-base">{item.name}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {[item.brand, item.color].filter(Boolean).join(' · ')}
        </p>
      </div>
    </motion.article>
  )
}

export function GachaStudio() {
  const { items } = useWardrobe()
  const shouldReduceMotion = useReducedMotion()
  const [occasion, setOccasion] = useState<GachaOccasion>('Casual')
  const [viewState, setViewState] = useState<GachaViewState>({ status: 'idle' })
  const spinLock = useRef(false)
  const activeSpinId = useRef(0)
  const previousComposition = useRef<string[] | undefined>(undefined)
  const priorItems = useRef(items)
  const reducedMotion = shouldReduceMotion ?? false

  const eligibleItems = useMemo(
    () => items.filter((item) => item.status !== 'In laundry'),
    [items],
  )
  const laundryCount = items.length - eligibleItems.length
  const eligibleCounts = useMemo(
    () =>
      eligibleItems.reduce<Record<ClothingCategory, number>>(
        (counts, item) => {
          counts[item.category] += 1
          return counts
        },
        {
          Tops: 0,
          Bottoms: 0,
          Dresses: 0,
          Outerwear: 0,
          Shoes: 0,
          Bags: 0,
          Accessories: 0,
        },
      ),
    [eligibleItems],
  )

  useEffect(() => {
    if (priorItems.current === items) return
    priorItems.current = items

    setViewState((current) => {
      if (current.status !== 'revealing' && current.status !== 'result') return current
      const currentItems = new Map(items.map((item) => [item.id, item]))
      const unavailable = current.candidate.items.find((selected) => {
        const latest = currentItems.get(selected.id)
        return !latest || latest.status === 'In laundry' || latest.category !== selected.category
      })
      if (!unavailable) return current

      spinLock.current = false
      activeSpinId.current += 1
      return {
        status: 'error',
        message: `${unavailable.name} is no longer available for this result. Spin again to use your current wardrobe.`,
      }
    })
  }, [items])

  useEffect(() => {
    if (viewState.status !== 'revealing') return
    const { spinId, sequence, revealedCount, candidate } = viewState
    const timer = window.setTimeout(
      () => {
        if (activeSpinId.current !== spinId) return
        if (revealedCount >= sequence.length) {
          spinLock.current = false
          setViewState({
            status: 'result',
            candidate,
            sequence,
            accepted: false,
            spinId,
          })
          return
        }
        setViewState((current) => {
          if (current.status !== 'revealing' || current.spinId !== spinId) return current
          return { ...current, revealedCount: current.revealedCount + 1 }
        })
      },
      reducedMotion ? 0 : 560,
    )
    return () => window.clearTimeout(timer)
  }, [reducedMotion, viewState])

  const spin = () => {
    if (spinLock.current) return
    spinLock.current = true
    const spinId = activeSpinId.current + 1
    activeSpinId.current = spinId
    setViewState({ status: 'generating' })

    try {
      const previousCompositionItemIds =
        viewState.status === 'revealing' || viewState.status === 'result'
          ? viewState.candidate.itemIds
          : previousComposition.current
      const result = generateGachaOutfit({
        items,
        occasion,
        weather: { availability: 'not-checked' },
        previousCompositionItemIds,
        random: Math.random,
      })

      if (!result.success) {
        spinLock.current = false
        setViewState({
          status: 'error',
          message: messageForFailure(result),
          diagnostics:
            result.diagnostics.missingBaseCategories.length > 0
              ? result.diagnostics.missingBaseCategories
              : result.warnings.map(({ code }) => code),
        })
        return
      }

      const sequence = sequenceFor(result.candidate)
      if (sequence.length === 0) {
        spinLock.current = false
        setViewState({
          status: 'error',
          message: 'The generated outfit did not contain any displayable pieces. Please try again.',
        })
        return
      }
      previousComposition.current = [...result.candidate.itemIds]
      setViewState({
        status: 'revealing',
        candidate: result.candidate,
        sequence,
        revealedCount: 0,
        spinId,
      })
    } catch (error) {
      spinLock.current = false
      setViewState({
        status: 'error',
        message:
          error instanceof Error
            ? `We could not generate an outfit: ${error.message}`
            : 'We could not generate an outfit. Please try again.',
      })
    }
  }

  const isBusy = viewState.status === 'generating' || viewState.status === 'revealing'
  const visibleCandidate =
    viewState.status === 'revealing' || viewState.status === 'result'
      ? viewState.candidate
      : null
  const visibleItems =
    viewState.status === 'revealing'
      ? viewState.sequence.slice(0, viewState.revealedCount)
      : viewState.status === 'result'
        ? viewState.sequence
        : []
  const activeReveal =
    viewState.status === 'revealing' && viewState.revealedCount > 0
      ? viewState.sequence[viewState.revealedCount - 1]
      : null

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 md:gap-10 md:px-10 md:pt-12 lg:px-14">
      <header className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-olive-deep">
          <Sparkles className="size-4" aria-hidden="true" />
          Your wardrobe, reimagined
        </div>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Let’s find your look</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            A fresh outfit, put together from pieces you already own.
          </p>
        </div>
      </header>

      <section
        aria-label="Wardrobe readiness"
        className="flex flex-col gap-3 rounded-2xl bg-secondary/70 px-4 py-3 text-xs sm:text-sm"
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-semibold">{eligibleItems.length} available pieces</span>
          {laundryCount > 0 && (
            <span className="text-muted-foreground">
              {laundryCount} in laundry, set aside
            </span>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CloudOff className="size-3.5" aria-hidden="true" />
            Weather not checked
          </span>
        </div>
        <ul aria-label="Eligible pieces by category" className="flex flex-wrap gap-2">
          {(Object.keys(eligibleCounts) as ClothingCategory[]).map((category) => (
            <li
              key={category}
              className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {category} <span className="font-semibold text-foreground">{eligibleCounts[category]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="occasion-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="occasion-heading" className="text-sm font-semibold">
            What’s the occasion?
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Just for context — outfits are chosen from your wardrobe without occasion or weather matching.
          </p>
        </div>
        <div role="group" aria-labelledby="occasion-heading" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gachaOccasions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={occasion === option}
              disabled={isBusy}
              onClick={() => setOccasion(option)}
              className={cn(
                'min-h-12 rounded-2xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                occasion === option
                  ? 'border-olive bg-olive-soft text-olive-deep'
                  : 'border-border bg-background text-foreground hover:bg-secondary',
              )}
            >
              <span className="block text-sm font-semibold">{option}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {occasionDescriptions[option]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={spin}
          disabled={isBusy}
          className="h-14 w-full rounded-full bg-olive-deep text-base font-semibold text-white hover:bg-olive-deep/90 sm:w-auto sm:min-w-56"
        >
          {isBusy ? (
            <>
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {viewState.status === 'generating' ? 'Putting it together…' : 'Revealing your look…'}
            </>
          ) : (
            <>
              {visibleCandidate ? (
                <RefreshCw className="size-5" aria-hidden="true" />
              ) : (
                <Sparkles className="size-5" aria-hidden="true" />
              )}
              {visibleCandidate ? 'SPIN AGAIN' : 'SPIN'}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {visibleCandidate
            ? 'A new spin uses your latest wardrobe.'
            : 'Your outfit is generated before the reveal begins.'}
        </p>
      </div>

      {viewState.status === 'error' && (
        <section
          role="alert"
          className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-800" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-amber-950">No outfit yet</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">{viewState.message}</p>
              {viewState.diagnostics && (
                <p className="mt-2 text-xs text-amber-900">
                  Needed categories: {viewState.diagnostics.join(', ')}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/closet"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Manage wardrobe
          </Link>
        </section>
      )}

      {(viewState.status === 'revealing' || viewState.status === 'result') && visibleCandidate && (
        <section aria-labelledby="result-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive-deep">
                {viewState.status === 'revealing' ? 'Your look is coming together' : 'Your outfit'}
              </p>
              <h2 id="result-heading" className="mt-1 text-2xl font-semibold tracking-tight">
                {viewState.status === 'revealing'
                  ? occasionDescriptions[visibleCandidate.occasion]
                  : `${visibleCandidate.occasion} look`}
              </h2>
            </div>
            {viewState.status === 'revealing' && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {viewState.revealedCount} of {viewState.sequence.length} revealed
              </span>
            )}
          </div>

          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            role="status"
          >
            {activeReveal
              ? `Revealed ${activeReveal.category}: ${activeReveal.name}.`
              : viewState.status === 'result'
                ? `Your ${visibleCandidate.occasion} outfit is ready.`
                : ''}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {visibleItems.map((item, index) => (
              <SlotCard
                key={`${viewState.status === 'revealing' || viewState.status === 'result' ? viewState.spinId : 'none'}-${item.id}`}
                item={item}
                isNew={viewState.status === 'revealing' && index === visibleItems.length - 1}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          {viewState.status === 'result' && (
            <div className="flex flex-col gap-4 rounded-3xl bg-secondary/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">
                  {visibleCandidate.occasion} · Weather not checked
                </p>
                {visibleCandidate.shoeReadiness === 'missing-shoes' ? (
                  <p className="flex items-center gap-2 text-sm text-amber-900">
                    <Footprints className="size-4 shrink-0" aria-hidden="true" />
                    No eligible shoes in this outfit — shoes were not available to select.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Footprints className="size-4 shrink-0" aria-hidden="true" />
                    Shoes included
                  </p>
                )}
                {visibleCandidate.antiRepeat.constraintsRelaxed && (
                  <p className="text-xs text-muted-foreground">
                    Limited alternatives meant some recent pieces or the previous combination may repeat.
                  </p>
                )}
                {visibleCandidate.warnings.some(({ code }) => code === 'duplicate-wardrobe-ids') && (
                  <p className="text-xs text-amber-900">
                    Duplicate wardrobe records were ignored while building this outfit.
                  </p>
                )}
                {visibleCandidate.warnings.some(({ code }) => code === 'malformed-wardrobe-items') && (
                  <p className="text-xs text-amber-900">
                    Some invalid wardrobe records were ignored.
                  </p>
                )}
                {visibleCandidate.warnings.some(({ code }) => code === 'invalid-random-source') && (
                  <p className="text-xs text-amber-900">
                    A fallback choice was used because the random source was unavailable.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:min-w-44">
                <Button
                  type="button"
                  onClick={() =>
                    setViewState((current) =>
                      current.status === 'result' ? { ...current, accepted: true } : current,
                    )
                  }
                  disabled={viewState.accepted}
                  className="h-12 rounded-full bg-olive-deep text-white hover:bg-olive-deep/90"
                >
                  {viewState.accepted ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Accepted for now
                    </>
                  ) : (
                    'ACCEPT THIS LOOK'
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Acceptance is kept only for this session.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {viewState.status === 'idle' && (
        <section className="rounded-3xl border border-dashed border-border px-5 py-9 text-center sm:px-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-olive-soft text-olive-deep">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">A little inspiration, from your own closet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            We’ll combine your available pieces into a complete base outfit. Shoes are included when
            available; optional layers and accessories may appear too.
          </p>
          {eligibleCounts.Tops === 0 &&
            eligibleCounts.Bottoms === 0 &&
            eligibleCounts.Dresses === 0 && (
              <Link
                href="/closet"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-olive-deep underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Add a top and bottoms or a dress
              </Link>
            )}
        </section>
      )}
    </div>
  )
}
