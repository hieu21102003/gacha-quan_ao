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
import { useWardrobe } from '@/components/providers/wardrobe-provider'
import { isCalendarDate, type CalendarEntry } from '@/lib/calendar-data'
import {
  createWearLog as persistNewWearLog,
  deleteWearLog as removeWearLog,
  getWearLogs,
  subscribeToStorageChanges,
} from '@/lib/image-storage'
import {
  DuplicateCalendarWearError,
  createWearLogFromCalendar,
  type NewWearLog,
  type WearLog,
} from '@/lib/wear-log-data'

interface WearLogContextValue {
  logs: WearLog[]
  persistenceError: string | null
  addWearLog: (log: NewWearLog) => Promise<WearLog>
  recordWearFromCalendar: (entry: CalendarEntry, note?: string) => Promise<WearLog>
  deleteWearLog: (id: string) => Promise<void>
  getLogsByDate: (date: string) => WearLog[]
  getLogsByOutfit: (outfitId: string) => WearLog[]
  retryStorage: () => Promise<void>
}

const WearLogContext = createContext<WearLogContextValue | null>(null)

function createId() {
  return `wear-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function WearLogProvider({ children }: { children: ReactNode }) {
  const { outfits } = useOutfits()
  const { items } = useWardrobe()
  const [logs, setLogs] = useState<WearLog[]>([])
  const logsRef = useRef(logs)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError(null)

    void getWearLogs()
      .then((storedLogs) => {
        if (!active) return
        logsRef.current = storedLogs
        setLogs(storedLogs)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(errorMessage(error, 'Unable to load wear history from this browser.'))
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadAttempt])

  const refreshFromStorage = useCallback(async () => {
    try {
      const storedLogs = await getWearLogs()
      logsRef.current = storedLogs
      setLogs(storedLogs)
    } catch (error: unknown) {
      setPersistenceError(errorMessage(error, 'Unable to refresh wear history from this browser.'))
    }
  }, [])

  useEffect(
    () => subscribeToStorageChanges('wearLogs', () => void refreshFromStorage()),
    [refreshFromStorage],
  )

  const enqueueWrite = useCallback(<T,>(operation: () => Promise<T>) => {
    const result = writeQueueRef.current.then(operation)
    writeQueueRef.current = result.then(
      () => undefined,
      (error: unknown) => {
        if (!(error instanceof DuplicateCalendarWearError)) {
          setPersistenceError(errorMessage(error, 'Unable to save wear history in this browser.'))
        }
      },
    )
    return result
  }, [])

  const commitLogs = useCallback((nextLogs: WearLog[]) => {
    logsRef.current = nextLogs
    setLogs(nextLogs)
    setPersistenceError(null)
  }, [])

  const addWearLog = useCallback(
    (input: NewWearLog) => {
      const log: WearLog = {
        outfitId: input.outfitId,
        calendarEntryId: input.calendarEntryId,
        wornOn: input.wornOn,
        note: input.note,
        items: input.items.map((item) => ({
          clothingItemId: item.clothingItemId,
          name: item.name,
          category: item.category,
          brand: item.brand,
          price: item.price,
        })),
        outfitName: input.outfitName,
        outfitValue: input.outfitValue,
        id: createId(),
        createdAt: new Date().toISOString(),
      }
      return enqueueWrite(async () => {
        if (
          log.calendarEntryId !== null &&
          logsRef.current.some((existing) => existing.calendarEntryId === log.calendarEntryId)
        ) {
          throw new DuplicateCalendarWearError()
        }
        await persistNewWearLog(log)
        commitLogs([...logsRef.current, log])
        return log
      })
    },
    [commitLogs, enqueueWrite],
  )

  const recordWearFromCalendar = useCallback(
    (entry: CalendarEntry, note = '') => {
      if (logsRef.current.some((log) => log.calendarEntryId === entry.id)) {
        throw new DuplicateCalendarWearError()
      }
      return addWearLog(createWearLogFromCalendar(entry, outfits, items, new Date(), note))
    },
    [addWearLog, items, outfits],
  )

  const deleteLog = useCallback(
    (id: string) =>
      enqueueWrite(async () => {
        if (!id) throw new TypeError('A wear log ID is required.')
        await removeWearLog(id)
        commitLogs(logsRef.current.filter((log) => log.id !== id))
      }),
    [commitLogs, enqueueWrite],
  )

  const getLogsByDate = useCallback(
    (date: string) => {
      if (!isCalendarDate(date)) throw new TypeError('A valid calendar date is required.')
      return logsRef.current.filter((log) => log.wornOn === date)
    },
    [],
  )

  const getLogsByOutfit = useCallback(
    (outfitId: string) => {
      if (!outfitId) throw new TypeError('An outfit ID is required.')
      return logsRef.current.filter((log) => log.outfitId === outfitId)
    },
    [],
  )

  const retryStorage = useCallback(async () => {
    try {
      const storedLogs = await getWearLogs()
      logsRef.current = storedLogs
      setLogs(storedLogs)
      setPersistenceError(null)
    } catch (error: unknown) {
      setPersistenceError(errorMessage(error, 'Unable to reload wear history from this browser.'))
    }
  }, [])

  const value = useMemo(
    () => ({
      logs,
      persistenceError,
      addWearLog,
      recordWearFromCalendar,
      deleteWearLog: deleteLog,
      getLogsByDate,
      getLogsByOutfit,
      retryStorage,
    }),
    [
      logs,
      persistenceError,
      addWearLog,
      recordWearFromCalendar,
      deleteLog,
      getLogsByDate,
      getLogsByOutfit,
      retryStorage,
    ],
  )

  if (isLoading) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center px-6 text-sm text-muted-foreground"
        role="status"
      >
        Loading wear history…
      </div>
    )
  }

  if (loadError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <section className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Wear history could not be loaded</h1>
          <p role="alert" className="mt-2 text-sm text-muted-foreground">{loadError}</p>
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
    <WearLogContext.Provider value={value}>
      {persistenceError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
        >
          <span>Wear history changes could not be saved to this browser. {persistenceError}</span>
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
    </WearLogContext.Provider>
  )
}

export function useWearLogs() {
  const context = useContext(WearLogContext)
  if (!context) {
    throw new Error('useWearLogs must be used within WearLogProvider')
  }
  return context
}
