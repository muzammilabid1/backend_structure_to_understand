import '@/styles/globals.scss'

import CssBaseline from '@mui/material/CssBaseline'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { SWRConfig } from 'swr'

import { swrConfig } from '@/lib/swr-config'
import { theme } from '@/lib/ui/theme'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SPM Dashboard | Learning with Parents</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <SWRConfig value={swrConfig}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Component {...pageProps} />
          </ThemeProvider>
        </StyledEngineProvider>
      </SWRConfig>
    </>
  )
}
