import {
  closetItems,
  clothingCategories,
  wearStatuses,
  type ClothingItem,
  type ClothingProvenance,
  type Outfit,
} from '@/lib/wardrobe-data'
import { isCalendarDate, type CalendarEntry } from '@/lib/calendar-data'
import {
  DuplicateCalendarWearError,
  isWearLog,
  type WearLog,
} from '@/lib/wear-log-data'

const databaseName = 'virtual-wardrobe'
const databaseVersion = 6
const imageStoreName = 'images'
const wardrobeStoreName = 'wardrobe'
const metadataStoreName = 'metadata'
const outfitStoreName = 'outfits'
const calendarStoreName = 'calendar'
const wearLogStoreName = 'wearLogs'
const wardrobeInitializedKey = 'wardrobe-initialized'
const imageReferencePrefix = 'idb-image:'

interface StoredImage {
  id: string
  blob: Blob
}

interface WardrobeMetadata {
  id: typeof wardrobeInitializedKey
  initialized: true
}

export function isStoredImageReference(value: string | null | undefined) {
  if (!value) return false
  return value.startsWith(imageReferencePrefix)
}

type StoreName = 'wardrobe' | 'outfits' | 'calendar' | 'wearLogs'

const storageChangeChannelName = 'virtual-wardrobe-storage-changes'

function notifyStorageChange(store: StoreName) {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(storageChangeChannelName)
  channel.postMessage({ store })
  channel.close()
}

export function subscribeToStorageChanges(store: StoreName, listener: () => void) {
  if (typeof window === 'undefined') return () => undefined

  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(storageChangeChannelName)
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (
        typeof event.data === 'object' &&
        event.data !== null &&
        'store' in event.data &&
        event.data.store === store
      ) {
        listener()
      }
    }
  }

  const refreshOnFocus = () => listener()
  window.addEventListener('focus', refreshOnFocus)
  document.addEventListener('visibilitychange', refreshOnFocus)

  return () => {
    channel?.close()
    window.removeEventListener('focus', refreshOnFocus)
    document.removeEventListener('visibilitychange', refreshOnFocus)
  }
}

function sameSeedRecord(record: Record<string, unknown>, seed: ClothingItem) {
  const expectedFields = [
    'id',
    'name',
    'category',
    'image',
    'imageAlt',
    'color',
    'brand',
    'seasons',
    'styles',
    'price',
    'status',
    'favorite',
  ]
  return (
    Object.keys(record).length === expectedFields.length &&
    expectedFields.every((field) => field in record) &&
    record.id === seed.id &&
    record.name === seed.name &&
    record.category === seed.category &&
    record.image === seed.image &&
    record.imageAlt === seed.imageAlt &&
    record.color === seed.color &&
    record.brand === seed.brand &&
    Array.isArray(record.seasons) &&
    record.seasons.length === seed.seasons.length &&
    record.seasons.every((value, index) => value === seed.seasons[index]) &&
    Array.isArray(record.styles) &&
    record.styles.length === seed.styles.length &&
    record.styles.every((value, index) => value === seed.styles[index]) &&
    record.price === seed.price &&
    record.status === seed.status &&
    record.favorite === seed.favorite
  )
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Image storage is unavailable in this browser.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    let settled = false

    request.onupgradeneeded = (event) => {
      const database = request.result
      if (!database.objectStoreNames.contains(imageStoreName)) {
        database.createObjectStore(imageStoreName, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(wardrobeStoreName)) {
        database.createObjectStore(wardrobeStoreName, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(metadataStoreName)) {
        database.createObjectStore(metadataStoreName, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(outfitStoreName)) {
        database.createObjectStore(outfitStoreName, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(calendarStoreName)) {
        database.createObjectStore(calendarStoreName, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(wearLogStoreName)) {
        database.createObjectStore(wearLogStoreName, { keyPath: 'id' })
      }

      if ((event as IDBVersionChangeEvent).oldVersion < 6) {
        const wardrobeStore = request.transaction?.objectStore(wardrobeStoreName)
        const cursorRequest = wardrobeStore?.openCursor()
        if (cursorRequest) {
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result
            if (!cursor) return

            const value: unknown = cursor.value
            if (typeof value === 'object' && value !== null) {
              const record = value as Record<string, unknown>
              if (!('provenance' in record)) {
                const seed = closetItems.find((item) => item.id === record.id)
                const provenance: ClothingProvenance =
                  seed && sameSeedRecord(record, seed) ? 'seed' : 'unknown'
                cursor.update({ ...record, provenance })
              }
            }
            cursor.continue()
          }
        }
      }
    }

    request.onerror = () => {
      settled = true
      reject(request.error ?? new Error('Unable to open image storage.'))
    }

    request.onblocked = () => {
      settled = true
      reject(new Error('Image storage is blocked by another open connection.'))
    }

    request.onsuccess = () => {
      const database = request.result
      if (settled) {
        database.close()
        return
      }

      database.onversionchange = () => database.close()
      resolve(database)
    }
  })
}

function runTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  action: (transaction: IDBTransaction, complete: (result: T) => void, fail: (error: Error) => void) => void,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        let transaction: IDBTransaction
        try {
          transaction = database.transaction(storeNames, mode)
        } catch (error) {
          database.close()
          reject(error instanceof Error ? error : new Error('Unable to access browser storage.'))
          return
        }

        let result: T
        let hasResult = false
        let settled = false

        const fail = (error: Error) => {
          if (settled) return
          settled = true
          reject(error)
          database.close()
          try {
            transaction.abort()
          } catch {
            // The transaction may already have completed or aborted.
          }
        }

        transaction.oncomplete = () => {
          if (settled) return
          settled = true
          database.close()
          if (hasResult) {
            resolve(result)
          } else {
            reject(new Error('The browser storage transaction did not complete.'))
          }
        }
        transaction.onerror = () => {
          fail(transaction.error ?? new Error('Unable to access browser storage.'))
        }
        transaction.onabort = () => {
          fail(transaction.error ?? new Error('The browser storage transaction was aborted.'))
          database.close()
        }

        try {
          action(
            transaction,
            (value) => {
              result = value
              hasResult = true
            },
            fail,
          )
        } catch (error) {
          fail(error instanceof Error ? error : new Error('Unable to access browser storage.'))
        }
      }),
    (error: unknown) => Promise.reject(error),
  )
}

