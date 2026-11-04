'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { isNavItemActive, navItems } from './nav-items'

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href)
          const Icon = item.icon

          if (item.emphasized) {
            return (
              <li key={item.href} className="flex flex-1 items-center justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full transition-all active:scale-95',
                    active
                      ? 'bg-olive-deep text-olive-foreground'
                      : 'bg-olive text-olive-foreground',
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </li>
            )
          }

          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={active ? 2 : 1.6}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute top-0 h-0.5 w-6 rounded-full bg-foreground"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
