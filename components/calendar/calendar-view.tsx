'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Plus,
  Search,
  Shirt,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { OutfitClothingPhoto } from '@/components/outfits/outfit-clothing-photo'
import { useCalendar } from '@/components/providers/calendar-provider'
import { useOutfits } from '@/components/providers/outfit-provider'
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { useWearLogs } from '@/components/providers/wear-log-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isCalendarDate, type CalendarEntry } from '@/lib/calendar-data'
import { resolveOutfitItems, type ClothingItem, type Outfit } from '@/lib/wardrobe-data'
import { cn } from '@/lib/utils'

type CalendarMode = 'month' | 'week'
type DialogMode = 'add' | 'edit'

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function shiftDate(date: Date, amount: number) {
  const shifted = new Date(date)
  shifted.setDate(shifted.getDate() + amount)
  return shifted
}

function getMonthDates(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12)
  const start = shiftDate(first, -first.getDay())
  const end = shiftDate(last, 6 - last.getDay())
  const days: Date[] = []

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor))
  }
  return days
}

function getWeekDates(date: Date) {
  const start = shiftDate(date, -date.getDay())
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index))
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function outfitsForDate(entries: CalendarEntry[], date: string) {
  return entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function OutfitMiniPreview({
  outfit,
  items,
  compact = false,
}: {
  outfit: Outfit
  items: ClothingItem[]
  compact?: boolean
}) {
  const { items: pieces, missingItemIds } = resolveOutfitItems(outfit, items)
  const visible = pieces.slice(0, compact ? 2 : 3)

  return (
    <span className="flex min-w-0 items-center gap-1">
      {visible.length ? (
        visible.map((item, index) => (
          <span
            key={`${outfit.id}-${item.id}-${index}`}
            className={cn(
              'relative block shrink-0 overflow-hidden rounded-lg bg-white',
              compact ? 'size-7' : 'size-12',
            )}
          >
            <OutfitClothingPhoto item={item} />
          </span>
        ))
      ) : (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-olive-soft text-olive-deep',
            compact ? 'size-7' : 'size-12',
          )}
        >
          <Shirt className={compact ? 'size-3.5' : 'size-5'} aria-hidden="true" />
        </span>
      )}
      {!compact && pieces.length > visible.length && (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-medium text-muted-foreground">
          +{pieces.length - visible.length}
        </span>
      )}
      {missingItemIds.length > 0 && (
        <span
          className="sr-only"
          aria-label={`${missingItemIds.length} clothing references unavailable`}
        />
      )}
    </span>
  )
}

function OutfitSearchResult({
  outfit,
  items,
  selected,
  disabled,
  onSelect,
}: {
  outfit: Outfit
  items: ClothingItem[]
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { items: pieces, missingItemIds } = resolveOutfitItems(outfit, items)

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-olive bg-olive-soft/50' : 'border-border hover:border-olive/50',
      )}
    >
      <OutfitMiniPreview outfit={outfit} items={items} compact />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{outfit.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {pieces.length} available {pieces.length === 1 ? 'piece' : 'pieces'}
          {missingItemIds.length > 0 ? ` · ${missingItemIds.length} unavailable` : ''}
        </span>
      </span>
      {selected && <Check className="size-4 shrink-0 text-olive-deep" aria-hidden="true" />}
      {disabled && !selected && (
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">Scheduled</span>
      )}
    </button>
  )
}