function runRequest<T>(
  storeName: string,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return runTransaction([storeName], mode, (transaction, complete) => {
    const request = createRequest(transaction.objectStore(storeName))
    request.onsuccess = () => complete(request.result)
  })
}

function isClothingItem(value: unknown): value is ClothingItem {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    clothingCategories.includes(record.category as (typeof clothingCategories)[number]) &&
    typeof record.image === 'string' &&
    typeof record.imageAlt === 'string' &&
    typeof record.color === 'string' &&
    typeof record.brand === 'string' &&
    Array.isArray(record.seasons) &&
    record.seasons.every((season: unknown) => typeof season === 'string') &&
    Array.isArray(record.styles) &&
    record.styles.every((style: unknown) => typeof style === 'string') &&
    typeof record.price === 'number' &&
    Number.isFinite(record.price) &&
    wearStatuses.includes(record.status as (typeof wearStatuses)[number]) &&
    typeof record.favorite === 'boolean' &&
    (record.provenance === 'seed' ||
      record.provenance === 'user' ||
      record.provenance === 'unknown')
  )
}

function isOutfit(value: unknown): value is Outfit {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.description === 'string' &&
    Array.isArray(record.itemIds) &&
    record.itemIds.every((itemId: unknown) => typeof itemId === 'string') &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    typeof record.favorite === 'boolean'
  )
}

function isCalendarEntry(value: unknown): value is CalendarEntry {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.outfitId === 'string' &&
    record.outfitId.trim().length > 0 &&
    typeof record.date === 'string' &&
    isCalendarDate(record.date) &&
    typeof record.note === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  )
}

