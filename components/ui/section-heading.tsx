import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  id?: string
  eyebrow?: string
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeading({ id, eyebrow, title, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-olive-deep">
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
