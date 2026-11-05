'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useOutfits } from '@/components/providers/outfit-provider'
import {
  addCalendarEntry,
  getCalendarEntries,
  subscribeToStorageChanges,
  updateCalendarEntry,
  deleteCalendarEntry,
} from '@/lib/image-storage'
import {
  findMissingOutfitReferences,
  isCalendarDate,
  type CalendarEntry,
  type MissingOutfitReference,
} from '@/lib/calendar-data'

type NewCalendarEntry = Pick<CalendarEntry, 'outfitId' | 'date'> &
  Partial<Pick<CalendarEntry, 'note'>>
type CalendarEntryUpdate = Partial<Pick<CalendarEntry, 'outfitId' | 'date' | 'note'>>

interface CalendarContextValue {
  entries: CalendarEntry[]
  missingOutfitReferences: MissingOutfitReference[]
  persistenceError: string | null
  addEntry: (entry: NewCalendarEntry) => Promise<CalendarEntry>
  updateEntry: (id: string, patch: CalendarEntryUpdate) => Promise<CalendarEntry>
  deleteEntry: (id: string) => Promise<void>
  getEntriesByDate: (date: string) => CalendarEntry[]
  retryStorage: () => Promise<void>
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

function createId() {
  return `calendar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function validateEntry(entry: Pick<CalendarEntry, 'outfitId' | 'date'>) {
  if (!entry.outfitId.trim()) throw new TypeError('An outfit ID is required.')
  if (!isCalendarDate(entry.date)) throw new TypeError('A valid calendar date in YYYY-MM-DD format is required.')
}

function upsertEntry(current: CalendarEntry[], entry: CalendarEntry) {
  const index = current.findIndex((candidate) => candidate.id === entry.id)
  if (index < 0) return [...current, entry]
  return current.map((candidate) => (candidate.id === entry.id ? entry : candidate))
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { outfits } = useOutfits()
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const entriesRef = useRef(entries)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError(null)

    void getCalendarEntries()
      .then((storedEntries) => {
        if (!active) return
        entriesRef.current = storedEntries
        setEntries(storedEntries)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load your calendar from this browser.',
        )
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadAttempt])

  const refreshFromStorage = useCallback(async () => {
    try {
      const storedEntries = await getCalendarEntries()
      entriesRef.current = storedEntries
      setEntries(storedEntries)
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to refresh your calendar from this browser.'))
    }
  }, [])

  useEffect(
    () => subscribeToStorageChanges('calendar', () => void refreshFromStorage()),
    [refreshFromStorage],
  )

  const addEntry = useCallback(
    async (entry: NewCalendarEntry) => {
      validateEntry(entry)
      const timestamp = new Date().toISOString()
      const next: CalendarEntry = {
        id: createId(),
        outfitId: entry.outfitId,
        date: entry.date,
        note: entry.note ?? '',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      try {
        const saved = await addCalendarEntry(next)
        entriesRef.current = upsertEntry(entriesRef.current, saved)
        setEntries(entriesRef.current)
        setPersistenceError(null)
        return saved
      } catch (error: unknown) {
        setPersistenceError(messageFromError(error, 'Unable to save calendar changes in this browser.'))
        throw error
      }
    },
    [],
  )

  const updateEntry = useCallback(
    async (id: string, patch: CalendarEntryUpdate) => {
      if (!id) throw new TypeError('A calendar entry ID is required.')

      try {
        const updated = await updateCalendarEntry(id, (existing) => ({
          ...existing,
          ...patch,
          updatedAt: new Date(
            Math.max(Date.now(), (Date.parse(existing.updatedAt) || 0) + 1),
          ).toISOString(),
        }))
        validateEntry(updated)
        if (typeof updated.note !== 'string') {
          throw new TypeError('A calendar entry note must be a string.')
        }
        entriesRef.current = upsertEntry(entriesRef.current, updated)
        setEntries(entriesRef.current)
        setPersistenceError(null)
        return updated
      } catch (error: unknown) {
        setPersistenceError(messageFromError(error, 'Unable to save calendar changes in this browser.'))
        throw error
      }
    },
    [],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!id) throw new TypeError('A calendar entry ID is required.')
      try {
        await deleteCalendarEntry(id)
        entriesRef.current = entriesRef.current.filter((entry) => entry.id !== id)
        setEntries(entriesRef.current)
        setPersistenceError(null)
      } catch (error: unknown) {
        setPersistenceError(messageFromError(error, 'Unable to remove the calendar entry from this browser.'))
        throw error
      }
    },
    [],
  )

  const getEntriesByDate = useCallback(
    (date: string) => entriesRef.current.filter((entry) => entry.date === date),
    [],
  )

  const retryStorage = useCallback(async () => {
    try {
      const storedEntries = await getCalendarEntries()
      entriesRef.current = storedEntries
      setEntries(storedEntries)
      setPersistenceError(null)
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to reload your calendar from this browser.'))
    }
  }, [])

  const missingOutfitReferences = useMemo(
    () => findMissingOutfitReferences(entries, outfits),
    [entries, outfits],
  )

  const value = useMemo(
    () => ({
      entries,
      missingOutfitReferences,
      persistenceError,
      addEntry,
      updateEntry,
      deleteEntry,
      getEntriesByDate,
      retryStorage,
    }),
    [
      entries,
      missingOutfitReferences,
      persistenceError,
      addEntry,
      updateEntry,
      deleteEntry,
      getEntriesByDate,
      retryStorage,
    ],
  )

  if (isLoading) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center px-6 text-sm text-muted-foreground"
        role="status"
      >
        Loading your calendar…
      </div>
    )
  }

  if (loadError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <section className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Your calendar could not be loaded</h1>
          <p role="alert" className="mt-2 text-sm text-muted-foreground">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="mt-5 h-11 rounded-full bg-olive px-5 text-sm font-semibold text-olive-foreground"
          >
            Try again
          </button>
        </section>
      </main>
    )
  }

  return (
    <CalendarContext.Provider value={value}>
      {persistenceError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
        >
          <span>
            Calendar changes could not be saved to this browser. {persistenceError}
          </span>
          <button
            type="button"
            onClick={retryStorage}
            className="rounded-full border border-current px-3 py-1 font-semibold"
          >
            Reload saved data
          </button>
        </div>
      )}
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider')
  }
  return context
}
