#!/usr/bin/env node

const fs = require('fs');

const frontendPort = process.env.LWP_FRONTEND_PORT || '80';

// datastore postgres
const pghost = process.env.PGHOST || ' - missing - ';
const pgappuser = process.env.PGAPPUSER || 'lwpUser';
const pgapppassword = process.env.PGAPPPASSWORD || ' - missing - ';
const pgadminuser = process.env.PGADMINUSER || 'lwpAdminUser';
const pgadminpassword = process.env.PGADMINPASSWORD || ' - missing - ';

const pgsuperuser_envvars = process.env.PGSUPERUSER
    ? `
  PGSUPERUSER="${process.env.PGSUPERUSER}"
  PGSUPERPASSWORD="${process.env.PGSUPERPASSWORD}"`
    : '';

// google auth
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// microsoft auth
const microsoftClientId = process.env.AZURE_AD_CLIENT_ID;
const microsoftClientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const microsoftClientSecretValue = process.env.AZURE_AD_CLIENT_SECRET_VALUE;
const microsoftExpiryDate = process.env.AZURE_AD_EXPIRY_DATE;

// storage
const bucketHost =
    process.env.ULTIMA_BUCKET_HOST || 's3.eu-west-2.amazonaws.com';
const bucketPort = process.env.ULTIMA_BUCKET_PORT || '443';
const bucketRegion = process.env.ULTIMA_BUCKET_REGION || 'eu-west-2';
const bucketAccessKey =
    process.env.ULTIMA_BUCKET_ACCESS_KEY_ID || ' - missing - ';
const bucketAccessSecret =
    process.env.ULTIMA_BUCKET_ACCESS_KEY_SECRET || ' - missing - ';
const bucketPublic = process.env.PUBLIC_BUCKET_NAME || 'lwp-public-media-dev';
const bucketMedia = process.env.MEDIA_BUCKET_NAME || 'lwp-user-media-dev';
const basePublicUrl =
    process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL ||
    'https://files.learningwithparents.com';

// environment
const lwpBuildType = process.env.LWP_BUILD_TYPE || 'localdev';
const nodeEnv = process.env.NODE_ENV || 'production';
const lwpEnv = process.env.LWP_ENV || 'production';

// connected services
const sendBlueApi = process.env.SENDINBLUE_APIKEY;
const mailgunApi = process.env.MAILGUN_APIKEY;
const mailgunHook = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
const emailDomain =
    process.env.EMAIL_DOMAIN || 'explore.learningwithparents.com';
const spmEmails = process.env.SPM_EMAILS;
const twilioSid = process.env.TWILIO_SID;
const twilioToken = process.env.TWILIO_TOKEN;
const twilioHookUrl = process.env.TWILIO_WEBHOOK_URL;
const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
const skipRecaptchaSecretToken = process.env.SKIP_RECAPTCHA_SECRET_TOKEN;
const wondeApi = process.env.WONDE_API_TOKEN;
const gaTrackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

// urls and ports
const port = process.env.PORT || '80';
const hostedUrl =
    process.env.HOSTED_URL || 'https://explore.learningwithparents.com';
const analyticsUrl =
    process.env.ANALYTICS_URL || 'https://analytics.learningwithparents.com';

const npgep = process.env.NEXT_PUBLIC_GRAPHQL_END_POINT || ' - missing - ';
const graphqlBase =
    process.env.GRAPHQL_BASE || 'https://api.learningwithparents.com';
const shortBaseUrl = process.env.SHORTBASEURL || 'https://lwp.uk';

// other
const jwtSecret =
    process.env.LWP_JWT_SECRET ||
    '$2y$12$ScZusrKd/mTM0UjJVjhEq./8vJBfiXY0Q.LzDALfiX3RIZ8o8a6cW';

const trustedProxyIpsAndSubnets =
    process.env.TRUSTED_PROXY_IPS_AND_SUBNETS || '';

const regularCronJobsCronTime = process.env.REGULAR_CRON_JOBS_CRON_TIME || '0 */10 * * * *';
const dailyCronJobsCronTime = process.env.DAILY_CRON_JOBS_CRON_TIME || '0 0 2 * * *';

