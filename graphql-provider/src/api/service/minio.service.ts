import { Inject, Injectable } from '@nestjs/common';
import { MINIO_CONNECTION, NestMinioService } from 'nestjs-minio';
import media from 'src/config/media';
import { appConstants } from 'src/constants';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
    constructor(@Inject(MINIO_CONNECTION) private readonly minioClient: ReturnType<NestMinioService['getMinio']>) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async uploadPrivateFile(fileName: string, stream: any): Promise<ReturnType<ReturnType<NestMinioService['getMinio']>['putObject']>> {
        return this.minioClient.putObject(media.bucket_usermedia, fileName, stream);
    }

    async uploadPublicFile(
        fileName: string,
        stream: Readable | Buffer
    ): Promise<ReturnType<ReturnType<NestMinioService['getMinio']>['putObject']>> {
        return this.minioClient.putObject(media.bucket_public, fileName, stream);
    }

    async presignedGetObject(partialUrl: string): Promise<string> {
        return this.minioClient.presignedGetObject(media.bucket_usermedia, partialUrl, appConstants.media.presignedDurationInMins * 60);
    }
}
