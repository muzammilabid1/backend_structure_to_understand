import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { MINIO_CONNECTION } from 'nestjs-minio';
import { Public } from 'src/auth/auth.object.decorators';
import { Connection } from 'typeorm';
@Controller('/health')
export class HealthController {
    constructor(
        private connection: Connection,
        @Inject(MINIO_CONNECTION) private readonly minioClient
    ) {}

    @Get()
    @Public()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getStatus(@Res() res: any): Promise<any> {
        let dbUsers = null;
        const buckets = [process.env.PUBLIC_BUCKET_NAME, process.env.MEDIA_BUCKET_NAME];

        return this.connection
            .query('select count(*) from user')
            .then((r) => {
                dbUsers = r[0]['count'];

                return Promise.all(buckets.map((bucketName) => this.minioClient.bucketExists(bucketName)));
            })
            .then((bucketExists) => {
                bucketExists.map((isExist, i) => {
                    if (!isExist)
                        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ message: `${buckets[i]} bucket does not exist.` });
                });

                return res
                    .status(HttpStatus.OK)
                    .json({ message: `ok. There are ${dbUsers} records in user table and ${bucketExists.length} buckets in minio.` });
            })
            .catch((e) => {
                return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ message: e.message ?? 'something went wrong.' });
            });
    }
}
