import { BottomNavigation } from './bottom-navigation'
import { DesktopNavigation } from './desktop-navigation'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <DesktopNavigation />
      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <BottomNavigation />
    </div>
  )
}
