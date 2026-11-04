import {
  CalendarDays,
  House,
  PlusCircle,
  Shirt,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  emphasized?: boolean
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/closet', label: 'Closet', icon: Shirt },
  { href: '/create', label: 'Create', icon: PlusCircle, emphasized: true },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

export function isNavItemActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