export function initializeWardrobe(seedItems: ClothingItem[]): Promise<ClothingItem[]> {
  return runTransaction(
    [wardrobeStoreName, metadataStoreName],
    'readwrite',
    (transaction, complete, fail) => {
      const wardrobeStore = transaction.objectStore(wardrobeStoreName)
      const metadataStore = transaction.objectStore(metadataStoreName)
      const itemsRequest = wardrobeStore.getAll()
      const initializedRequest = metadataStore.get(wardrobeInitializedKey)
      let storedItems: ClothingItem[] | null = null
      let hasBeenInitialized: boolean | null = null

      const initializeIfReady = () => {
        if (storedItems === null || hasBeenInitialized === null) return

        if (storedItems.length > 0 || hasBeenInitialized) {
          if (!hasBeenInitialized) {
            metadataStore.put({ id: wardrobeInitializedKey, initialized: true } satisfies WardrobeMetadata)
          }
          complete(storedItems)
          return
        }

        for (const item of seedItems) {
          wardrobeStore.put(item)
        }
        metadataStore.put({ id: wardrobeInitializedKey, initialized: true } satisfies WardrobeMetadata)
        complete(seedItems)
      }

      itemsRequest.onsuccess = () => {
        const result: unknown = itemsRequest.result
        if (!Array.isArray(result) || !result.every(isClothingItem)) {
          fail(new Error('Saved wardrobe data is invalid and was not changed.'))
          return
        }
        storedItems = result
        initializeIfReady()
      }
      initializedRequest.onsuccess = () => {
        const result: unknown = initializedRequest.result
        if (result === undefined) {
          hasBeenInitialized = false
        } else {
          if (
            typeof result !== 'object' ||
            result === null ||
            !('id' in result) ||
            result.id !== wardrobeInitializedKey ||
            !('initialized' in result) ||
            result.initialized !== true
          ) {
            fail(new Error('Saved wardrobe metadata is invalid and was not changed.'))
            return
          }
          hasBeenInitialized = true
        }
        initializeIfReady()
      }
    },
  )
}

export async function getWardrobeItems(): Promise<ClothingItem[]> {
  const result: unknown = await runRequest(wardrobeStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isClothingItem)) {
    throw new Error('Saved wardrobe data is invalid and was not changed.')
  }
  return result
}

export async function addWardrobeItem(item: ClothingItem): Promise<ClothingItem> {
  if (!isClothingItem(item)) {
    throw new Error('Clothing item data is invalid and was not saved.')
  }
  await runRequest(wardrobeStoreName, 'readwrite', (store) => store.add(item))
  notifyStorageChange(wardrobeStoreName)
  return item
}

export async function updateWardrobeItem(
  id: string,
  update: (current: ClothingItem) => ClothingItem,
): Promise<ClothingItem> {
  if (!id) throw new TypeError('A clothing item ID is required.')

  const updated = await runTransaction<ClothingItem>(
    [wardrobeStoreName, imageStoreName],
    'readwrite',
    (transaction, complete, fail) => {
      const wardrobeStore = transaction.objectStore(wardrobeStoreName)
      const request = wardrobeStore.get(id)
      request.onsuccess = () => {
        const value: unknown = request.result
        if (!isClothingItem(value)) {
          fail(new Error('The clothing item is no longer available or is invalid.'))
          return
        }

        try {
          const next = update(value)
          if (next.id !== id || !isClothingItem(next)) {
            fail(new Error('Clothing item changes are invalid and were not saved.'))
            return
          }

          wardrobeStore.put(next)
          if (value.image !== next.image && isStoredImageReference(value.image)) {
            const allItemsRequest = wardrobeStore.getAll()
            allItemsRequest.onsuccess = () => {
              const allItems: unknown = allItemsRequest.result
              if (!Array.isArray(allItems) || !allItems.every(isClothingItem)) {
                fail(new Error('Saved wardrobe data is invalid; the previous image was preserved.'))
                return
              }
              if (!allItems.some((item) => item.id !== id && item.image === value.image)) {
                transaction.objectStore(imageStoreName).delete(value.image)
              }
            }
          }
          complete(next)
        } catch (error: unknown) {
          fail(error instanceof Error ? error : new Error('Clothing item changes were not saved.'))
        }
      }
    },
  )

  notifyStorageChange(wardrobeStoreName)
  return updated
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  if (!id) throw new TypeError('A clothing item ID is required.')

  await runTransaction(
    [wardrobeStoreName, imageStoreName],
    'readwrite',
    (transaction, complete, fail) => {
      const wardrobeStore = transaction.objectStore(wardrobeStoreName)
      const request = wardrobeStore.get(id)
      request.onsuccess = () => {
        const value: unknown = request.result
        if (value === undefined) {
          complete(undefined)
          return
        }
        if (!isClothingItem(value)) {
          fail(new Error('The clothing item is invalid and was not deleted.'))
          return
        }

        const allItemsRequest = wardrobeStore.getAll()
        allItemsRequest.onsuccess = () => {
          const allItems: unknown = allItemsRequest.result
          if (!Array.isArray(allItems) || !allItems.every(isClothingItem)) {
            fail(new Error('Saved wardrobe data is invalid; no data was deleted.'))
            return
          }

          wardrobeStore.delete(id)
          if (
            isStoredImageReference(value.image) &&
            !allItems.some((item) => item.id !== id && item.image === value.image)
          ) {
            transaction.objectStore(imageStoreName).delete(value.image)
          }
          complete(undefined)
        }
      }
    },
  )
  notifyStorageChange(wardrobeStoreName)
}

