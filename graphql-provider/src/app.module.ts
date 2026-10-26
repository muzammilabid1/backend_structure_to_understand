import { Module } from '@nestjs/common';

import { BootstrapModule } from './setup/bootstrap.module';

@Module({
    imports: [BootstrapModule],
    controllers: [],
    providers: []
})
export class AppModule {}
