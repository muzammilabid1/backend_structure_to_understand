const readingAsASubjectId = '0';
const readingAsASubjectName = 'Reading';

const env = process.env.NEXT_PUBLIC_LWP_ENV || 'local';

const ACCESS_TOKEN_COOKIE =
    env === 'production' ? 'lwp_access_token' : `${env}_access_token`;
const REFRESH_TOKEN_COOKIE =
    env === 'production' ? 'lwp_refresh_token' : `${env}_refresh_token`;

export {
    readingAsASubjectId,
    readingAsASubjectName,
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
};

export * from './announcementPages';