export async function getOutfits(): Promise<Outfit[]> {
  const result: unknown = await runRequest(outfitStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isOutfit)) {
    throw new Error('Saved outfit data is invalid and was not changed.')
  }
  return result
}

export async function addOutfitRecord(outfit: Outfit): Promise<Outfit> {
  if (!isOutfit(outfit)) throw new Error('Outfit data is invalid and was not saved.')
  await runRequest(outfitStoreName, 'readwrite', (store) => store.add(outfit))
  notifyStorageChange(outfitStoreName)
  return outfit
}

export async function updateOutfitRecord(
  id: string,
  update: (current: Outfit) => Outfit,
): Promise<Outfit> {
  if (!id) throw new TypeError('An outfit ID is required.')
  const updated = await runTransaction<Outfit>(
    [outfitStoreName],
    'readwrite',
    (transaction, complete, fail) => {
      const store = transaction.objectStore(outfitStoreName)
      const request = store.get(id)
      request.onsuccess = () => {
        const current: unknown = request.result
        if (!isOutfit(current)) {
          fail(new Error('The saved outfit is no longer available or is invalid.'))
          return
        }
        try {
          const next = update(current)
          if (next.id !== id || !isOutfit(next)) {
            fail(new Error('Outfit changes are invalid and were not saved.'))
            return
          }
          store.put(next)
          complete(next)
        } catch (error: unknown) {
          fail(error instanceof Error ? error : new Error('Outfit changes were not saved.'))
        }
      }
    },
  )
  notifyStorageChange(outfitStoreName)
  return updated
}

export function deleteOutfit(id: string): Promise<void> {
  if (!id) {
    return Promise.reject(new TypeError('An outfit ID is required.'))
  }
  return runRequest(outfitStoreName, 'readwrite', (store) => store.delete(id))
    .then(() => notifyStorageChange(outfitStoreName))
}

export async function getCalendarEntries(): Promise<CalendarEntry[]> {
  const result: unknown = await runRequest(calendarStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isCalendarEntry)) {
    throw new Error('Saved calendar data is invalid and was not changed.')
  }
  return result
}

export async function addCalendarEntry(entry: CalendarEntry): Promise<CalendarEntry> {
  if (!isCalendarEntry(entry)) throw new Error('Calendar entry is invalid and was not saved.')
  await runTransaction([calendarStoreName], 'readwrite', (transaction, complete, fail) => {
    const store = transaction.objectStore(calendarStoreName)
    const request = store.getAll()
    request.onsuccess = () => {
      const current: unknown = request.result
      if (!Array.isArray(current) || !current.every(isCalendarEntry)) {
        fail(new Error('Saved calendar data is invalid and was not changed.'))
        return
      }
      if (current.some((candidate) => candidate.outfitId === entry.outfitId && candidate.date === entry.date)) {
        fail(new Error('This outfit is already scheduled for that date.'))
        return
      }
      store.add(entry)
      complete(entry)
    }
  })
  notifyStorageChange(calendarStoreName)
  return entry
}

export async function updateCalendarEntry(
  id: string,
  update: (current: CalendarEntry) => CalendarEntry,
): Promise<CalendarEntry> {
  if (!id) throw new TypeError('A calendar entry ID is required.')
  const updated = await runTransaction<CalendarEntry>(
    [calendarStoreName],
    'readwrite',
    (transaction, complete, fail) => {
      const store = transaction.objectStore(calendarStoreName)
      const request = store.get(id)
      request.onsuccess = () => {
        const current: unknown = request.result
        if (!isCalendarEntry(current)) {
          fail(new Error('The calendar entry is no longer available or is invalid.'))
          return
        }
        try {
          const next = update(current)
          if (next.id !== id || !isCalendarEntry(next)) {
            fail(new Error('Calendar entry changes are invalid and were not saved.'))
            return
          }
          const allRequest = store.getAll()
          allRequest.onsuccess = () => {
            const entries: unknown = allRequest.result
            if (!Array.isArray(entries) || !entries.every(isCalendarEntry)) {
              fail(new Error('Saved calendar data is invalid and was not changed.'))
              return
            }
            if (
              entries.some(
                (candidate) =>
                  candidate.id !== id &&
                  candidate.outfitId === next.outfitId &&
                  candidate.date === next.date,
              )
            ) {
              fail(new Error('This outfit is already scheduled for that date.'))
              return
            }
            store.put(next)
            complete(next)
          }
        } catch (error: unknown) {
          fail(error instanceof Error ? error : new Error('Calendar entry changes were not saved.'))
        }
      }
    },
  )
  notifyStorageChange(calendarStoreName)
  return updated
}

