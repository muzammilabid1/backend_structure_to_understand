import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ormConfigs from 'src/ormconfig';
import { createConnection } from 'typeorm';

@Module({})
export class DatabaseOrmModule {
    static async registerAsync(): Promise<DynamicModule> {
        if (process.env.ORM_AUTO_MIGRATIONS === 'true') {
            // Force schema sync while we have the ability to run it.
            console.log('Creating superuser connection for migrations');
            await createConnection({ ...ormConfigs.find((cfg) => cfg.name == 'Superuser'), migrationsRun: true }).then(async (conn) => {
                console.log('Migrated and done; dropping superuser connection');
                await conn.close();
            });
        }

        return {
            module: DatabaseOrmModule,
            imports: ormConfigs.filter((cfg) => cfg.name != 'Superuser').map((cfg) => TypeOrmModule.forRoot(cfg))
        };
    }
}
