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
import {
  addOutfitRecord,
  deleteOutfit as deletePersistedOutfit,
  getOutfits,
  subscribeToStorageChanges,
  updateOutfitRecord,
} from '@/lib/image-storage'
import type { Outfit } from '@/lib/wardrobe-data'

type NewOutfit = Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'>
type OutfitUpdate = Partial<Pick<Outfit, 'name' | 'description' | 'itemIds' | 'favorite'>>

interface OutfitContextValue {
  outfits: Outfit[]
  persistenceError: string | null
  addOutfit: (outfit: NewOutfit) => Promise<Outfit>
  updateOutfit: (id: string, patch: OutfitUpdate) => Promise<Outfit>
  deleteOutfit: (id: string) => Promise<void>
  toggleOutfitFavorite: (id: string) => Promise<Outfit>
  retryStorage: () => Promise<void>
}

const OutfitContext = createContext<OutfitContextValue | null>(null)

function createId() {
  return `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function upsertOutfit(current: Outfit[], outfit: Outfit) {
  const index = current.findIndex((candidate) => candidate.id === outfit.id)
  if (index < 0) return [...current, outfit]
  return current.map((candidate) => (candidate.id === outfit.id ? outfit : candidate))
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function OutfitProvider({ children }: { children: ReactNode }) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const outfitsRef = useRef(outfits)
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

  const refreshFromStorage = useCallback(async () => {
    try {
      const storedOutfits = await getOutfits()
      outfitsRef.current = storedOutfits
      setOutfits(storedOutfits)
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to refresh outfits from this browser.'))
    }
  }, [])

  useEffect(
    () => subscribeToStorageChanges('outfits', () => void refreshFromStorage()),
    [refreshFromStorage],
  )

  const addOutfit = useCallback(async (outfit: NewOutfit) => {
    const timestamp = new Date().toISOString()
    const next: Outfit = {
      ...outfit,
      itemIds: [...outfit.itemIds],
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    try {
      const saved = await addOutfitRecord(next)
      outfitsRef.current = upsertOutfit(outfitsRef.current, saved)
      setOutfits(outfitsRef.current)
      setPersistenceError(null)
      return saved
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to save outfit changes in this browser.'))
      throw error
    }
  }, [])

  const updateOutfit = useCallback(async (id: string, patch: OutfitUpdate) => {
    try {
      const updated = await updateOutfitRecord(id, (current) => ({
        ...current,
        ...patch,
        itemIds: patch.itemIds ? [...patch.itemIds] : current.itemIds,
        updatedAt: new Date().toISOString(),
      }))
      outfitsRef.current = upsertOutfit(outfitsRef.current, updated)
      setOutfits(outfitsRef.current)
      setPersistenceError(null)
      return updated
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to save outfit changes in this browser.'))
      throw error
    }
  }, [])

  const deleteOutfit = useCallback(async (id: string) => {
    try {
      await deletePersistedOutfit(id)
      outfitsRef.current = outfitsRef.current.filter((outfit) => outfit.id !== id)
      setOutfits(outfitsRef.current)
      setPersistenceError(null)
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to delete this outfit from this browser.'))
      throw error
    }
  }, [])

  const toggleOutfitFavorite = useCallback(async (id: string) => {
    try {
      const updated = await updateOutfitRecord(id, (current) => ({
        ...current,
        favorite: !current.favorite,
        updatedAt: new Date().toISOString(),
      }))
      outfitsRef.current = upsertOutfit(outfitsRef.current, updated)
      setOutfits(outfitsRef.current)
      setPersistenceError(null)
      return updated
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to update this favorite in this browser.'))
      throw error
    }
  }, [])

  const retryStorage = useCallback(async () => {
    try {
      const storedOutfits = await getOutfits()
      outfitsRef.current = storedOutfits
      setOutfits(storedOutfits)
      setPersistenceError(null)
    } catch (error: unknown) {
      setPersistenceError(messageFromError(error, 'Unable to reload outfits from this browser.'))
    }
  }, [])

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
            Reload saved data
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
