import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import HomeDashboard from '../components/HomeDashboard'
import PlatformLoginNotice from '../components/PlatformLoginNotice'
import styles from '../styles/Home.module.scss'
import { ACCESS_TOKEN_COOKIE, getJwtDecoded } from '@/lib/manageCookies'
import { UserType } from 'lwp-shared'

type HomeProps = {
  hasValidToken: boolean
  noLayout?: boolean
}

export default function Home({ hasValidToken }: HomeProps) {
  return (
    <>
      <Head>
        <title>LWP Data Analytics Platform</title>
        <meta
          name="description"
          content="Internal data analytics platform for Learning with Parents"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {hasValidToken ? (
        <HomeDashboard />
      ) : (
        <div className={styles.loginNotice}>
          <PlatformLoginNotice />
        </div>
      )}
    </>
  )
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context) => {
  const accessToken = context.req.cookies?.[ACCESS_TOKEN_COOKIE]
  const decodedToken = accessToken ? (getJwtDecoded(accessToken) as { userType: UserType }) : null

  const hasValidToken = decodedToken ? decodedToken.userType === UserType.ADMIN : false
  return {
    props: {
      hasValidToken,
      noLayout: !hasValidToken,
    },
  }
}
