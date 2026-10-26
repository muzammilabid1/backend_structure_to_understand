import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from 'nestjs-config';
import { NestMinioModule } from 'nestjs-minio';

@Module({
    imports: [
        NestMinioModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            // eslint-disable-next-line @typescript-eslint/require-await
            useFactory: async (configService: ConfigService) => {
                const props = {
                    endPoint: configService.get('media.minio_host'),
                    region: configService.get('media.minio_region'),
                    port: configService.get('media.minio_port'),
                    useSSL: configService.get('server.minioUserAws'),
                    accessKey: configService.get('media.minio_key'),
                    secretKey: configService.get('media.minio_secret')
                };

                return props;
            }
        })
    ],
    controllers: [],
    providers: []
})
export class MinioModule {}
