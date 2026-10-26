// const withPWA = require('next-pwa')({
//     dest: 'public',
//     register: true,
//     skipWaiting: true,
//     disable: true,
//     maximumFileSizeToCacheInBytes: 20 * 1024 * 1024 // 20 MB
// });

const moduleExports = {
    env: {
        BUILD_ID: new Date().toISOString()
    },
    reactStrictMode: true,
    swcMinify: true,
    headers: () => [
        {
            source: '/',
            headers: [
                // Enforce HTTPS via Strict-Transport-Security header:
                {
                    key: 'Strict-Transport-Security',
                    value: `max-age=${2 * 365 * 24 * 60 * 60 /* 2 years */}; includeSubDomains; preload`
                },
                // Deny embedding the page in iframes, to prevent clickjacking:
                {
                    key: 'X-Frame-Options',
                    value: 'DENY'
                },
                {
                    key: 'Content-Security-Policy-Report-Only',
                    value: `
                        default-src 'self' https://learningwithparents.com https://*.learningwithparents.com https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com;
                        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com consent.cookiefirst.com https://www.googletagmanager.com https://googletagmanager.com https://tagmanager.google.com *.hsadspixel.net *.hs-analytics.net js.hscta.net *.hubspot.com static.hsappstatic.net *.usemessages.com *.hs-banner.com *.hubspotusercontent00.net *.hubspotusercontent10.net *.hubspotusercontent20.net *.hubspotusercontent30.net *.hubspotusercontent40.net *.hubspot.net *.hscollectedforms.net *.hsleadflows.net *.hsforms.net *.hsforms.com *.hs-scripts.com *.hubspotfeedback.com feedback.hubapi.com https://js-agent.newrelic.com;
                        style-src 'self' 'unsafe-inline' consent.cookiefirst.com https://googletagmanager.com https://tagmanager.google.com https://fonts.googleapis.com https://*.googletagmanager.com *.hubspotusercontent00.net *.hubspotusercontent10.net *.hubspotusercontent20.net *.hubspotusercontent30.net *.hubspotusercontent40.net cdn2.hubspot.net;
                        style-src-elem 'self' 'unsafe-inline';
                        img-src 'self' https://s3.eu-west-2.amazonaws.com/lwp-public-media/ https://s3.eu-west-2.amazonaws.com/lwp-user-media/ https://s3.eu-west-2.amazonaws.com/lwp-public-media-stage/ https://s3.eu-west-2.amazonaws.com/lwp-user-media-stage/ https://s3.eu-west-2.amazonaws.com/lwp-public-media-dev/ https://s3.eu-west-2.amazonaws.com/lwp-user-media-dev/ consent.cookiefirst.com www.googletagmanager.com https://googletagmanager.com https://ssl.gstatic.com https://www.gstatic.com https://*.google-analytics.com https://*.googletagmanager.com js.hscta.net no-cache.hubspot.com *.hubspot.com *.hubspotusercontent00.net *.hubspotusercontent10.net *.hubspotusercontent20.net *.hubspotusercontent30.net *.hubspotusercontent40.net *.hubspot.net cdn2.hubspot.net *.hsforms.net *.hsforms.com data:;
                        frame-src 'self' https://learningwithparents.com https://challenges.cloudflare.com *.hubspot.com *.hs-sites.com *.hubspot.net play.hubspotvideo.com *.hsforms.net *.hsforms.com https://player.vimeo.com https://embed.vimeo.com;
                        connect-src 'self' https://accounts.google.com/gsi/ https://api.learningwithparents.com https://vimeo.com https://api.learningwithparents.com:8081 https://api-dev.learningwithparents.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com *.hubapi.com js.hscta.net *.hubspot.com *.hs-banner.com *.hscollectedforms.net *.hsforms.com *.nr-data.net www.google.com consent.cookiefirst.com edge.cookiefirst.com api.cookiefirst.com;
                        font-src 'self' https://fonts.gstatic.com;
                        object-src 'none';
                        base-uri 'self';
                        form-action 'self';
                        worker-src 'none';
                        report-to lwp-csp;
                        report-uri https://csp-report.learningwithparents.com;
                    `
                        .replace(/\s{2,}/g, ' ')
                        .trim()
                },
                {
                    key: 'Reporting-Endpoints',
                    value: 'lwp-csp="https://csp-report.learningwithparents.com"'
                }
            ]
        }
    ],
    async redirects() {
        return [
            {
                source: '/graphql',
                destination: process.env.NEXT_PUBLIC_GRAPHQL_END_POINT || 'https://api.learningwithparents.com/graphql',
                permanent: false
            },
            {
                source: '/school',
                destination: '/',
                permanent: false
            },
            {
                source: '/feed',
                destination: '/',
                permanent: false
            },
            {
                source: '/parent',
                destination: '/',
                permanent: false
            },
            {
                source: '/child/:cid/topic/:tid*',
                destination: '/topic/:tid*',
                permanent: false
            },
            {
                source: '/class/:classId/:rest(register|reading)?',
                destination: '/class/:classId/readingweek',
                permanent: false
            },
            {
                source: '/class/:classId/week-by-week',
                destination: '/class/:classId/readingweek',
                permanent: false
            },
            {
                source: '/class/:classId/reading/:reading_id',
                destination: '/class/:classId/readingweek/:reading_id',
                permanent: false
            },
            {
                source: '/admin/:rest(schools)?',
                destination: '/admin/schools/active',
                permanent: false
            },
            {
                source: '/m/:rest*',
                destination: '/magic/:rest*',
                permanent: false
            }
        ];
        // globals: { cy: true }
    },
    modularizeImports: {
        '@mui/icons-material': {
            transform: '@mui/icons-material/{{member}}'
        }
    },
    productionBrowserSourceMaps: true,
    transpilePackages: ['lwp-shared']
};

// module.exports = withPWA(moduleExports);

module.exports = moduleExports;
