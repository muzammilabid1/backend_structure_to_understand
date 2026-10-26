import { NestFactory } from '@nestjs/core';
import fg from 'fast-glob';
import { readFileSync } from 'fs';
import { StaticLwpDataQuery } from 'src/api/entities/static_lwp_data_query';
import { LwpStaticDataQueryType, LwpStaticQueryCatergory, LwpStaticQueryStatus } from 'src/api/model';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

async function bootstrap(): Promise<void> {
    process.env.ALLOW_SCHEDULING = 'false';

    const app = await NestFactory.createApplicationContext(BaseModule);
    const lwpDataQueryRepository = app.get(Connection).getRepository(StaticLwpDataQuery);

    const queryFiles = await fg(['../data-queries/(ADMIN|LEADER)/**/*.sql']);

    for (const filepath of queryFiles) {
        console.log(`Importing query from ${filepath}...`);
        const splitPath = filepath.replace('../', '').split('/');

        const type = splitPath[1] as LwpStaticDataQueryType;
        let category: LwpStaticQueryCatergory;

        if (splitPath.length === 3 && Object.keys(LwpStaticQueryCatergory).includes(splitPath[2])) {
            category = splitPath[2] as LwpStaticQueryCatergory;
        }

        await lwpDataQueryRepository
            .save(
                lwpDataQueryRepository.create({
                    type,
                    category,
                    query: readFileSync(filepath, 'utf8'),
                    name: splitPath[splitPath.length - 1].replace('.sql', ''),
                    order: 1,
                    status: LwpStaticQueryStatus.PUBLISHED
                })
            )
            .catch((error) => {
                console.error(`Failed to import query ${splitPath[splitPath.length - 1]} with error ${error} - moving on`);
            });
    }

    process.exit(0);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
