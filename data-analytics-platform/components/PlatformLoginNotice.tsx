import { ArrowRight, CircleCheckBig, LogIn } from 'lucide-react'

import styles from './PlatformLoginNotice.module.scss'

export default function PlatformLoginNotice() {
  return (
    <div className={styles.noticeCard}>
      <div className={styles.iconWrap}>
        <LogIn size={20} />
      </div>

      <div className={styles.content}>
        <h2>Sign in from the main platform</h2>
        <p>
          This analytics platform is for admin users only. If an admin signs in on the main
          platform, shared cookies on the main domain will automatically sign them in here.
        </p>

        <ul>
          <li>
            <CircleCheckBig size={16} />
            Shared session across subdomains
          </li>
          <li>
            <CircleCheckBig size={16} />
            Admin-only access to analytics
          </li>
          <li>
            <CircleCheckBig size={16} />
            No second login needed in analytics
          </li>
        </ul>

        <a className={styles.cta} href={process.env.NEXT_PUBLIC_PLATFORM_BASE_URL}>
          Go to Platform login
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  )
}
