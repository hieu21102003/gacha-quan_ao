'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const dismissalStorageKey = 'virtual-wardrobe-install-dismissed-until'
const dismissalDuration = 30 * 24 * 60 * 60 * 1000

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    iosNavigator.standalone === true
  )
}

function isIosSafari() {
  const userAgent = navigator.userAgent
  const isAppleMobile = /iPhone|iPad|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isAppleMobile && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent)
}

function wasDismissed() {
  const storedValue = window.localStorage.getItem(dismissalStorageKey)
  if (!storedValue) return false

  const dismissedUntil = Number(storedValue)
  if (!Number.isFinite(dismissedUntil) || dismissedUntil <= Date.now()) {
    window.localStorage.removeItem(dismissalStorageKey)
    return false
  }
  return true
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(
      dismissalStorageKey,
      String(Date.now() + dismissalDuration),
    )
  } catch (error) {
    console.error('Unable to save the install prompt preference.', error)
  }
}

export function InstallAction() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isIosInstallable, setIsIosInstallable] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    try {
      setIsDismissed(wasDismissed())
    } catch (error) {
      console.error('Unable to read the install prompt preference.', error)
    }

    setIsIosInstallable(isIosSafari())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsIosInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (isDismissed || (!installPrompt && !isIosInstallable)) return null

  const dismiss = () => {
    rememberDismissal()
    setIsDismissed(true)
  }

  const install = async () => {
    if (!installPrompt) {
      setShowIosInstructions((visible) => !visible)
      return
    }

    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      rememberDismissal()
      setIsDismissed(true)
    } catch (error) {
      console.error('The browser install prompt could not be opened.', error)
      setInstallPrompt(null)
    }
  }

  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={install}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:px-4"
        >
          {isIosInstallable && !installPrompt ? (
            <Share className="size-4" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {isIosInstallable && !installPrompt ? 'How to install' : 'Install app'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install option"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {showIosInstructions && (
        <p
          role="status"
          className="max-w-64 rounded-xl border border-border bg-card px-3 py-2 text-right text-xs leading-5 text-muted-foreground shadow-sm"
        >
          In Safari, tap Share, then choose Add to Home Screen.
        </p>
      )}
    </div>
  )
}
