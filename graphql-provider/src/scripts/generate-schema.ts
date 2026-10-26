import { spawn } from 'node:child_process';

import { Client } from 'pg';

async function bootstrap(): Promise<void> {
    const cOpts = {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT, 10),
        user: process.env.PGSUPERUSER,
        password: process.env.PGSUPERPASSWORD
    };

    const client = new Client(cOpts);

    await client.connect();

    const tempDBName = `tempdb_schemacheck_${process.env.DBDISAMBIG}`;

    process.env.TEMPSCHEMADB = tempDBName;

    const yarnExe = spawn('yarn', ['run', 'typeorm', 'migration:run', '-c', 'Superuser'], {
        env: {
            PATH: process.env.PATH,
            PGHOST: cOpts.host,
            PGPORT: cOpts.port.toString(),
            PGSUPERUSER: cOpts.user,
            PGSUPERPASSWORD: cOpts.password,
            PGDATABASE: tempDBName,
            NOAPPCONNECTIONS: 'true'
        }
    });

    yarnExe.stderr.pipe(process.stderr);

    yarnExe.on('close', (code) => {
        if (code !== 0) process.exit(code);

        const dumpExe = spawn('pg_dump', [tempDBName], {
            env: {
                PATH: process.env.PATH,
                PGHOST: cOpts.host,
                PGPORT: cOpts.port.toString(),
                PGUSER: cOpts.user,
                PGPASSWORD: cOpts.password
            }
        });

        dumpExe.stdout.pipe(process.stdout);

        dumpExe.stderr.pipe(process.stderr);

        dumpExe.on('close', (code) => {
            void client
                .query(
                    `DROP SCHEMA public CASCADE;
                     CREATE SCHEMA public;
                     GRANT ALL ON SCHEMA public TO postgres;
                     GRANT ALL ON SCHEMA public TO public;`
                )
                .then(() => process.exit(code));
        });
    });
}

void bootstrap();
