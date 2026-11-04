import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface PagePlaceholderProps {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
}

export function PagePlaceholder({ eyebrow, title, description, icon: Icon }: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8 md:px-10 md:pt-12 lg:px-14">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive-deep">{eyebrow}</p>
      <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-tight md:text-5xl">
        {title}
      </h1>
      <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl bg-secondary px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-background">
          <Icon className="size-6 text-olive" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
