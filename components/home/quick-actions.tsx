'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera, Layers, Shirt, type LucideIcon } from 'lucide-react'
import { AddClothingDialog } from './add-clothing-dialog'

const tileClass =
  'group flex flex-col items-center gap-2.5 rounded-2xl bg-secondary px-2 py-4 text-center transition-colors hover:bg-olive-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function TileContent({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <span className="flex size-10 items-center justify-center rounded-full bg-background transition-colors group-hover:text-olive-deep">
        <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span className="text-xs font-medium leading-tight text-foreground">{label}</span>
    </>
  )
}

export function QuickActions() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <section aria-label="Quick actions">
      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={() => setAddOpen(true)} className={tileClass}>
          <TileContent icon={Camera} label="Add Clothing" />
        </button>
        <Link href="/create" className={tileClass}>
          <TileContent icon={Layers} label="Create Outfit" />
        </Link>
        <Link href="/closet" className={tileClass}>
          <TileContent icon={Shirt} label="View My Closet" />
        </Link>
      </div>
      <AddClothingDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  )
}
