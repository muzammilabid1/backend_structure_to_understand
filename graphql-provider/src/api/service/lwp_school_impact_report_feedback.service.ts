import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';
import { FileUploadToken } from 'src/auth/types/FileUploadToken';
import { appConstants } from 'src/constants';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { LwpSchoolImpactReport } from '../entities/lwp_school_impact_report';
import { LwpSchoolImpactReportFeedback } from '../entities/lwp_school_impact_report_feedback';
import { LwpUser } from '../entities/user';
import { FeedbackType, MediaType, SchoolClassStatus } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class LwpSchoolImpactReportFeedbackService {
    constructor(
        @InjectRepository(LwpSchoolImpactReportFeedback)
        private schoolImpactReportFeedbackRepository: Repository<LwpSchoolImpactReportFeedback>,
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        private helperService: HelperService
    ) {}

    public async addFeedbacksToImpactReport(
        impactReportId: string,
        termId: string,
        schoolId: string,
        periodIndex: number,
        createdBy: LwpUser,
        manager: EntityManager
    ): Promise<void> {
        const pupilFeedbacks = await manager
            .getRepository(LwpPupilFeedback)
            .createQueryBuilder('pf')
            .innerJoin(LwpSchoolDates, 'term', 'term.id = :termId', { termId })
            .leftJoin('pf.media', 'media', 'media.type = :photoType', { photoType: MediaType.PHOTO })
            .leftJoin('pf.pupils', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('pupil.classes', 'schoolClass')
            .leftJoin('schoolClass.yearGroup', 'schoolClassYearGroup')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('CAST(pf.logCreatedAt AS DATE) BETWEEN term.startDate AND term.endDate') // using CAST to remove timestamp from pf.logCreatedAt
            .andWhere(
                'schoolClass.isRegistrationClass = true AND schoolClass.status = :status AND schoolClass.periodIndex = :periodIndex',
                {
                    status: SchoolClassStatus.ACTIVE,
                    periodIndex
                }
            )
            .andWhere(
                new Brackets((qb) => {
                    qb.where(`pf.includePhotoInImpactReport = :includePhotoInImpactReport`, { includePhotoInImpactReport: true })
                        .orWhere(`pf.includeParentCommentInImpactReport = :includeParentCommentInImpactReport`, {
                            includeParentCommentInImpactReport: true
                        })
                        .orWhere(`pf.includePupilCommentInImpactReport = :includePupilCommentInImpactReport`, {
                            includePupilCommentInImpactReport: true
                        })
                        .orWhere(`pf.includeReadingCommentInImpactReport = :includeReadingCommentInImpactReport`, {
                            includeReadingCommentInImpactReport: true
                        });
                })
            )
            .distinctOn(['pf.id'])
            .select([
                `pf.id AS "pupilFeedbackId"`,
                `pf.type AS "pupilFeedbackType"`,
                `media.filename AS "filename"`,
                `pf.comment AS "readingComment"`,
                `pf.parentComment AS "parentComment"`,
                `pf.pupilComment AS "pupilComment"`,
                'pupil.firstname AS "pupilFirstName"',
                'schoolClassYearGroup.year AS "schoolClassYearGroup"',
                'schoolClass.name AS "schoolClassName"',
                'pf.includePhotoInImpactReport AS "includePhotoInImpactReport"',
                'pf.includeParentCommentInImpactReport AS "includeParentCommentInImpactReport"',
                'pf.includePupilCommentInImpactReport AS "includePupilCommentInImpactReport"',
                'pf.includeReadingCommentInImpactReport AS "includeReadingCommentInImpactReport"'
            ])
            .getRawMany<{
                pupilFeedbackId: string;
                pupilFeedbackType: FeedbackType;
                filename: string;
                readingComment: string;
                pupilComment: string;
                parentComment: string;
                pupilFirstName: string;
                schoolClassYearGroup: string;
                schoolClassName: string;
                includePhotoInImpactReport: boolean;
                includeParentCommentInImpactReport: boolean;
                includePupilCommentInImpactReport: boolean;
                includeReadingCommentInImpactReport: boolean;
            }>();

        if (!pupilFeedbacks.length) return;

        for (const pupilFeedback of pupilFeedbacks) {
            if (pupilFeedback?.includePhotoInImpactReport && pupilFeedback?.filename) {
                const folderPath =
                    pupilFeedback.pupilFeedbackType === FeedbackType.READING
                        ? appConstants.minioPaths.usermedia.uploadedReadingImages
                        : appConstants.minioPaths.usermedia.uploadedImages;

                const newFilename = await this.helperService.duplicateFile(
                    folderPath,
                    pupilFeedback?.filename,
                    `impact_report_${periodIndex}_${this.helperService.getNewFileName(pupilFeedback?.filename)}`,
                    false,
                    appConstants.minioPaths.usermedia.schoolImpactReportPhotos
                );

                await manager.getRepository(LwpSchoolImpactReportFeedback).save({
                    impactReport: { id: impactReportId } as LwpSchoolImpactReport,
                    pupilFeedback: { id: pupilFeedback?.pupilFeedbackId } as LwpPupilFeedback,
                    content: newFilename,
                    contentType: SchoolImpactReportFeedbackContentType.PHOTO,
                    pupilFirstName: pupilFeedback.pupilFirstName,
                    className: pupilFeedback.schoolClassName,
                    classYearGroup: pupilFeedback.schoolClassYearGroup,
                    includedInImpactReport: false,
                    logCreatedBy: createdBy,
                    logUpdatedBy: createdBy
                });
            }

            if (pupilFeedback?.includeReadingCommentInImpactReport && pupilFeedback?.readingComment) {
                await manager.getRepository(LwpSchoolImpactReportFeedback).save({
                    impactReport: { id: impactReportId } as LwpSchoolImpactReport,
                    pupilFeedback: { id: pupilFeedback?.pupilFeedbackId } as LwpPupilFeedback,
                    content: pupilFeedback?.readingComment,
                    contentType: SchoolImpactReportFeedbackContentType.READING_COMMENT,
                    pupilFirstName: pupilFeedback.pupilFirstName,
                    className: pupilFeedback.schoolClassName,
                    includedInImpactReport: false,
                    classYearGroup: pupilFeedback.schoolClassYearGroup,
                    logCreatedBy: createdBy,
                    logUpdatedBy: createdBy
                });
            }

            if (pupilFeedback?.includeParentCommentInImpactReport && pupilFeedback?.parentComment) {
                await manager.getRepository(LwpSchoolImpactReportFeedback).save({
                    impactReport: { id: impactReportId } as LwpSchoolImpactReport,
                    pupilFeedback: { id: pupilFeedback?.pupilFeedbackId } as LwpPupilFeedback,
                    content: pupilFeedback?.parentComment,
                    contentType: SchoolImpactReportFeedbackContentType.PARENT_COMMENT,
                    pupilFirstName: pupilFeedback.pupilFirstName,
                    className: pupilFeedback.schoolClassName,
                    includedInImpactReport: false,
                    classYearGroup: pupilFeedback.schoolClassYearGroup,
                    logCreatedBy: createdBy,
                    logUpdatedBy: createdBy
                });
            }

            if (pupilFeedback?.includePupilCommentInImpactReport && pupilFeedback?.pupilComment) {
                await manager.getRepository(LwpSchoolImpactReportFeedback).save({
                    impactReport: { id: impactReportId } as LwpSchoolImpactReport,
                    pupilFeedback: { id: pupilFeedback?.pupilFeedbackId } as LwpPupilFeedback,
                    content: pupilFeedback?.pupilComment,
                    contentType: SchoolImpactReportFeedbackContentType.PUPIL_COMMENT,
                    pupilFirstName: pupilFeedback.pupilFirstName,
                    className: pupilFeedback.schoolClassName,
                    includedInImpactReport: false,
                    classYearGroup: pupilFeedback.schoolClassYearGroup,
                    logCreatedBy: createdBy,
                    logUpdatedBy: createdBy
                });
            }
        }
    }

    async updatePupilFeedbackImpactReportContext(
        pupilFeedbackId: string,
        include: boolean,
        contentType: SchoolImpactReportFeedbackContentType
    ): Promise<void> {
        const contentTypeMap = {
            [SchoolImpactReportFeedbackContentType.PHOTO]: { includePhotoInImpactReport: include },
            [SchoolImpactReportFeedbackContentType.READING_COMMENT]: { includeReadingCommentInImpactReport: include },
            [SchoolImpactReportFeedbackContentType.PUPIL_COMMENT]: { includePupilCommentInImpactReport: include },
            [SchoolImpactReportFeedbackContentType.PARENT_COMMENT]: { includeParentCommentInImpactReport: include }
        };

        const contentTypeKey: QueryDeepPartialEntity<LwpPupilFeedback> = contentTypeMap[contentType];

        await this.pupilFeedbackRepository.update({ id: pupilFeedbackId }, contentTypeKey);
    }

    async updateSchoolImpactReportFeedback(id: string, content: string): Promise<void> {
        await this.schoolImpactReportFeedbackRepository.update({ id }, { content });
    }

    async deleteSchoolImpactReportFeedback(id: string): Promise<void> {
        const contentTypeMap = {
            [SchoolImpactReportFeedbackContentType.PHOTO]: { includePhotoInImpactReport: false },
            [SchoolImpactReportFeedbackContentType.READING_COMMENT]: { includeReadingCommentInImpactReport: false },
            [SchoolImpactReportFeedbackContentType.PUPIL_COMMENT]: { includePupilCommentInImpactReport: false },
            [SchoolImpactReportFeedbackContentType.PARENT_COMMENT]: { includeParentCommentInImpactReport: false }
        };

        const feedback = await this.schoolImpactReportFeedbackRepository
            .createQueryBuilder('feedback')
            .where('feedback.id = :id', { id })
            .select([
                'feedback.id as "feedbackId"',
                'feedback.pupilFeedbackId as "pupilFeedbackId"',
                'feedback.contentType as "contentType"'
            ])
            .getRawOne<{ feedbackId: string; pupilFeedbackId: string; contentType: SchoolImpactReportFeedbackContentType }>();

        if (!feedback?.feedbackId) return;

        const contentTypeKey: QueryDeepPartialEntity<LwpPupilFeedback> = contentTypeMap[feedback.contentType];

        await this.pupilFeedbackRepository.update({ id: feedback?.pupilFeedbackId }, contentTypeKey);

        await this.schoolImpactReportFeedbackRepository.delete(feedback.feedbackId);
    }

    async updateSchoolImpactReportFeedbackPhoto(id: string, file: FileUploadToken): Promise<void> {
        const feedback = await this.schoolImpactReportFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.impactReport', 'impactReport')
            .leftJoin('impactReport.period', 'period')
            .where('feedback.id = :feedbackId', { feedbackId: id })
            .select(['feedback.content AS "content"', 'period.index as "periodIndex"'])
            .getRawOne<{ content: string; periodIndex: number }>();

        try {
            await this.helperService.removeFile(`${appConstants.minioPaths.usermedia.schoolImpactReportPhotos}/${feedback.content}`, false);
            const filename = `${`impact_report_${feedback?.periodIndex}_${new Date().getTime()}`}.png`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.usermedia.schoolImpactReportPhotos}/${filename}`, file, false);

            await this.schoolImpactReportFeedbackRepository.update({ id }, { content: filename });
        } catch (error) {
            console.log('ERROR', error);
        }
    }

    public async getImpactReportFeedbacks(impactReportId: string): Promise<LwpSchoolImpactReportFeedback[]> {
        return await this.schoolImpactReportFeedbackRepository.find({
            where: { impactReport: { id: impactReportId } },
            order: { logCreatedAt: 'ASC' }
        });
    }

    async deleteImpactReportFeedbacks(impactReportId: string): Promise<void> {
        const feedbacks = await this.schoolImpactReportFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.impactReport', 'impactReport')
            .where('impactReport.id = :impactReportId', { impactReportId })
            .andWhere('feedback.contentType = :contentType', { contentType: SchoolImpactReportFeedbackContentType.PHOTO })
            .select(['feedback.content as "content"'])
            .getRawMany<{ content: string }>();

        for (const feedback of feedbacks) {
            await this.helperService.removeFile(`${appConstants.minioPaths.usermedia.schoolImpactReportPhotos}/${feedback.content}`, false);
        }

        await this.schoolImpactReportFeedbackRepository.delete({ impactReport: { id: impactReportId } });
    }

    public async getFeedbackPhotoLink(feedbackId: string): Promise<string> {
        const feedbackPhoto = await this.schoolImpactReportFeedbackRepository
            .createQueryBuilder('feedback')
            .where('feedback.id = :id', { id: feedbackId })
            .select(['feedback.content AS "content"'])
            .getRawOne<{ content: string }>();

        if (!feedbackPhoto) return null;

        return await this.helperService.getUsermediaUrl(
            `${appConstants.minioPaths.usermedia.schoolImpactReportPhotos}/${feedbackPhoto.content}`,
            {
                cache: false
            }
        );
    }
}