function WearConfirmationDialog({
  open,
  entry,
  outfit,
  items,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  entry: CalendarEntry
  outfit: Outfit
  items: ClothingItem[]
  onOpenChange: (open: boolean) => void
  onConfirm: (note: string) => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const confirmationDate = formatFullDate(new Date())

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSaving) {
      setNote('')
      setError(null)
      onOpenChange(false)
    }
  }

  const handleConfirm = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onConfirm(note.trim())
      setNote('')
      onOpenChange(false)
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Unable to record this wear. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,44rem)] gap-5 overflow-y-auto rounded-3xl p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="gap-1.5 pr-8 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-olive-deep">
            Confirm actual wear
          </p>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Mark as worn?
          </DialogTitle>
          <DialogDescription>
            This will add a confirmed wear to your history. Your calendar plan will remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-secondary/40 p-3.5">
          <div className="flex items-center gap-3">
            <OutfitMiniPreview outfit={outfit} items={items} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{outfit.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scheduled {formatFullDate(fromDateKey(entry.date))}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Confirmation date
            </p>
            <p className="mt-1 text-sm font-medium">{confirmationDate}</p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Note <span className="font-normal text-muted-foreground">· optional</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={240}
            rows={2}
            placeholder="Add a note about this wear"
            className="resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => handleOpenChange(false)}
            className="h-10 rounded-full px-5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void handleConfirm()}
            className="h-10 rounded-full bg-olive px-5 text-olive-foreground hover:bg-olive-deep"
          >
            {isSaving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {isSaving ? 'Saving…' : 'Confirm wear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleDialog({
  open,
  mode,
  entry,
  outfits,
  entries,
  items,
  initialDate,
  onOpenChange,
  onAdd,
  onUpdate,
}: {
  open: boolean
  mode: DialogMode
  entry: CalendarEntry | null
  outfits: Outfit[]
  entries: CalendarEntry[]
  items: ClothingItem[]
  initialDate: string
  onOpenChange: (open: boolean) => void
  onAdd: (value: { outfitId: string; date: string; note: string }) => void
  onUpdate: (entryId: string, value: { outfitId: string; date: string; note: string }) => void
}) {
  const [query, setQuery] = useState('')
  const [outfitId, setOutfitId] = useState('')
  const [date, setDate] = useState(initialDate)
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const currentOutfitId = entry && outfits.some((outfit) => outfit.id === entry.outfitId)
    ? entry.outfitId
    : ''
  const effectiveOutfitId = outfitId || (mode === 'edit' ? currentOutfitId : '')
  const filteredOutfits = outfits.filter((outfit) =>
    outfit.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const duplicate = entries.some(
    (candidate) =>
      candidate.id !== entry?.id &&
      candidate.date === date &&
      candidate.outfitId === effectiveOutfitId,
  )
  const canSubmit = Boolean(effectiveOutfitId && isCalendarDate(date) && !duplicate)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('')
      setOutfitId('')
      setDate(initialDate)
      setNote('')
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    if (!isCalendarDate(date)) {
      setError('Choose a valid date.')
      return
    }
    if (!effectiveOutfitId) {
      setError('Choose a saved outfit to schedule.')
      return
    }
    if (duplicate) {
      setError('This outfit is already scheduled for that date.')
      return
    }

    try {
      if (mode === 'edit' && entry) {
        onUpdate(entry.id, { outfitId: effectiveOutfitId, date, note: note.trim() })
      } else {
        onAdd({ outfitId: effectiveOutfitId, date, note: note.trim() })
      }
      handleOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to save this schedule entry.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid max-h-[min(90dvh,52rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-3xl p-4 sm:max-w-xl sm:p-6">
        <DialogHeader className="gap-1.5 pr-8 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-olive-deep">
            {mode === 'edit' ? 'Update your plan' : 'Plan a look'}
          </p>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {mode === 'edit' ? 'Edit scheduled outfit' : 'Add an outfit'}
          </DialogTitle>
          <DialogDescription>
            Choose a saved look and the day you’d like to wear it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Scheduled date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setError(null)
              }}
              className="h-10 min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Note <span className="font-normal text-muted-foreground">· optional</span>
            <input
              type="text"
              maxLength={240}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError(null)
              }}
              placeholder="Add a note for the day"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <label className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-input px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search saved outfits"
              aria-label="Search saved outfits"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          {mode === 'edit' && entry && !currentOutfitId && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              The saved outfit <span className="font-semibold">{entry.outfitId}</span> is unavailable. Choose a replacement to recover this calendar entry.
            </p>
          )}
          {outfits.length > 0 ? (
            <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {filteredOutfits.map((outfit) => {
                const isSelected = effectiveOutfitId === outfit.id
                const alreadyScheduled = entries.some(
                  (candidate) =>
                    candidate.id !== entry?.id &&
                    candidate.date === date &&
                    candidate.outfitId === outfit.id,
                )
                return (
                  <OutfitSearchResult
                    key={outfit.id}
                    outfit={outfit}
                    items={items}
                    selected={isSelected}
                    disabled={alreadyScheduled}
                    onSelect={() => {
                      setOutfitId(outfit.id)
                      setError(null)
                    }}
                  />
                )
              })}
              {filteredOutfits.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No saved outfits match “{query}”.
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl bg-secondary px-5 text-center">
              <Sparkles className="size-5 text-olive" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">No saved outfits yet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Create a look first, then come back to plan when to wear it.
              </p>
              <div className="mt-3 flex gap-4 text-xs font-semibold text-olive-deep">
                <Link href="/outfits" onClick={() => handleOpenChange(false)} className="hover:underline">
                  Outfit collection
                </Link>
                <Link href="/create" onClick={() => handleOpenChange(false)} className="hover:underline">
                  Outfit Studio
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3">
          {duplicate && (
            <p className="mb-2 text-xs text-destructive" role="alert">
              This outfit is already scheduled for that date.
            </p>
          )}
          {error && !duplicate && (
            <p className="mb-2 text-xs text-destructive" role="alert">{error}</p>
          )}
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-11 w-full rounded-full bg-olive text-olive-foreground hover:bg-olive-deep"
          >
            {mode === 'edit' ? 'Save changes' : 'Add to calendar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScheduledOutfitCard({
  entry,
  outfit,
  items,
  isWorn,
  onMarkAsWorn,
  onEdit,
  onRemove,
}: {
  entry: CalendarEntry
  outfit: Outfit | undefined
  items: ClothingItem[]
  isWorn: boolean
  onMarkAsWorn: (note: string) => Promise<void>
  onEdit: () => void
  onRemove: () => void
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [wearConfirmationOpen, setWearConfirmationOpen] = useState(false)
  const resolved = outfit ? resolveOutfitItems(outfit, items) : null
  const isFutureEntry = entry.date > dateKey(new Date())

  return (
    <article className="rounded-2xl border border-border bg-card p-3.5 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        {outfit ? (
          <OutfitMiniPreview outfit={outfit} items={items} />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Shirt className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            {outfit?.name ?? 'Saved outfit unavailable'}
          </h3>
          {outfit ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {resolved?.items.length ?? 0} available{' '}
              {(resolved?.items.length ?? 0) === 1 ? 'piece' : 'pieces'}
              {resolved && resolved.missingItemIds.length > 0 &&
                ` · ${resolved.missingItemIds.length} unavailable`}
            </p>
          ) : (
            <p className="mt-1 break-all text-xs leading-5 text-amber-900">
              This calendar entry references outfit {entry.outfitId}, which is no longer available.
            </p>
          )}
        </div>
      </div>
      {entry.note && (
        <p className="mt-3 rounded-xl bg-secondary/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {entry.note}
        </p>
      )}
      {resolved && resolved.missingItemIds.length > 0 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {resolved.missingItemIds.length} clothing reference
          {resolved.missingItemIds.length === 1 ? ' is' : 's are'} unavailable. This look cannot be recorded as worn until all pieces are available.
        </p>
      )}
      {outfit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isWorn ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-olive-soft px-3 text-xs font-semibold text-olive-deep">
              <Check className="size-3.5" aria-hidden="true" />
              Worn
            </span>
          ) : isFutureEntry ? (
            <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-xs text-muted-foreground">
              Mark as worn available on the scheduled date
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWearConfirmationOpen(true)}
              className="rounded-full"
            >
              <Check aria-hidden="true" />
              Mark as Worn
            </Button>
          )}
        </div>
      )}
      {confirmingRemove ? (
        <div className="mt-3 rounded-xl bg-destructive/5 p-3">
          <p className="text-xs font-medium">Remove this scheduled entry?</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            The saved outfit itself will not be deleted.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 rounded-full"
              onClick={() => setConfirmingRemove(false)}
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9 flex-1 rounded-full"
              onClick={onRemove}
            >
              Remove entry
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="rounded-full">
            <CalendarDays aria-hidden="true" />
            Edit plan
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingRemove(true)}
            className="rounded-full text-muted-foreground"
          >
            <Trash2 aria-hidden="true" />
            Remove
          </Button>
        </div>
      )}
      {outfit && (
        <WearConfirmationDialog
          key={entry.id}
          open={wearConfirmationOpen}
          entry={entry}
          outfit={outfit}
          items={items}
          onOpenChange={setWearConfirmationOpen}
          onConfirm={onMarkAsWorn}
        />
      )}
    </article>
  )
}

