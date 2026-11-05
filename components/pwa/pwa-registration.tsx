'use client'

import { useEffect } from 'react'

export function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const scriptUrl = new URL('/service-worker.js', window.location.origin)
    const scope = new URL('/', window.location.origin)

    if (process.env.NODE_ENV !== 'production') {
      void (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          const appRegistrations = registrations.filter((registration) =>
            [registration.active, registration.waiting, registration.installing].some(
              (worker) => worker?.scriptURL === scriptUrl.href,
            ),
          )

          await Promise.all(appRegistrations.map((registration) => registration.unregister()))

          const appCaches = (await caches.keys()).filter((key) =>
            key.startsWith('virtual-wardrobe-offline-'),
          )
          await Promise.all(appCaches.map((key) => caches.delete(key)))
        } catch (error: unknown) {
          console.error('Unable to remove the development service worker and its cache.', error)
        }
      })()
      return
    }

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register(scriptUrl, {
          scope: scope.href,
          updateViaCache: 'none',
        })

        try {
          await registration.update()
        } catch (error: unknown) {
          console.error(`Unable to check for updates to ${scriptUrl.href}.`, error)
        }
      } catch (error: unknown) {
        console.error(
          `Unable to register ${scriptUrl.href} with scope ${scope.href}.`,
          error,
        )
      }
    })()
  }, [])

  return null
}
