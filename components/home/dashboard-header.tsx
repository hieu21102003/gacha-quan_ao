'use client'

import { useRouter } from 'next/navigation'
import { UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InstallAction } from '@/components/pwa/install-action'

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DashboardHeader() {
  const router = useRouter()

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <time
          suppressHydrationWarning
          className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          {formatToday()}
        </time>
        <h1 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
          Your wardrobe, at a glance
        </h1>
        <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground md:text-base">
          Build a look from pieces you already own.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <InstallAction />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Open profile menu"
            className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-background transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <Avatar className="size-11 border border-border">
              <AvatarFallback>
                <UserRound className="size-5" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-2">
                <span className="block text-sm font-semibold text-foreground">Local wardrobe</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Your data stays in this browser.
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="rounded-lg px-2 py-2"
                onClick={() => router.push('/profile')}
              >
                <UserRound aria-hidden="true" />
                Wardrobe overview
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
