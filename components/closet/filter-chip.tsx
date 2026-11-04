import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  selected: boolean
  onClick: () => void
}

export function FilterChip({ label, selected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-9 rounded-full border px-3.5 text-xs font-medium transition-colors',
        selected
          ? 'border-olive bg-olive text-olive-foreground'
          : 'border-border text-foreground hover:bg-secondary',
      )}
    >
      {label}
    </button>
  )
}
