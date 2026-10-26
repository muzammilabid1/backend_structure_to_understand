import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { SWRConfig } from 'swr'
import { swrConfig } from '../lib/swr-config'
import DashboardLayout from '../components/DashboardLayout'
import { navItems } from '../constants/navigation'
import '../styles/globals.scss'

export default function App({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter()
  const { noLayout, ...props } = pageProps

  const pageTitle = navItems.find((item) => item.href === pathname)?.title ?? 'LWP Analytics'

  return (
    <>
      <Head>
        <title>{`${pageTitle} - LWP Analytics`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SWRConfig value={swrConfig}>
        {noLayout ? (
          <Component {...props} />
        ) : (
          <DashboardLayout>
            <Component {...props} />
          </DashboardLayout>
        )}
      </SWRConfig>
    </>
  )
}