function writeFrontendService() {
    let data = `[Unit]
Description=lwp_frontend
After=network.target

[Service]
ExecStart=/var/lwp/node_modules/next/dist/bin/next start -p 80
Restart=always
User=root
Group=nogroup
EnvironmentFile=/var/lwp/release/frontend.env
WorkingDirectory=/var/lwp/frontend/

[Install]
WantedBy=multi-user.target
`;
    fs.writeFileSync(
        'release/frontend.env',
        `
    PATH=/usr/bin:/usr/local/bin
    LWP_FRONTEND_PORT=${frontendPort}
    NODE_OPTIONS='--max_old_space_size=4096 -r newrelic'
    NODE_ENV=${nodeEnv}
    NEXT_PUBLIC_GRAPHQL_END_POINT=${npgep}
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=${googleClientId}
    NEXT_PUBLIC_MICROSOFT_CLIENT_ID=${microsoftClientId}
    NEXT_PUBLIC_GRAPHQL_BASE=${graphqlBase}
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${recaptchaKey}
    NEXT_PUBLIC_LWP_ENV=${lwpEnv}
    NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL=${basePublicUrl}
    NEXT_PUBLIC_GA_TRACKING_ID=${gaTrackingId}
    NEXT_PUBLIC_COOKIE_DOMAIN=${cookieDomain}
    LWP_BUILD_TYPE=${lwpBuildType}
    LWP_ENV=${lwpEnv}
    HOSTED_URL=${hostedUrl}
    NEXT_PUBLIC_HOSTED_URL=${hostedUrl}
    `,
    );
    fs.writeFileSync('release/lwp_frontend.service', data);
}

function writeBackendService() {
    let data = `[Unit]
Description=lwp_backend
After=network.target

[Service]
ExecStart=yarn start
Restart=always
User=root
Group=nogroup
EnvironmentFile=/var/lwp/release/backend.env
WorkingDirectory=/var/lwp/graphql-provider/

[Install]
WantedBy=multi-user.target
`;
    fs.writeFileSync('release/lwp_backend.service', data);
    fs.writeFileSync(
        'release/backend.env',
        `
    PATH=/usr/bin:/usr/local/bin
    NODE_ENV=${nodeEnv}
    LWP_BUILD_TYPE=${lwpBuildType}
    LWP_ENV=${lwpEnv}
    PGAPPUSER=${pgappuser}
    PGAPPPASSWORD="${pgapppassword}"
    PGADMINUSER="${pgadminuser}"
    PGADMINPASSWORD="${pgadminpassword}"
    PGPORT=5432
    PGHOST=${pghost}
    PGDATABASE=postgres
    ${pgsuperuser_envvars}
    ULTIMA_BUCKET_HOST=${bucketHost}
    ULTIMA_BUCKET_PORT=${bucketPort}
    ULTIMA_BUCKET_REGION=${bucketRegion}
    ULTIMA_BUCKET_ACCESS_KEY_ID=${bucketAccessKey}
    ULTIMA_BUCKET_ACCESS_KEY_SECRET=${bucketAccessSecret}
    PUBLIC_BUCKET_NAME=${bucketPublic}
    MEDIA_BUCKET_NAME=${bucketMedia}
    MINIO_PUBLIC_BASE_URL=${basePublicUrl}
    GOOGLE_CLIENT_ID=${googleClientId}
    GOOGLE_CLIENT_SECRET=${googleClientSecret}
    AZURE_AD_CLIENT_ID=${microsoftClientId}
    AZURE_AD_CLIENT_SECRET=${microsoftClientSecret}
    AZURE_AD_CLIENT_SECRET_VALUE=${microsoftClientSecretValue}
    AZURE_AD_EXPIRY_DATE=${microsoftExpiryDate}
    SENDINBLUE_APIKEY=${sendBlueApi}
    ${mailgunApi ? `MAILGUN_APIKEY=${mailgunApi}` : ''}
    ${mailgunHook ? `MAILGUN_WEBHOOK_SIGNING_KEY=${mailgunHook}` : ''}
    ${twilioSid ? `TWILIO_SID=${twilioSid}` : ''}
    ${twilioToken ? `TWILIO_TOKEN=${twilioToken}` : ''}
    ${emailDomain ? `EMAIL_DOMAIN=${emailDomain}` : ''}
    ${spmEmails ? `SPM_EMAILS="${spmEmails}"` : ''}
    PORT=${port}
    WONDE_API_TOKEN=${wondeApi}
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${recaptchaKey}
    RECAPTCHA_SECRET_KEY=${recaptchaSecret}
    SKIP_RECAPTCHA_SECRET_TOKEN=${skipRecaptchaSecretToken}
    HOSTED_URL=${hostedUrl}
    LWP_JWT_SECRET=${jwtSecret}
    GRAPHQL_BASE=${graphqlBase}
    SHORTBASEURL=${shortBaseUrl}
    TWILIO_WEBHOOK_URL=${twilioHookUrl}
    TRUSTED_PROXY_IPS_AND_SUBNETS=${trustedProxyIpsAndSubnets}
    REGULAR_CRON_JOBS_CRON_TIME=${regularCronJobsCronTime}
    DAILY_CRON_JOBS_CRON_TIME=${dailyCronJobsCronTime}
    ANALYTICS_URL=${analyticsUrl}
    `,
    );
    //need to upgade db which is done manually
    fs.writeFileSync(
        'release/db.env',
        `export NODE_ENV=${nodeEnv} PGAPPUSER='${pgappuser}' PGAPPPASSWORD='${pgapppassword}' PGADMINUSER='${pgadminuser}' PGADMINPASSWORD='${pgadminpassword}' PGPORT=5432 PGHOST='${pghost}' PGDATABASE='postgres' ${pgsuperuser_envvars
            .replace(/\n/g, ' ')
            .replace(/"/g, "'")}`,
    );
}

