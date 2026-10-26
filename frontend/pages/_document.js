import { ServerStyleSheets } from '@mui/styles';
import getConfig from 'next/config';
import Document, { Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

import NewRelicScriptTag from '../components/Shared/NewRelicScriptTag';
import theme from '../theme';

export default class MyDocument extends Document {
    render() {
        return (
            <Html lang="en">
                <Head>
                    <link rel="manifest" href="/manifest.json" />
                    <link rel="apple-touch-icon" href="/icon.png" />
                    <meta name="theme-color" content={theme.palette.primary.main} />
                    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
                    <NewRelicScriptTag />
                </Head>
                <body>
                    <noscript>
                        To use this site it is necessary to enable JavaScript.
                        <a href="https://www.whatismybrowser.com/guides/how-to-enable-javascript/auto">
                            Follow the instructions here to enable JavaScript in your web browser
                        </a>
                        .
                    </noscript>
                    <Main />
                    <NextScript />
                    {/* <script
                        type="text/plain"
                        data-cookiefirst-category="functional"
                        dangerouslySetInnerHTML={{
                            __html: `var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
                            (function(){
                                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                                s1.async=true;
                                s1.src='https://embed.tawk.to/5f466ca31e7ade5df44423c6/default';
                                s1.charset='UTF-8';
                                s1.setAttribute('crossorigin','*');
                                s0.parentNode.insertBefore(s1,s0);
                            })();`
                        }}></script> */}
                </body>
                {/* {this.props.commitId && (
                    <div
                        style={{
                            display: 'flex',
                            zIndex: '1400',
                            position: 'fixed',
                            alignItems: 'center',
                            left: '24px',
                            right: 'auto',
                            bottom: '24px'
                        }}>
                        <div
                            style={{
                                color: '#fff',
                                display: 'flex',
                                paddingTop: '12px',
                                paddingRight: '20px',
                                paddingBottom: '12px',
                                paddingLeft: '20px',
                                flexGrow: 1,
                                flexWrap: 'wrap',
                                fontSize: '0.875rem',
                                alignItems: 'center',
                                fontFamily: 'Verdana',
                                fontWeight: '400',
                                lineHeight: '1.43',
                                borderRadius: '4px',
                                backgroundColor: '#313131'
                            }}>
                            {this.props.commitId}
                        </div>
                    </div>
                )} */}
            </Html>
        );
    }
}

MyDocument.getInitialProps = async (ctx) => {
    const sheets = new ServerStyleSheets();
    const originalRenderPage = ctx.renderPage;
    let commitId = '';

    const { publicRuntimeConfig } = getConfig();

    if (typeof publicRuntimeConfig?.generateBuildId === 'function') {
        commitId = await publicRuntimeConfig?.generateBuildId();
    }

    ctx.renderPage = () =>
        originalRenderPage({
            enhanceApp: (App) => (props) => sheets.collect(<App {...props} />)
        });

    const initialProps = await Document.getInitialProps(ctx);

    return {
        ...initialProps,
        styles: [...React.Children.toArray(initialProps.styles), sheets.getStyleElement()],
        commitId
    };
};
