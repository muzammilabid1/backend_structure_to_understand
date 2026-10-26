const publishSourcemap = require('@newrelic/publish-sourcemap').publishSourcemap;
const fg = require('fast-glob');
const fs = require('fs');
const child = require('child_process');

if (!process.env.NR_SOURCE_MAPS_KEY) {
    console.error('No source maps API key defined - not uploading');
    process.exit();
}

const sourcemaps = fg.sync(['.next/static/**/*.js.map'], { dot: false, onlyFiles: true, unique: true });
const commitID = child.execSync('git rev-parse HEAD').toString().trim();
const urlNoTrailingSlash = process.env.HOSTED_URL.replace(/\/$/, '');

for (const sourcemap of sourcemaps) {
    publishSourcemap(
        {
            sourcemapPath: sourcemap,
            javascriptUrl: `${urlNoTrailingSlash}/_next/static/${encodeURI(sourcemap.replace('.map', '').replace('.next/static/', ''))}`,
            applicationId: process.env.NEXT_PUBLIC_NR_APP_ID,
            apiKey: process.env.NR_SOURCE_MAPS_KEY,
            repoUrl: 'https://github.com/learningwithparents/platform',
            buildCommit: commitID,
            sourcemapUploadHost: 'https://sourcemaps.service.eu.newrelic.com'
        },
        function (err) {
            console.log(err || 'Source map upload done');
            fs.rmSync(sourcemap);
        }
    );
}