export function CalendarView() {
  const {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    missingOutfitReferences,
  } = useCalendar()
  const { outfits } = useOutfits()
  const { items } = useWardrobe()
  const { logs: wearLogs, recordWearFromCalendar } = useWearLogs()
  const todayKey = dateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [visibleDate, setVisibleDate] = useState(() => fromDateKey(todayKey))
  const [mode, setMode] = useState<CalendarMode>('month')
  const [dialogMode, setDialogMode] = useState<DialogMode>('add')
  const [dialogEntry, setDialogEntry] = useState<CalendarEntry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const outfitById = useMemo(() => new Map(outfits.map((outfit) => [outfit.id, outfit])), [outfits])
  const monthDates = useMemo(() => getMonthDates(visibleDate), [visibleDate])
  const weekDates = useMemo(() => getWeekDates(visibleDate), [visibleDate])
  const selectedDateValue = fromDateKey(selectedDate)
  const selectedEntries = outfitsForDate(entries, selectedDate)
  const wornCalendarEntryIds = useMemo(
    () => new Set(wearLogs.flatMap((log) => log.calendarEntryId ? [log.calendarEntryId] : [])),
    [wearLogs],
  )
  const missingEntryIds = new Set(missingOutfitReferences.map((reference) => reference.entryId))
  const selectedHasMissingOutfit = selectedEntries.some((entry) => missingEntryIds.has(entry.id))

  const goToToday = () => {
    setSelectedDate(todayKey)
    setVisibleDate(fromDateKey(todayKey))
    setFeedback(null)
  }

  const changePeriod = (direction: -1 | 1) => {
    const step = mode === 'month' ? 1 : 7
    const next = new Date(visibleDate)
    if (mode === 'month') {
      next.setDate(1)
      next.setMonth(next.getMonth() + direction)
      const desiredDay = fromDateKey(selectedDate).getDate()
      const dayInNextMonth = Math.min(desiredDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())
      next.setDate(dayInNextMonth)
    } else {
      next.setDate(next.getDate() + direction * step)
    }
    const nextKey = dateKey(next)
    setVisibleDate(fromDateKey(nextKey))
    setSelectedDate(nextKey)
    setFeedback(null)
  }

  const chooseDate = (date: Date) => {
    const key = dateKey(date)
    setSelectedDate(key)
    setVisibleDate(fromDateKey(key))
    setFeedback(null)
  }

  const openAddDialog = () => {
    setDialogMode('add')
    setDialogEntry(null)
    setDialogOpen(true)
    setFeedback(null)
  }

  const openEditDialog = (entry: CalendarEntry) => {
    setDialogMode('edit')
    setDialogEntry(entry)
    setDialogOpen(true)
    setFeedback(null)
  }

  const handleAdd = (value: { outfitId: string; date: string; note: string }) => {
    if (
      entries.some((entry) => entry.date === value.date && entry.outfitId === value.outfitId)
    ) {
      throw new Error('This outfit is already scheduled for that date.')
    }
    addEntry(value)
    chooseDate(fromDateKey(value.date))
    setFeedback('Outfit added to your calendar.')
  }

  const handleUpdate = (
    entryId: string,
    value: { outfitId: string; date: string; note: string },
  ) => {
    if (
      entries.some(
        (entry) =>
          entry.id !== entryId &&
          entry.date === value.date &&
          entry.outfitId === value.outfitId,
      )
    ) {
      throw new Error('This outfit is already scheduled for that date.')
    }
    updateEntry(entryId, value)
    chooseDate(fromDateKey(value.date))
    setFeedback('Your calendar entry was updated.')
  }

  const handleRemove = (entry: CalendarEntry) => {
    deleteEntry(entry.id)
    setFeedback('Scheduled entry removed. The outfit is still saved.')
  }

  const handleMarkAsWorn = async (entry: CalendarEntry, note: string) => {
    await recordWearFromCalendar(entry, note)
    setFeedback('Wear recorded successfully. Your calendar entry remains scheduled.')
  }

  const dates = mode === 'month' ? monthDates : weekDates

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 sm:px-5 md:gap-8 md:px-10 md:pt-12 lg:px-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-deep">
            Plan ahead
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Outfit Calendar
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Give your favorite looks a day of their own.
          </p>
        </div>
        <Button
          type="button"
          onClick={openAddDialog}
          className="h-11 w-full rounded-full bg-olive px-5 text-sm font-semibold text-olive-foreground hover:bg-olive-deep sm:w-auto"
        >
          <Plus aria-hidden="true" />
          Add outfit
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.8fr)] lg:items-start lg:gap-7">
        <section className="min-w-0 rounded-3xl border border-border bg-card p-3.5 shadow-[0_8px_30px_rgba(23,23,23,0.03)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={mode === 'month' ? 'Previous month' : 'Previous week'}
                onClick={() => changePeriod(-1)}
                className="size-9 rounded-full"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={mode === 'month' ? 'Next month' : 'Next week'}
                onClick={() => changePeriod(1)}
                className="size-9 rounded-full"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
              <h2 className="ml-1 text-base font-semibold tracking-tight sm:ml-2 sm:text-lg">
                {formatMonth(visibleDate)}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="h-9 rounded-full px-3"
              >
                Today
              </Button>
              <div className="flex rounded-full bg-secondary p-1" role="group" aria-label="Calendar view">
                {(['month', 'week'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                    className={cn(
                      'h-7 rounded-full px-3 text-[11px] font-semibold capitalize transition-colors',
                      mode === value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mode === 'week' && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-olive-soft/60 px-3 py-2 text-xs text-olive-deep">
              <span>{formatShortDate(weekDates[0])} — {formatShortDate(weekDates[6])}</span>
              <span className="hidden sm:inline">Select a day to view its schedule</span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-7">
            {weekDays.map((day) => (
              <div
                key={day}
                className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
              >
                <span className="sm:hidden">{day.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
            {dates.map((date) => {
              const key = dateKey(date)
              const dayEntries = outfitsForDate(entries, key)
              const outsideMonth = date.getMonth() !== visibleDate.getMonth()
              const isSelected = selectedDate === key
              const isToday = todayKey === key
              const isWeekMode = mode === 'week'
              return (
                <button
                  type="button"
                  key={key}
                  aria-label={`${formatFullDate(date)}${dayEntries.length ? `, ${dayEntries.length} scheduled outfits` : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => chooseDate(date)}
                  className={cn(
                    'relative flex min-w-0 flex-col items-center rounded-xl p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:items-stretch sm:p-1.5',
                    isWeekMode ? 'min-h-28 sm:min-h-40' : 'min-h-[4.25rem] sm:min-h-24',
                    outsideMonth && mode === 'month' && 'opacity-45',
                    isSelected ? 'bg-olive-soft' : 'hover:bg-secondary/80',
                    dayEntries.length > 0 && !isSelected && 'bg-secondary/30',
                  )}
                >
                  <span className="flex w-full items-center justify-center sm:justify-between">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-xs font-medium sm:size-8',
                        isToday && 'ring-1 ring-olive-deep',
                        isSelected && 'bg-olive text-olive-foreground ring-0',
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <span className="hidden text-[10px] text-muted-foreground sm:inline">
                      {isWeekMode ? formatShortDate(date) : ''}
                    </span>
                  </span>
                  <span className="mt-1 hidden w-full flex-col gap-1 sm:flex">
                    {dayEntries.slice(0, isWeekMode ? 3 : 2).map((entry) => {
                      const outfit = outfitById.get(entry.outfitId)
                      return (
                        <span
                          key={entry.id}
                          className={cn(
                            'flex min-w-0 items-center gap-1 overflow-hidden rounded-md px-1 py-0.5 text-left text-[9px]',
                            outfit
                              ? 'bg-background/80 text-foreground'
                              : 'bg-amber-50 text-amber-900',
                          )}
                        >
                          <span className="size-4 shrink-0 overflow-hidden rounded bg-white">
                            {outfit ? (
                              <OutfitMiniPreview
                                outfit={outfit}
                                items={items}
                                compact
                              />
                            ) : (
                              <Shirt className="size-4 p-0.5" aria-hidden="true" />
                            )}
                          </span>
                          <span className="truncate">{outfit?.name ?? 'Unavailable'}</span>
                        </span>
                      )
                    })}
                    {dayEntries.length > (isWeekMode ? 3 : 2) && (
                      <span className="px-1 text-[9px] text-muted-foreground">
                        +{dayEntries.length - (isWeekMode ? 3 : 2)} more
                      </span>
                    )}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="mt-0.5 flex gap-0.5 sm:hidden" aria-hidden="true">
                      {dayEntries.slice(0, 3).map((entry) => (
                        <span
                          key={entry.id}
                          className={cn(
                            'size-1 rounded-full',
                            missingEntryIds.has(entry.id) ? 'bg-amber-600' : 'bg-olive',
                          )}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {mode === 'month' && (
            <p className="mt-2 px-1 text-[10px] text-muted-foreground sm:hidden">
              Dots mark planned looks · Select a date to view its schedule
            </p>
          )}
        </section>

        <aside className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(23,23,23,0.03)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-olive-deep">
                Your schedule
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                {formatFullDate(selectedDateValue)}
              </h2>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-olive-soft text-olive-deep">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {selectedEntries.length} {selectedEntries.length === 1 ? 'outfit planned' : 'outfits planned'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddDialog}
              className="h-8 rounded-full px-3 text-xs"
            >
              <Plus aria-hidden="true" />
              Add
            </Button>
          </div>

          {feedback && (
            <div className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-olive-soft px-3 py-2 text-xs text-olive-deep" role="status">
              <span>{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss message"
                className="shrink-0"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {selectedEntries.map((entry) => (
              <ScheduledOutfitCard
                key={entry.id}
                entry={entry}
                outfit={outfitById.get(entry.outfitId)}
                items={items}
                isWorn={wornCalendarEntryIds.has(entry.id)}
                onMarkAsWorn={(note) => handleMarkAsWorn(entry, note)}
                onEdit={() => openEditDialog(entry)}
                onRemove={() => handleRemove(entry)}
              />
            ))}
            {selectedEntries.length === 0 && (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-olive/30 bg-secondary/40 px-5 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-background text-olive-deep">
                  <Clock3 className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold">Nothing planned just yet</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                  Pick a saved outfit to make this day feel a little more put together.
                </p>
                <Button
                  type="button"
                  onClick={openAddDialog}
                  className="mt-4 h-9 rounded-full bg-olive px-4 text-xs text-olive-foreground hover:bg-olive-deep"
                >
                  Plan an outfit
                </Button>
              </div>
            )}
          </div>

          {selectedHasMissingOutfit && (
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-amber-900">
              <ChevronDown className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Unavailable saved outfits remain in your schedule. Edit an entry to replace its outfit or remove it.
            </p>
          )}
        </aside>
      </div>

      <ScheduleDialog
        key={`${dialogMode}-${dialogEntry?.id ?? selectedDate}-${dialogOpen}`}
        open={dialogOpen}
        mode={dialogMode}
        entry={dialogEntry}
        outfits={outfits}
        entries={entries}
        items={items}
        initialDate={dialogEntry?.date ?? selectedDate}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
