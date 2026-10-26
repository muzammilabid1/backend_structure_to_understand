/**
 * Based on script suggested at https://github.com/nestjs/nest-cli/issues/392#issuecomment-736073801.
 * The Nest CLI maintainers seem to have no interest in discussing fixing this - see https://github.com/nestjs/nest-cli/issues/2656
 */

import { exec } from 'child_process';
import { createRequire } from 'module';
import { resolve } from 'path';
import ts from 'typescript';

// shared imports the announcement page list this writes, so it has to exist before shared is compiled. The frontend and the
// backend both run this script from their own folder, one level below the repo root.
createRequire(import.meta.url)(resolve('../frontend/generate-announcement-pages.js')).generateAnnouncementPages();

const tsconfig = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const references = tsconfig.config.references;

references.forEach(({ path }) => {
    exec(`tsc --project ${path}`, () => {
        console.log(`BUILT REFERENCE: ${path}`);
    });
});
