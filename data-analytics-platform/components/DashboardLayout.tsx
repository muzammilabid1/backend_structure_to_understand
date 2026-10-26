import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BarChart3 } from 'lucide-react'
import { navItems } from '../constants/navigation'
import styles from './DashboardLayout.module.scss'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { pathname } = useRouter()

  return (
    <div className={styles.container}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <BarChart3 size={28} />
          <h2>LWP Analytics</h2>
        </div>
        <ul className={styles.navList}>
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={pathname === href ? styles.active : ''}>
                <Icon size={20} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.main}>{children}</div>
    </div>
  )
}
