import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { MINIO_CONNECTION, type NestMinioService } from 'nestjs-minio';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { FileUploadToken } from 'src/auth/types/FileUploadToken';
import { TokenType } from 'src/auth/types/TokenType';
import media from 'src/config/media';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { PresignedUrlOutput } from '../dtos/PresignedUrlOutput';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupilFeedbackMedia } from '../entities/lwp_pupil_feedback_media';
import { LwpUser } from '../entities/user';
import { FeedbackType, MediaType, OperationStatus } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class LwpPupilFeedbackMediaService {
    constructor(
        @Inject(MINIO_CONNECTION) private readonly minioClient: ReturnType<NestMinioService['getMinio']>,
        @InjectRepository(LwpPupilFeedbackMedia)
        private pupilFeedbackMediaRepository: Repository<LwpPupilFeedbackMedia>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService,
        private jwtService: JwtService
    ) {}

    /**
     * Generates a unique object name based on the current timestamp, media type, and file extension.
     * @param fileName The original file name.
     * @param mediaType The type of media.
     * @returns A unique object name string.
     */
    private generateObjectName(fileName: string, mediaType: MediaType): string {
        const extension = fileName.split('.').pop();
        const timestamp = new Date().getTime();

        // Determine the file extension based on media type
        const fileExtension = mediaType === MediaType.AUDIO ? '.mp3' : extension ? `.${extension}` : '';

        return `${timestamp}${fileExtension}`;
    }

    /**
     * Gets a presigned URL for feedback media to be uploaded to.
     * @param fileName The source file name for the upload.
     * @param feedbackType The type of feedback that the upload is for
     * @param mediaType The type of media that the upload is going to be
     * @param userId The ID of the user who is requesting this URL.
     * @returns The presigned URL for the browser to upload to
     */
    public async getFeedbackMediaPresignedUrl(
        fileName: string,
        feedbackType: FeedbackType,
        mediaType: MediaType,
        userId: string
    ): Promise<PresignedUrlOutput> {
        const objectName = this.generateObjectName(fileName, mediaType);

        // 10 minute expiry for the PutObject URLs. It shouldn't take longer than that!
        return {
            url: await this.minioClient.presignedPutObject(
                media.bucket_usermedia,
                this.getMediaPath(objectName, mediaType, feedbackType),
                60 * 10
            ),
            token: this.jwtService.sign(new FileUploadToken(objectName).toPayload(), { subject: userId })
        };
    }

    /**
     * createFeedbackMediaFromToken takes a {@link FileUploadToken} as a JWT,
     * validates it, checks that the underlying file has been uploaded,
     * and then adds it as LwpPupilFeedbackMedia into the database.
     *
     * @param {string} token a serialised FileUploadToken
     * @param {MediaType} mediaType the type of media in use
     * @param {LwpPupilFeedback} feedback the feedback to attach to
     * @param {(string | LwpUser)} user a reference to the user that created it
     * @return {Promise<void>}
     * @memberof LwpPupilFeedbackMediaService
     */
    public async createFeedbackMediaFromToken(
        token: string,
        mediaType: MediaType,
        feedback: LwpPupilFeedback,
        user: string | LwpUser
    ): Promise<void> {
        const objectToken = this.jwtService.verify<FileUploadToken>(token, { subject: user['id'] ?? user });

        if (objectToken.tokenType !== TokenType.FileUpload) throw new UnauthorizedException('Incorrect file token type');

        return new Promise((res, rej) => {
            this.minioClient
                .statObject(media.bucket_usermedia, this.getMediaPath(objectToken.filename, mediaType, feedback.type))
                .then(() => {
                    const feedbackMedia = new LwpPupilFeedbackMedia();

                    feedbackMedia.feedback = feedback;
                    feedbackMedia.filename = objectToken.filename;
                    feedbackMedia.type = mediaType;

                    const shallowUser = this.shallowUserService.newShallowUser(user);

                    feedbackMedia.logCreatedBy = shallowUser;
                    feedbackMedia.logUpdatedBy = shallowUser;

                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.pupilFeedbackMediaRepository.save(feedbackMedia).then(() => res());
                })
                .catch((e) => rej(e));
        });
    }

    public async addFeedbackMedia(
        files: FileUpload[],
        mediaType: MediaType,
        minioPath: string,
        feedback: LwpPupilFeedback,
        user: string | LwpUser
    ): Promise<void> {
        const fileUploads = await Promise.all(files);

        for (const fileUpload of fileUploads) {
            const filename = this.generateObjectName(fileUpload?.filename, mediaType);

            const feedbackMedia = new LwpPupilFeedbackMedia();

            feedbackMedia.feedback = feedback;
            feedbackMedia.filename = filename;
            feedbackMedia.type = mediaType;

            const shallowUser = this.shallowUserService.newShallowUser(user);

            feedbackMedia.logCreatedBy = shallowUser;
            feedbackMedia.logUpdatedBy = shallowUser;

            await this.helperService.uploadFile(`${minioPath}/${filename}`, fileUpload);

            await this.pupilFeedbackMediaRepository.save(feedbackMedia);
        }
    }

    public async deleteFeedbackMedia(filename: string, minioPath: string): Promise<OperationStatus> {
        await this.helperService.removeFile(`${minioPath}/${filename}`, false);
        const res = await this.pupilFeedbackMediaRepository.delete({ filename });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async deleteMediaOfFeedback(feedbackId: string): Promise<void> {
        const feedbackMediaList = await this.pupilFeedbackMediaRepository
            .createQueryBuilder('feedbackMedia')
            .leftJoinAndSelect('feedbackMedia.feedback', 'feedback')
            .where('feedback.id = :feedbackId', { feedbackId })
            .getMany();

        if (feedbackMediaList?.length > 0) {
            for (const feedbackMedia of feedbackMediaList) {
                await this.helperService.removeFile(`${this.getMediaPath(feedbackMedia?.filename, feedbackMedia.type)}`, false);
                await this.pupilFeedbackMediaRepository.delete({ id: feedbackMedia?.id });
            }
        }
    }

    public async checkForExistingFile(feedbackId: string, mediaType: MediaType, feedbackType?: FeedbackType): Promise<void> {
        const feedbackMedias = await this.pupilFeedbackMediaRepository.find({ where: { feedback: { id: feedbackId }, type: mediaType } });

        if (feedbackMedias?.length > 0) {
            for (const feedbackMedia of feedbackMedias) {
                await this.helperService.removeFile(
                    `${this.getMediaPath(feedbackMedia?.filename, feedbackMedia?.type, feedbackType)}`,
                    false
                );
                await this.pupilFeedbackMediaRepository.delete({ filename: feedbackMedia?.filename });
            }
        }
    }

    public getMediaPath(filename: string, mediaType: MediaType, feedbackType?: FeedbackType): string {
        if (feedbackType === FeedbackType.ACTIVITY) {
            return `${appConstants.minioPaths.usermedia.uploadedImages}/${filename}`;
        }

        if (feedbackType === FeedbackType.SCRAPBOOK) {
            if (mediaType === MediaType.AUDIO) {
                return `${appConstants.minioPaths.usermedia.uploadedScrapbookAudio}/${filename}`;
            }

            return `${appConstants.minioPaths.usermedia.uploadedScrapbookImages}/${filename}`;
        }

        if (mediaType === MediaType.AUDIO) {
            return `${appConstants.minioPaths.usermedia.uploadedReadingAudio}/${filename}`;
        }

        return `${appConstants.minioPaths.usermedia.uploadedReadingImages}/${filename}`;
    }
}
