export default {
    regular: {
        cronTime: process.env.REGULAR_CRON_JOBS_CRON_TIME || '0 */10 * * * *'
    },
    daily: {
        cronTime: process.env.DAILY_CRON_JOBS_CRON_TIME || '0 0 2 * * *'
    }
};
