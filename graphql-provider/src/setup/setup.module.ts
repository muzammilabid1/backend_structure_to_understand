import { Module } from '@nestjs/common';
import { ConfigModule } from 'nestjs-config';
import * as path from 'path';

@Module({
    imports: [ConfigModule.load(path.resolve(__dirname, '../config', '**/!(*.d).{ts,js}'))],
    providers: [],
    exports: []
})
export class SetupModule {}
