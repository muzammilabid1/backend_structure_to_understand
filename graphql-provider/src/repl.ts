import { repl } from '@nestjs/core';

import { AppModule } from './app.module';

/*
 * repl.ts is to be used as a read-execute-print-loop for debugging purposes.
 * To call it, run `npx dotenv yarn workspace graphql-provider start -- --entryFile repl`
 */

process.env.ALLOW_SCHEDULING = 'false';
process.env.REPL = 'true';
process.env.RECAPTCHA_SECRET_KEY ||= 'none';

async function bootstrap(): Promise<void> {
    await repl(AppModule);
}

void bootstrap();
