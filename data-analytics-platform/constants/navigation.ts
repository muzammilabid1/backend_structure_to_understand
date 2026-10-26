import { Home, TrendingUp, Search, Book, Users, LineChart, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  title: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Home', title: 'Home', icon: Home },
  { href: '/impact', label: 'Impact', title: 'Impact Dashboard', icon: TrendingUp },
  // { href: '/old-impact', label: 'Old Impact', title: 'Old Impact Dashboard', icon: TrendingUp },
  // { href: '/families', label: 'Families', title: 'Families Dashboard', icon: Users },
  // { href: '/content', label: 'Content', title: 'Content Analytics', icon: BookOpen },
  { href: '/data-dictionary', label: 'Data Dictionary', title: 'Data Dictionary', icon: Book },
  // { href: '/query-builder', label: 'Query Builder', title: 'Query Builder', icon: Search },
  {
    href: '/fundraising',
    label: 'Fundraising Graphs',
    title: 'Fundraising Graphs',
    icon: LineChart,
  },
]
