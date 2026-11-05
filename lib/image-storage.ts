import {
  clothingCategories,
  wearStatuses,
  type ClothingItem,
  type Outfit,
} from '@/lib/wardrobe-data'
import { isCalendarDate, type CalendarEntry } from '@/lib/calendar-data'
import {
  DuplicateCalendarWearError,
  isWearLog,
  type WearLog,
} from '@/lib/wear-log-data'

const databaseName = 'virtual-wardrobe'
const databaseVersion = 5
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

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Image storage is unavailable in this browser.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    let settled = false

    request.onupgradeneeded = () => {
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
    typeof record.favorite === 'boolean'
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
    record.outfitId.length > 0 &&
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

export function persistWardrobe(items: ClothingItem[]): Promise<void> {
  return runTransaction(
    [wardrobeStoreName, metadataStoreName],
    'readwrite',
    (transaction, complete) => {
      const wardrobeStore = transaction.objectStore(wardrobeStoreName)
      wardrobeStore.clear()
      for (const item of items) {
        wardrobeStore.put(item)
      }
      transaction.objectStore(metadataStoreName).put({
        id: wardrobeInitializedKey,
        initialized: true,
      } satisfies WardrobeMetadata)
      complete(undefined)
    },
  )
}

export async function getOutfits(): Promise<Outfit[]> {
  const result: unknown = await runRequest(outfitStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isOutfit)) {
    throw new Error('Saved outfit data is invalid and was not changed.')
  }
  return result
}

export function persistOutfits(outfits: Outfit[]): Promise<void> {
  if (!outfits.every(isOutfit)) {
    return Promise.reject(new Error('Outfit data is invalid and was not saved.'))
  }

  return runTransaction([outfitStoreName], 'readwrite', (transaction, complete) => {
    const outfitStore = transaction.objectStore(outfitStoreName)
    outfitStore.clear()
    for (const outfit of outfits) {
      outfitStore.put(outfit)
    }
    complete(undefined)
  })
}

export function persistOutfit(outfit: Outfit): Promise<void> {
  if (!isOutfit(outfit)) {
    return Promise.reject(new Error('Outfit data is invalid and was not saved.'))
  }
  return runRequest(outfitStoreName, 'readwrite', (store) => store.put(outfit)).then(() => undefined)
}

export function deleteOutfit(id: string): Promise<void> {
  if (!id) {
    return Promise.reject(new TypeError('An outfit ID is required.'))
  }
  return runRequest(outfitStoreName, 'readwrite', (store) => store.delete(id)).then(() => undefined)
}

export async function getCalendarEntries(): Promise<CalendarEntry[]> {
  const result: unknown = await runRequest(calendarStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isCalendarEntry)) {
    throw new Error('Saved calendar data is invalid and was not changed.')
  }
  return result
}

export function persistCalendarEntries(entries: CalendarEntry[]): Promise<void> {
  if (!entries.every(isCalendarEntry)) {
    return Promise.reject(new Error('Calendar data is invalid and was not saved.'))
  }

  return runTransaction([calendarStoreName], 'readwrite', (transaction, complete) => {
    const calendarStore = transaction.objectStore(calendarStoreName)
    calendarStore.clear()
    for (const entry of entries) {
      calendarStore.put(entry)
    }
    complete(undefined)
  })
}

export function persistCalendarEntry(entry: CalendarEntry): Promise<void> {
  if (!isCalendarEntry(entry)) {
    return Promise.reject(new Error('Calendar entry is invalid and was not saved.'))
  }
  return runRequest(calendarStoreName, 'readwrite', (store) => store.put(entry)).then(() => undefined)
}

export function deleteCalendarEntry(id: string): Promise<void> {
  if (!id) {
    return Promise.reject(new TypeError('A calendar entry ID is required.'))
  }
  return runRequest(calendarStoreName, 'readwrite', (store) => store.delete(id)).then(() => undefined)
}

export async function getWearLogs(): Promise<WearLog[]> {
  const result: unknown = await runRequest(wearLogStoreName, 'readonly', (store) => store.getAll())
  if (!Array.isArray(result) || !result.every(isWearLog)) {
    throw new Error('Saved wear history is invalid and was not changed.')
  }
  return result
}

export function persistWearLogs(logs: WearLog[]): Promise<void> {
  const ids = new Set<string>()
  const calendarEntryIds = new Set<string>()
  const valid = logs.every((log) => {
    if (!isWearLog(log) || ids.has(log.id)) return false
    ids.add(log.id)
    if (log.calendarEntryId !== null) {
      if (calendarEntryIds.has(log.calendarEntryId)) return false
      calendarEntryIds.add(log.calendarEntryId)
    }
    return true
  })
  if (!valid) {
    return Promise.reject(new Error('Wear history is invalid or contains duplicate calendar records.'))
  }

  return runTransaction([wearLogStoreName], 'readwrite', (transaction, complete) => {
    const store = transaction.objectStore(wearLogStoreName)
    store.clear()
    for (const log of logs) store.put(log)
    complete(undefined)
  })
}

export function createWearLog(log: WearLog): Promise<void> {
  if (!isWearLog(log)) {
    return Promise.reject(new Error('Wear log data is invalid and was not saved.'))
  }

  return runTransaction([wearLogStoreName], 'readwrite', (transaction, complete, fail) => {
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
}

export function deleteWearLog(id: string): Promise<void> {
  if (!id) {
    return Promise.reject(new TypeError('A wear log ID is required.'))
  }
  return runRequest(wearLogStoreName, 'readwrite', (store) => store.delete(id)).then(() => undefined)
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
