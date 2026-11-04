'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { isNavItemActive, navItems } from './nav-items'

export function DesktopNavigation() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col border-r border-border bg-background px-3 py-8 md:flex lg:w-60 lg:px-5">
      <Link
        href="/"
        className="mb-12 flex items-center justify-center gap-3 lg:justify-start lg:px-3"
        aria-label="Virtual Wardrobe home"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-semibold tracking-tight text-background">
          VW
        </span>
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="text-sm font-semibold tracking-tight">Virtual Wardrobe</span>
          <span className="text-xs text-muted-foreground">Personal stylist</span>
        </span>
      </Link>

      <nav aria-label="Primary" className="flex-1">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isNavItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  className={cn(
                    'relative flex h-11 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-colors lg:justify-start lg:px-3',
                    item.emphasized
                      ? 'text-olive-deep hover:bg-olive-soft'
                      : active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-indicator"
                      className={cn(
                        'absolute inset-0 rounded-xl',
                        item.emphasized ? 'bg-olive-soft' : 'bg-secondary',
                      )}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon
                    className="relative size-5"
                    strokeWidth={active || item.emphasized ? 2 : 1.6}
                    aria-hidden="true"
                  />
                  <span className="relative">
                    <span className="sr-only lg:not-sr-only">{item.label}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="hidden rounded-2xl bg-secondary p-4 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-olive-deep">
          Style tip
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          Neutrals pair with almost everything. Build around them.
        </p>
      </div>
    </aside>
  )
}
