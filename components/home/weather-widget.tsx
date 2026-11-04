import { CloudSun, MapPin } from 'lucide-react'
import { weather } from '@/lib/wardrobe-data'

export function WeatherWidget() {
  return (
    <section
      aria-label="Today's weather"
      className="flex items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background">
        <CloudSun className="size-6 text-olive" strokeWidth={1.6} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {weather.temperature}°C
          </span>
          <span className="truncate text-sm font-medium text-foreground">{weather.condition}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" aria-hidden="true" />
          {weather.location}
        </p>
      </div>
      <p className="hidden max-w-[11rem] text-right text-sm leading-snug text-muted-foreground sm:block md:hidden lg:block">
        {weather.suggestion}
      </p>
    </section>
  )
}

export function WeatherSuggestion() {
  return (
    <p className="text-sm leading-snug text-muted-foreground sm:hidden md:block lg:hidden">
      {weather.suggestion}
    </p>
  )
}
