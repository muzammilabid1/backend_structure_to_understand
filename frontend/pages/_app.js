import 'cropperjs/dist/cropper.min.css';
import '../shared/scss/main.scss';

import { ApolloProvider } from '@apollo/client';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import Head from 'next/head';
import Script from 'next/script';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';

import AuthProvider from '../components/AuthProvider';
import Announcements from '../components/Shared/Announcements';
import GlobalTooltip from '../components/Shared/GlobalTooltip';
import { VersionGuard } from '../components/VersionGuard';
import { DelegatedClaimsProvider } from '../context/DelegatedClaimsContext';
import { PageInfoProvider } from '../context/PageInfoContext';
import { getApolloClient } from '../lib/apolloClientConfig';
import { MINIO_PUBLIC_PATHS } from '../shared/Constant';
import theme from '../theme';

export default function MyApp(props) {
    const { Component, pageProps } = props;

    useEffect(() => {
        const jssStyles = document.querySelector('#jss-server-side');

        if (jssStyles) {
            jssStyles.parentElement.removeChild(jssStyles);
        }
    }, []);

    const client = getApolloClient();

    return (
        <>
            <Head>
                <title>Learning with Parents</title>
                <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/main-logo.png`}
                />
                <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
                <meta name="mobile-web-app-capable" content="yes" />
            </Head>
            {process.env.NEXT_PUBLIC_LWP_ENV !== 'local' ? (
                <Script
                    strategy="lazyOnload"
                    src="https://consent.cookiefirst.com/sites/explore.learningwithparents.com-c15af79f-dcbc-4e5f-940b-0a540f5476d8/consent.js"
                />
            ) : null}

            <Script
                id="gtm"
                type="text/plain"
                data-cookiefirst-category="performance"
                dangerouslySetInnerHTML={{
                    __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                        })(window,document,'script','dataLayer','GTM-KXXFPNF');`
                }}
            />
            <Script type="text/plain" data-cookiefirst-category="functional" src="https://js-eu1.hs-scripts.com/139823402.js" />
            <ApolloProvider client={client}>
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={theme}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DelegatedClaimsProvider>
                                <AuthProvider>
                                    <VersionGuard>
                                        <PageInfoProvider pageType={Component?.pageType}>
                                            <Announcements />
                                            <Component {...pageProps} />
                                        </PageInfoProvider>
                                        <GlobalTooltip />
                                    </VersionGuard>
                                </AuthProvider>
                            </DelegatedClaimsProvider>
                        </LocalizationProvider>
                    </ThemeProvider>
                </StyledEngineProvider>
            </ApolloProvider>
        </>
    );
}

MyApp.propTypes = {
    Component: PropTypes.elementType.isRequired,
    pageProps: PropTypes.object.isRequired
};