export function deleteCalendarEntry(id: string): Promise<void> {
  if (!id) {
    return Promise.reject(new TypeError('A calendar entry ID is required.'))
  }
  return runRequest(calendarStoreName, 'readwrite', (store) => store.delete(id))
    .then(() => notifyStorageChange(calendarStoreName))
}

export async function getWearLogs(): Promise<WearLog[]> {
  const result: unknown = await runRequest(wearLogStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isWearLog)) {
    throw new Error('Saved wear history is invalid and was not changed.')
  }
  return result
}

export async function createWearLog(log: WearLog): Promise<void> {
  if (!isWearLog(log)) {
    throw new Error('Wear log data is invalid and was not saved.')
  }

  await runTransaction([wearLogStoreName], 'readwrite', (transaction, complete, fail) => {
    const store = transaction.objectStore(wearLogStoreName)
    const request = store.getAll()
    request.onsuccess = () => {
      const existing: unknown = request.result
      if (!Array.isArray(existing) || !existing.every(isWearLog)) {
        fail(new Error('Saved wear history is invalid and was not changed.'))
        return
      }
      if (
        log.calendarEntryId !== null &&
        existing.some((entry) => entry.calendarEntryId === log.calendarEntryId)
      ) {
        fail(new DuplicateCalendarWearError())
        return
      }
      store.add(log)
      complete(undefined)
    }
  })
  notifyStorageChange(wearLogStoreName)
}

export function deleteWearLog(id: string): Promise<void> {
  if (!id) {
    return Promise.reject(new TypeError('A wear log ID is required.'))
  }
  return runRequest(wearLogStoreName, 'readwrite', (store) => store.delete(id))
    .then(() => notifyStorageChange(wearLogStoreName))
}

export async function saveImage(blob: Blob): Promise<string> {
  if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
    throw new TypeError('A valid image file is required.')
  }
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('This browser cannot create a stable image reference.')
  }

  const reference = `${imageReferencePrefix}${crypto.randomUUID()}`
  const record: StoredImage = { id: reference, blob }

  try {
    await runRequest(imageStoreName, 'readwrite', (store) => store.put(record))
  } catch (error) {
    throw new Error(
      'Unable to save the image to this browser. Check available storage and try again.',
      { cause: error },
    )
  }

  return reference
}

export async function getImage(reference: string): Promise<Blob | null> {
  if (!isStoredImageReference(reference)) {
    throw new TypeError('A valid stored image reference is required.')
  }

  try {
    const result = await runRequest(imageStoreName, 'readonly', (store) => store.get(reference))
    if (
      typeof result === 'object' &&
      result !== null &&
      'id' in result &&
      result.id === reference &&
      'blob' in result &&
      result.blob instanceof Blob
    ) {
      return result.blob
    }
    return null
  } catch (error) {
    throw new Error('Unable to load the image from this browser.', { cause: error })
  }
}

export async function deleteImage(reference: string): Promise<void> {
  if (!isStoredImageReference(reference)) {
    throw new TypeError('A valid stored image reference is required.')
  }

  try {
    await runRequest(imageStoreName, 'readwrite', (store) => store.delete(reference))
  } catch (error) {
    throw new Error('Unable to remove the image from this browser.', { cause: error })
  }
}

export async function deleteImageIfUnreferenced(reference: string): Promise<boolean> {
  if (!isStoredImageReference(reference)) return false

  return runTransaction(
    [wardrobeStoreName, imageStoreName],
    'readwrite',
    (transaction, complete, fail) => {
      const request = transaction.objectStore(wardrobeStoreName).getAll()
      request.onsuccess = () => {
        const items: unknown = request.result
        if (!Array.isArray(items) || !items.every(isClothingItem)) {
          fail(new Error('Saved wardrobe data is invalid; the image was preserved.'))
          return
        }
        if (items.some((item) => item.image === reference)) {
          complete(false)
          return
        }
        transaction.objectStore(imageStoreName).delete(reference)
        complete(true)
      }
    },
  )
}
