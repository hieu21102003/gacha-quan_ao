import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import { AppShell } from '@/components/layout/app-shell'
import { CalendarProvider } from '@/components/providers/calendar-provider'
import { OutfitProvider } from '@/components/providers/outfit-provider'
import { WardrobeProvider } from '@/components/providers/wardrobe-provider'
import { WearLogProvider } from '@/components/providers/wear-log-provider'
import { PwaRegistration } from '@/components/pwa/pwa-registration'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Virtual Wardrobe',
    template: '%s · Virtual Wardrobe',
  },
  description: 'Your personal digital wardrobe and outfit planner.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#8b927b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${manrope.variable} bg-background`}>
      <body className="font-sans antialiased">
        <PwaRegistration />
        <WardrobeProvider>
          <OutfitProvider>
            <CalendarProvider>
              <WearLogProvider>
                <AppShell>{children}</AppShell>
              </WearLogProvider>
            </CalendarProvider>
          </OutfitProvider>
        </WardrobeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
