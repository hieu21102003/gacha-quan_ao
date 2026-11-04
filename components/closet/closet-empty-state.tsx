import { Camera, Search, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClosetEmptyStateProps {
  variant: 'collection' | 'search' | 'category'
  categoryLabel?: string
  onAddClothing: () => void
  onClear?: () => void
}

export function ClosetEmptyState({
  variant,
  categoryLabel,
  onAddClothing,
  onClear,
}: ClosetEmptyStateProps) {
  const copy = {
    collection: {
      icon: Shirt,
      title: 'Your closet is waiting',
      description: 'Add your first piece and start building a wardrobe that feels like you.',
      action: 'Add Clothing',
    },
    search: {
      icon: Search,
      title: 'Nothing matches that search',
      description: 'Try a different name, or clear the search to see everything you own.',
      action: 'Clear search',
    },
    category: {
      icon: Shirt,
      title: `No ${categoryLabel?.toLowerCase() ?? 'items'} yet`,
      description: 'This shelf is empty. Add a piece here, or browse the rest of your closet.',
      action: 'Add Clothing',
    },
  }[variant]

  const Icon = copy.icon

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-secondary px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-background">
        <Icon className="size-6 text-olive" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{copy.title}</h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {copy.description}
        </p>
      </div>
      {variant === 'search' ? (
        <Button variant="outline" onClick={onClear} className="mt-2 h-11 rounded-full px-5">
          {copy.action}
        </Button>
      ) : (
        <Button onClick={onAddClothing} className="mt-2 h-11 rounded-full px-5">
          <Camera aria-hidden="true" />
          {copy.action}
        </Button>
      )}
      {variant === 'category' && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-olive-deep underline-offset-4 hover:underline"
        >
          View all items
        </button>
      )}
    </div>
  )
}
