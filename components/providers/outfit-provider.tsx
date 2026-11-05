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
import { getOutfits, persistOutfits } from '@/lib/image-storage'
import type { Outfit } from '@/lib/wardrobe-data'

type NewOutfit = Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'>
type OutfitUpdate = Partial<Pick<Outfit, 'name' | 'description' | 'itemIds' | 'favorite'>>

interface OutfitContextValue {
  outfits: Outfit[]
  persistenceError: string | null
  addOutfit: (outfit: NewOutfit) => Outfit
  updateOutfit: (id: string, patch: OutfitUpdate) => void
  deleteOutfit: (id: string) => void
  toggleOutfitFavorite: (id: string) => void
  retryStorage: () => void
}

const OutfitContext = createContext<OutfitContextValue | null>(null)

function createId() {
  return `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function OutfitProvider({ children }: { children: ReactNode }) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const outfitsRef = useRef(outfits)
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError(null)

    void getOutfits()
      .then((storedOutfits) => {
        if (!active) return
        outfitsRef.current = storedOutfits
        setOutfits(storedOutfits)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load your outfits from this browser.',
        )
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadAttempt])

  const enqueuePersistence = useCallback((snapshot: Outfit[]) => {
    persistenceQueueRef.current = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => persistOutfits(snapshot))
      .then(() => setPersistenceError(null))
      .catch((error: unknown) => {
        setPersistenceError(
          error instanceof Error ? error.message : 'Unable to save outfit changes in this browser.',
        )
      })
  }, [])

  const commitOutfits = useCallback(
    (nextOutfits: Outfit[]) => {
      outfitsRef.current = nextOutfits
      setOutfits(nextOutfits)
      enqueuePersistence(nextOutfits)
    },
    [enqueuePersistence],
  )

  const addOutfit = useCallback((outfit: NewOutfit) => {
    const timestamp = new Date().toISOString()
    const next: Outfit = {
      ...outfit,
      itemIds: [...outfit.itemIds],
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    commitOutfits([...outfitsRef.current, next])
    return next
  }, [commitOutfits])

  const updateOutfit = useCallback((id: string, patch: OutfitUpdate) => {
    const current = outfitsRef.current
    if (!current.some((outfit) => outfit.id === id)) return
    const updatedAt = new Date().toISOString()
    commitOutfits(
      current.map((outfit) =>
        outfit.id === id
          ? { ...outfit, ...patch, itemIds: patch.itemIds ? [...patch.itemIds] : outfit.itemIds, updatedAt }
          : outfit,
      ),
    )
  }, [commitOutfits])

  const deleteOutfit = useCallback((id: string) => {
    const current = outfitsRef.current
    const next = current.filter((outfit) => outfit.id !== id)
    if (next.length !== current.length) commitOutfits(next)
  }, [commitOutfits])

  const toggleOutfitFavorite = useCallback((id: string) => {
    const current = outfitsRef.current
    if (!current.some((outfit) => outfit.id === id)) return
    const updatedAt = new Date().toISOString()
    commitOutfits(
      current.map((outfit) =>
        outfit.id === id ? { ...outfit, favorite: !outfit.favorite, updatedAt } : outfit,
      ),
    )
  }, [commitOutfits])

  const retryStorage = useCallback(() => {
    enqueuePersistence(outfitsRef.current)
  }, [enqueuePersistence])

  const value = useMemo(
    () => ({
      outfits,
      persistenceError,
      addOutfit,
      updateOutfit,
      deleteOutfit,
      toggleOutfitFavorite,
      retryStorage,
    }),
    [
      outfits,
      persistenceError,
      addOutfit,
      updateOutfit,
      deleteOutfit,
      toggleOutfitFavorite,
      retryStorage,
    ],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-sm text-muted-foreground" role="status">
        Loading your outfits…
      </div>
    )
  }

  if (loadError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <section className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Your outfits could not be loaded</h1>
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
    <OutfitContext.Provider value={value}>
      {persistenceError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
        >
          <span>
            Outfit changes could not be saved to this browser. {persistenceError}
          </span>
          <button
            type="button"
            onClick={retryStorage}
            className="rounded-full border border-current px-3 py-1 font-semibold"
          >
            Retry saving
          </button>
        </div>
      )}
      {children}
    </OutfitContext.Provider>
  )
}

export function useOutfits() {
  const context = useContext(OutfitContext)
  if (!context) {
    throw new Error('useOutfits must be used within OutfitProvider')
  }
  return context
}