function writeNotificationService() {
    const allowSch = process.env.ALLOW_SCHEDULING || false;
    let data = `[Unit]
Description=lwp_notification
After=network.target

[Service]
ExecStart=yarn start
Restart=always
User=root
Group=nogroup
Environment="ALLOW_SCHEDULING=${allowSch}"
EnvironmentFile=/var/lwp/release/backend.env
WorkingDirectory=/var/lwp/graphql-provider/

[Install]
WantedBy=multi-user.target
`;
    fs.writeFileSync('release/lwp_notification.service', data);
}

function writeAnalyticsService() {
    const pgport = process.env.PGPORT || '5432';
    const pgdatabase = process.env.PGDATABASE || 'postgres';
    const databaseUrl =
        process.env.DATABASE_URL ||
        `postgres://${pgappuser}:${encodeURIComponent(pgapppassword)}@${pghost}:${pgport}/${pgdatabase}`;

    let data = `[Unit]
Description=lwp_analytics
After=network.target

[Service]
ExecStart=yarn start -p 80
Restart=always
User=root
Group=nogroup
EnvironmentFile=/var/lwp/release/analytics.env
WorkingDirectory=/var/lwp/data-analytics-platform/

[Install]
WantedBy=multi-user.target
`;
    fs.writeFileSync(
        'release/analytics.env',
        `
    PATH=/usr/bin:/usr/local/bin
    PGHOST=${pghost}
    PGPORT=${pgport}
    PGDATABASE=${pgdatabase}
    PGAPPUSER=${pgappuser}
    PGAPPPASSWORD="${pgapppassword}"
    NEXT_PUBLIC_COOKIE_DOMAIN=${cookieDomain}
    NEXT_PUBLIC_LWP_ENV=${lwpEnv}
    NEXT_PUBLIC_PLATFORM_BASE_URL=${hostedUrl}
    LWP_JWT_SECRET=${jwtSecret}
    DATABASE_URL=${databaseUrl}
    `,
    );
    fs.writeFileSync('release/lwp_analytics.service', data);
}

function writeSpmService() {
    const pgport = process.env.PGPORT || '5432';
    const pgdatabase = process.env.PGDATABASE || 'postgres';

    let data = `[Unit]
Description=lwp_spm
After=network.target

[Service]
ExecStart=yarn start -p 80
Restart=always
User=root
Group=nogroup
EnvironmentFile=/var/lwp/release/spm.env
WorkingDirectory=/var/lwp/spm-dashboard/

[Install]
WantedBy=multi-user.target
`;
    fs.writeFileSync(
        'release/spm.env',
        `
    PATH=/usr/bin:/usr/local/bin
    PGHOST=${pghost}
    PGPORT=${pgport}
    PGDATABASE=${pgdatabase}
    PGAPPUSER=${pgappuser}
    PGAPPPASSWORD="${pgapppassword}"
    NEXT_PUBLIC_COOKIE_DOMAIN=${cookieDomain}
    NEXT_PUBLIC_LWP_ENV=${lwpEnv}
    HOSTED_URL=${hostedUrl}
    LWP_JWT_SECRET=${jwtSecret}
    `,
    );
    fs.writeFileSync('release/lwp_spm.service', data);
}

writeFrontendService();
writeBackendService();
writeNotificationService();
writeAnalyticsService();
writeSpmService();
