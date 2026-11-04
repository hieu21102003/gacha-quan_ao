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
import { initializeWardrobe, persistWardrobe } from '@/lib/image-storage'
import {
  closetItems as seedItems,
  type ClothingCategory,
  type ClothingItem,
  type WearStatus,
} from '@/lib/wardrobe-data'

export interface ClosetFiltersState {
  colors: string[]
  seasons: string[]
  styles: string[]
  statuses: WearStatus[]
}

export const emptyClosetFilters: ClosetFiltersState = {
  colors: [],
  seasons: [],
  styles: [],
  statuses: [],
}

interface WardrobeContextValue {
  items: ClothingItem[]
  addItem: (item: Omit<ClothingItem, 'id'>) => ClothingItem
  updateItem: (id: string, patch: Partial<ClothingItem>) => void
  deleteItem: (id: string) => void
  toggleFavorite: (id: string) => void
  storageError: string | null
  retryStorage: () => void
}

const WardrobeContext = createContext<WardrobeContextValue | null>(null)

function createId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([])
  const itemsRef = useRef(items)
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError(null)

    void initializeWardrobe(seedItems)
      .then((storedItems) => {
        if (!active) return
        itemsRef.current = storedItems
        setItems(storedItems)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load your wardrobe from this browser.',
        )
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadAttempt])

  const enqueuePersistence = useCallback((snapshot: ClothingItem[]) => {
    persistenceQueueRef.current = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => persistWardrobe(snapshot))
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        setStorageError(
          error instanceof Error ? error.message : 'Unable to save wardrobe changes in this browser.',
        )
      })
  }, [])

  const commitItems = useCallback(
    (nextItems: ClothingItem[]) => {
      itemsRef.current = nextItems
      setItems(nextItems)
      enqueuePersistence(nextItems)
    },
    [enqueuePersistence],
  )

  const addItem = useCallback((item: Omit<ClothingItem, 'id'>) => {
    const next: ClothingItem = { ...item, id: createId() }
    commitItems([next, ...itemsRef.current])
    return next
  }, [commitItems])

  const updateItem = useCallback((id: string, patch: Partial<ClothingItem>) => {
    const current = itemsRef.current
    if (!current.some((item) => item.id === id)) return
    commitItems(current.map((item) => (item.id === id ? { ...item, ...patch, id } : item)))
  }, [commitItems])

  const deleteItem = useCallback((id: string) => {
    const current = itemsRef.current
    const next = current.filter((item) => item.id !== id)
    if (next.length !== current.length) commitItems(next)
  }, [commitItems])

  const toggleFavorite = useCallback((id: string) => {
    const current = itemsRef.current
    if (!current.some((item) => item.id === id)) return
    commitItems(
      current.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)),
    )
  }, [commitItems])

  const retryStorage = useCallback(() => {
    enqueuePersistence(itemsRef.current)
  }, [enqueuePersistence])

  const value = useMemo(
    () => ({ items, addItem, updateItem, deleteItem, toggleFavorite, storageError, retryStorage }),
    [items, addItem, updateItem, deleteItem, toggleFavorite, storageError, retryStorage],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-sm text-muted-foreground" role="status">
        Loading your wardrobe…
      </div>
    )
  }

  if (loadError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <section className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Your wardrobe could not be loaded</h1>
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
    <WardrobeContext.Provider value={value}>
      {storageError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
        >
          <span>
            Wardrobe changes could not be saved to this browser. {storageError}
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
    </WardrobeContext.Provider>
  )
}

export function useWardrobe() {
  const context = useContext(WardrobeContext)
  if (!context) {
    throw new Error('useWardrobe must be used within WardrobeProvider')
  }
  return context
}

export function countByCategory(items: ClothingItem[]) {
  return items.reduce<Record<ClothingCategory | 'All Items', number>>(
    (acc, item) => {
      acc['All Items'] += 1
      acc[item.category] += 1
      return acc
    },
    {
      'All Items': 0,
      Tops: 0,
      Bottoms: 0,
      Dresses: 0,
      Outerwear: 0,
      Shoes: 0,
      Bags: 0,
      Accessories: 0,
    },
  )
}

export function hasActiveFilters(filters: ClosetFiltersState) {
  return (
    filters.colors.length > 0 ||
    filters.seasons.length > 0 ||
    filters.styles.length > 0 ||
    filters.statuses.length > 0
  )
}

export function activeFilterCount(filters: ClosetFiltersState) {
  return filters.colors.length + filters.seasons.length + filters.styles.length + filters.statuses.length
}

export function filterClosetItems(
  items: ClothingItem[],
  options: {
    category: ClothingCategory | 'All Items'
    query: string
    filters: ClosetFiltersState
  },
) {
  const query = options.query.trim().toLowerCase()

  return items.filter((item) => {
    if (options.category !== 'All Items' && item.category !== options.category) return false
    if (query && !item.name.toLowerCase().includes(query)) return false
    if (options.filters.colors.length > 0 && !options.filters.colors.includes(item.color)) return false
    if (
      options.filters.seasons.length > 0 &&
      !item.seasons.some((season) => options.filters.seasons.includes(season))
    ) {
      return false
    }
    if (
      options.filters.styles.length > 0 &&
      !item.styles.some((style) => options.filters.styles.includes(style))
    ) {
      return false
    }
    if (options.filters.statuses.length > 0 && !options.filters.statuses.includes(item.status)) {
      return false
    }
    return true
  })
}
