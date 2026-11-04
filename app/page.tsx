import { DashboardHeader } from '@/components/home/dashboard-header'
import { OutfitOfTheDay } from '@/components/home/outfit-of-the-day'
import { QuickActions } from '@/components/home/quick-actions'
import { RecentlyWorn } from '@/components/home/recently-worn'
import { WardrobeOverview } from '@/components/home/wardrobe-overview'
import { WeatherSuggestion, WeatherWidget } from '@/components/home/weather-widget'

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8 md:gap-12 md:px-10 md:pt-12 lg:px-14">
      <DashboardHeader />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-3 lg:order-2 lg:gap-8">
          <div className="flex flex-col gap-2.5">
            <WeatherWidget />
            <div className="px-1">
              <WeatherSuggestion />
            </div>
          </div>
          <div className="hidden flex-col gap-8 lg:flex">
            <QuickActions />
            <WardrobeOverview />
          </div>
        </div>

        <div className="lg:order-1">
          <OutfitOfTheDay />
        </div>

        <div className="flex flex-col gap-8 lg:hidden">
          <QuickActions />
        </div>
      </div>

      <RecentlyWorn />

      <div className="lg:hidden">
        <WardrobeOverview />
      </div>
    </div>
  )
}
