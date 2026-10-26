/* eslint-disable @typescript-eslint/no-floating-promises */
import { Controller, Get, HttpException, HttpStatus, Inject, Param, Redirect } from '@nestjs/common';
import { MINIO_CONNECTION } from 'nestjs-minio';
import newrelic from 'newrelic/index';
import { combineLatest, lastValueFrom } from 'rxjs';
import sharp from 'sharp';
import { ErrorStatusCodeEnum, PupilMathscotsCharacter } from 'src/api/model';
import { HelperService } from 'src/api/service/helper.service';
import { MathscotItemService } from 'src/api/service/mathscot-item.service';
import { Public } from 'src/auth/auth.object.decorators';
import media from 'src/config/media';
import { appConstants } from 'src/constants';

@Controller('mathscots')
export class MathscotsController {
    constructor(
        private helperService: HelperService,
        @Inject(MINIO_CONNECTION) private readonly minioClient,
        private mathscotItemService: MathscotItemService
    ) {}

    @Get(':ref')
    @Redirect()
    @Public()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(@Param('ref') mathscotRef: string): Promise<{ url: string; statusCode?: number } | { error: string; bufferData: any }> {
        const storagePath = `${appConstants.minioPaths.public.generatedMathscotImages}/${mathscotRef}`;
        const sourceUrl = this.helperService.getPublicUrl(storagePath);
        const fileExists = await this.mathscotItemService.checkFileExists(sourceUrl);

        if (!fileExists) {
            const splitRef = mathscotRef.split('_');

            // just give us id,id,CHARACTER,COLOUR,size without .png
            const lastWithFileExt = splitRef.pop().split('.');

            splitRef.push(lastWithFileExt[0]);
            const fileExt = '.' + (lastWithFileExt[1] || 'png');

            const character = PupilMathscotsCharacter[splitRef[splitRef.length - 3]];

            if (!character) throw new HttpException(`Invalid character type ${splitRef[splitRef.length - 3]}`, ErrorStatusCodeEnum._535);

            const colour = splitRef[splitRef.length - 2];

            // we're generating a proper mathscot image!
            const childMathscotWithZIndex = {
                imagePath: `${colour}${fileExt}`,
                character: character,
                colour: colour,
                zIndex: 1
            };

            const items = await this.mathscotItemService.validateGetItems(splitRef.slice(0, -3));
            const toBeBuffered = [childMathscotWithZIndex, ...items].sort(
                (a, b) => this.zIndexToInt(a.zIndex) - this.zIndexToInt(b.zIndex)
            );

            const bufferData = combineLatest(
                toBeBuffered
                    .map(({ imagePath }) => this.mathscotItemService.getChildMathscotImagePathUrl(character, imagePath))
                    .map((i) => this.mathscotItemService.getBufferFromUrl(i))
            );

            await lastValueFrom(bufferData).then(async (values) => {
                const [main, ...rest] = values.map((d) => d.data);
                const sharpData = rest.map((d) => ({ input: d }));
                const size = parseInt(splitRef.at(-1));
                const imageBuffer = await sharp(main)
                    .composite(sharpData)
                    .toBuffer()
                    .then((sharpBuffer) => sharp(sharpBuffer).resize(size, size).png().toBuffer());

                if (imageBuffer.byteLength == 0)
                    throw new HttpException('Generated a mathscot image with zero length', HttpStatus.INTERNAL_SERVER_ERROR);

                let putSuccessfully = false;

                for (let i = 0; i < 5; i++) {
                    if (await this.tryPutObjectWithTimeout(i * 20, storagePath, imageBuffer)) {
                        putSuccessfully = true;
                        break;
                    }
                }

                if (!putSuccessfully) throw new HttpException('All attempts to put object failed', HttpStatus.INTERNAL_SERVER_ERROR);
            });
        }

        return { url: sourceUrl };
    }

    private zIndexToInt(zIndex: string | number): number {
        if (typeof zIndex === 'string') {
            return parseInt(zIndex);
        } else {
            return zIndex;
        }
    }

    private async tryPutObjectWithTimeout(timeout: number, storagePath: string, imageBuffer: Buffer): Promise<boolean> {
        const client = this.minioClient;

        return new Promise<boolean>(function (resolve) {
            new Promise((resTimeout) => setTimeout(resTimeout, timeout)).then(async () => {
                await new Promise((res, rej) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    client.putObject(media.bucket_public, storagePath, imageBuffer, (e: any, d: string) => (e ? rej(e) : res(d)))
                )
                    .then(() => resolve(true))
                    .catch((err) => {
                        newrelic.noticeError(err, { caught: true, handled: true, storagePath: storagePath }, true);
                        console.log(err);
                        resolve(false);
                    });
            });
        });
    }
}
