import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { behaviour, ImageSourceType, PageAnnouncementStatus, PageAnnouncementUserOption, UserType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { FileUploadToken } from 'src/auth/types/FileUploadToken';
import { appConstants } from 'src/constants';
import { In, Repository, SelectQueryBuilder } from 'typeorm';

import { AllPageAnnouncementsForUserOutput } from '../dtos/AllPageAnnouncementsForUserOutput';
import { UserAnnouncementContextOutput } from '../dtos/UserAnnouncementContext';
import { StaticLwpPageAnnouncement } from '../entities/static_lwp_page_announcement';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';
import { AddPageAnnouncementInput, ErrorStatusCodeEnum, OperationStatus, UpdatePageAnnouncementInput } from '../model';
import { HelperService } from './helper.service';

type UserTypes = UserType.ADMIN | UserType.PARENT | UserType.TEACHER;

const { AnnouncementViewer, getAnnouncementViewer, getRoutesViewerCanSee } = behaviour.announcementPages;

// Keeps an announcement only if it is aimed at every page, or at a page this viewer can see (:viewerRoutes), so nobody
// gets one in their drawer or bell that could never show to them (see getRoutesViewerCanSee in lwp-shared).
const FOR_VIEWER = `(pa.targetPages = '[]'::jsonb OR pa.targetPages ?| CAST(:viewerRoutes AS text[]))`;

@Injectable()
export class StaticLwpPageAnnouncementService {
    userOption: { [key in UserTypes]: PageAnnouncementUserOption } = {
        ADMIN: PageAnnouncementUserOption.ADMIN,
        PARENT: PageAnnouncementUserOption.PARENT,
        TEACHER: PageAnnouncementUserOption.TEACHER
    };

    constructor(
        @InjectRepository(StaticLwpPageAnnouncement)
        private pageAnnouncementRepository: Repository<StaticLwpPageAnnouncement>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(StaticLwpSchoolTag)
        private schoolTagRepository: Repository<StaticLwpSchoolTag>,
        private shallowUserService: ShallowUserService,
        private helperService: HelperService
    ) {}

    public async getAllPageAnnouncements(): Promise<StaticLwpPageAnnouncement[]> {
        return await this.pageAnnouncementRepository.find({
            order: {
                logCreatedAt: 'DESC'
            }
        });
    }

    /** The announcements a logged-out user can get: aimed at everyone, and at every page or a page they can open. */
    public async getPageAnnouncementsForAllUsers(): Promise<StaticLwpPageAnnouncement[]> {
        return await this.pageAnnouncementRepository
            .createQueryBuilder('pa')
            .where(`pa.userOptions ? :option AND ${FOR_VIEWER}`, {
                option: PageAnnouncementUserOption.ALL_USERS,
                viewerRoutes: getRoutesViewerCanSee(AnnouncementViewer.LOGGED_OUT)
            })
            .orderBy('pa.priority', 'ASC')
            .getMany();
    }

    public getPageAnnouncementImageUrl(announcement: StaticLwpPageAnnouncement): string | null {
        if (!announcement?.imageUrl) return null;

        const imageUrlPath =
            announcement?.imageType === ImageSourceType.UPLOADED
                ? appConstants.minioPaths.public.uploadedPageAnnouncementIcons
                : appConstants.minioPaths.public.defaultPageAnnouncementIcons;

        return this.helperService.getPublicUrl(`${imageUrlPath}/${announcement?.imageUrl}`);
    }

    /**
     * Retrieves all page announcements visible to a specific user based on their user type and school associations.
     *
     * @param userId - The unique identifier of the user requesting page announcements
     * @returns Promise resolving to an array of StaticLwpPageAnnouncement objects, ordered by priority (ascending)
     * @throws HttpException with error code 535 if the user does not exist
     *
     * @description
     * This function implements a filtering logic to determine which page announcements a user should see.
     * The visibility rules are:
     *
     * 1. **ALL_USERS announcements**: Always visible to everyone regardless of user type or school
     *
     * 2. **User type matching with school filtering**:
     *    - If userOptions includes the user's type (or is empty) AND
     *    - schoolTags is empty OR the user belongs to one of the schools in schoolTags
     *
     * @remarks
     * School associations are determined differently based on user type:
     * - **TEACHER**: Associated through school.schoolLeaders relationship
     * - **PARENT/MAGICPARENT/TOPICACCESS**: Associated through school.pupils.parents relationship
     * - **Other user types**: No school filtering applied (only userOptions checked)
     */
    public getAllPageAnnouncementsForUserBaseQuery(
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean
    ): SelectQueryBuilder<StaticLwpPageAnnouncement> {
        const queryBuilder = this.pageAnnouncementRepository
            .createQueryBuilder('pa')
            .leftJoin('pa.schoolTags', 'pa_schoolTags')
            .leftJoin('pa_schoolTags.schoolAndTag', 'schoolAndTag')
            .leftJoin('schoolAndTag.school', 'school');

        const params = {
            allUsers: PageAnnouncementUserOption.ALL_USERS,
            userType: this.userOption[userType],
            schoolLeader: PageAnnouncementUserOption.SCHOOL_LEADER,
            viewerRoutes: getRoutesViewerCanSee(getAnnouncementViewer({ userType, isSchoolLeader })),
            userId
        };

        // School leaders are TEACHER users with isSchoolLeader = true. The TEACHER option targets
        // all teachers (including leaders), while SCHOOL_LEADER targets leaders only, so a leader
        // matches announcements aimed at either option.
        const isLeader = userType === UserType.TEACHER && isSchoolLeader;

        // Common SQL fragments
        const hasAllUsers = 'pa.userOptions ? :allUsers';
        const hasUserType = isLeader ? '(pa.userOptions ? :userType OR pa.userOptions ? :schoolLeader)' : 'pa.userOptions ? :userType';
        const emptyUserOptions = "pa.userOptions = '[]'::jsonb";
        const emptySchoolTags = 'NOT EXISTS (SELECT 1 FROM lwp_page_announcement_school_tags WHERE "staticLwpPageAnnouncementId" = pa.id)';

        if (userType === UserType.TEACHER) {
            queryBuilder.leftJoin('school.schoolLeaders', 'schoolLeaders').where(
                `
                ${FOR_VIEWER} AND (
                    ${hasAllUsers} OR
                    ((${hasUserType} OR ${emptyUserOptions}) AND (${emptySchoolTags} OR schoolLeaders.id = :userId))
                )
            `,
                params
            );
        } else if ([UserType.PARENT, UserType.MAGICPARENT, UserType.TOPICACCESS].includes(userType)) {
            queryBuilder
                .leftJoin('school.pupils', 'pupils')
                .leftJoin('pupils.parents', 'parentPupil')
                .leftJoin('parentPupil.parent', 'parent')
                .where(
                    `
                ${FOR_VIEWER} AND (
                    ${hasAllUsers} OR
                    ((${hasUserType} OR ${emptyUserOptions}) AND (${emptySchoolTags} OR parent.id = :userId))
                )
            `,
                    params
                );
        } else {
            queryBuilder.where(`${FOR_VIEWER} AND (${hasAllUsers} OR ${hasUserType})`, params);
        }

        return queryBuilder;
    }

    public async getAllPageAnnouncementsForUser(userId: string): Promise<AllPageAnnouncementsForUserOutput[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['type', 'isSchoolLeader']
        });

        if (!user) {
            throw new HttpException('User does not exist', ErrorStatusCodeEnum._535);
        }

        const announcements = await this.getAllPageAnnouncementsForUserBaseQuery(userId, user.type, user.isSchoolLeader)
            .select([
                'pa.id AS id',
                'pa.imageUrl AS "imageUrl"',
                'pa.message AS message',
                'pa.priority AS priority',
                'pa.imageType AS "imageType"',
                'pa.targetPages AS "targetPages"',
                'CASE WHEN EXISTS (SELECT 1 FROM lwp_user_page_announcement WHERE "pageAnnouncementId" = pa.id AND "userId" = :userId) THEN true ELSE false END AS "isSeenByUser"'
            ])
            .groupBy('pa.id')
            .addGroupBy('pa.imageUrl')
            .addGroupBy('pa.message')
            .addGroupBy('pa.priority')
            .addGroupBy('pa.imageType')
            .addGroupBy('pa.targetPages')
            .orderBy('pa.priority', 'ASC')
            .getRawMany();

        if (!announcements.length) return [];

        return announcements.map((a) => ({
            ...a,
            imageUrl: this.getPageAnnouncementImageUrl(a)
        }));
    }

    /**
     * Retrieves all unseen page announcements for a specific user.
     *
     * @param userId - The unique identifier of the user requesting page announcements
     * @returns Promise resolving to an array of StaticLwpPageAnnouncement objects that the user hasn't seen yet, ordered by priority (ascending)
     * @throws HttpException with error code 535 if the user does not exist
     *
     * @description
     * This function applies the same visibility rules as getAllPageAnnouncementsForUser but excludes
     * announcements that have already been seen by the user (tracked via lwp_user_page_announcement table).
     *
     * An announcement is considered "seen" if there exists a record in the lwp_user_page_announcement table
     * linking the user to that announcement.
     *
     * Visibility rules:
     * 1. **ALL_USERS announcements**: Always visible to everyone (if not seen)
     * 2. **User type matching with school filtering**:
     *    - If userOptions includes the user's type (or is empty) AND
     *    - schoolTags is empty OR the user belongs to one of the schools in schoolTags
     *
     * @remarks
     * This function is typically used to show new announcements to users
     */
    public getUnseenPageAnnouncementsForUserBaseQuery(
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean
    ): SelectQueryBuilder<StaticLwpPageAnnouncement> {
        const queryBuilder = this.pageAnnouncementRepository
            .createQueryBuilder('pa')
            .leftJoin('pa.schoolTags', 'pa_schoolTags')
            .leftJoin('pa_schoolTags.schoolAndTag', 'schoolAndTag')
            .leftJoin('schoolAndTag.school', 'school');

        const params = {
            allUsers: PageAnnouncementUserOption.ALL_USERS,
            userType: this.userOption[userType],
            schoolLeader: PageAnnouncementUserOption.SCHOOL_LEADER,
            viewerRoutes: getRoutesViewerCanSee(getAnnouncementViewer({ userType, isSchoolLeader })),
            userId
        };

        // School leaders are TEACHER users with isSchoolLeader = true. The TEACHER option targets
        // all teachers (including leaders), while SCHOOL_LEADER targets leaders only, so a leader
        // matches announcements aimed at either option.
        const isLeader = userType === UserType.TEACHER && isSchoolLeader;

        // Common SQL fragments
        const unseenCheck =
            'NOT EXISTS (SELECT 1 FROM lwp_user_page_announcement WHERE "pageAnnouncementId" = pa.id AND "userId" = :userId)';
        const hasAllUsers = 'pa.userOptions ? :allUsers';
        const hasUserType = isLeader ? '(pa.userOptions ? :userType OR pa.userOptions ? :schoolLeader)' : 'pa.userOptions ? :userType';
        const emptyUserOptions = "pa.userOptions = '[]'::jsonb";
        const emptySchoolTags = 'NOT EXISTS (SELECT 1 FROM lwp_page_announcement_school_tags WHERE "staticLwpPageAnnouncementId" = pa.id)';

        if (userType === UserType.TEACHER) {
            queryBuilder.leftJoin('school.schoolLeaders', 'schoolLeaders').where(
                `
                ${unseenCheck} AND ${FOR_VIEWER}
                AND (
                    ${hasAllUsers} OR
                    ((${hasUserType} OR ${emptyUserOptions}) AND (${emptySchoolTags} OR schoolLeaders.id = :userId))
                )
            `,
                params
            );
        } else if ([UserType.PARENT, UserType.MAGICPARENT, UserType.TOPICACCESS].includes(userType)) {
            queryBuilder
                .leftJoin('school.pupils', 'pupils')
                .leftJoin('pupils.parents', 'parentPupil')
                .leftJoin('parentPupil.parent', 'parent')
                .where(
                    `
                ${unseenCheck} AND ${FOR_VIEWER}
                AND (
                    ${hasAllUsers} OR
                    ((${hasUserType} OR ${emptyUserOptions}) AND (${emptySchoolTags} OR parent.id = :userId))
                )
            `,
                    params
                );
        } else {
            queryBuilder.where(`${unseenCheck} AND ${FOR_VIEWER} AND (${hasAllUsers} OR ${hasUserType})`, params);
        }

        return queryBuilder;
    }

    public async getUnseenPageAnnouncementsForUser(userId: string): Promise<StaticLwpPageAnnouncement[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['type', 'isSchoolLeader']
        });

        if (!user) {
            throw new HttpException('User does not exist', ErrorStatusCodeEnum._535);
        }

        return await this.getUnseenPageAnnouncementsForUserBaseQuery(userId, user.type, user.isSchoolLeader)
            .orderBy('pa.priority', 'ASC')
            .getMany();
    }

    public async getPageAnnouncement(id: string): Promise<StaticLwpPageAnnouncement> {
        const pageAnnouncement = await this.pageAnnouncementRepository.findOne({ where: { id } });

        if (!pageAnnouncement) throw new HttpException('Page announcement does not exist', ErrorStatusCodeEnum._535);

        return pageAnnouncement;
    }

    public async getSchoolTagsForPageAnnouncement(id: string): Promise<StaticLwpSchoolTag[]> {
        return await this.schoolTagRepository
            .createQueryBuilder('st')
            .leftJoin('st.staticPageAnnouncements', 'spa')
            .where('spa.id = :id', { id })
            .select(['st.id', 'st.name', 'st.color'])
            .getMany();
    }

    private async getSchoolTagsToAddForPageAnnouncement(schoolTagIds: string[]): Promise<StaticLwpSchoolTag[]> {
        if (schoolTagIds.length === 0) return [];

        return await this.schoolTagRepository.find({ where: { id: In(schoolTagIds) }, select: ['id'] });
    }

    /**
     * Checks every target page is in ANNOUNCEMENT_TARGET_PAGES and can be opened by one of the chosen user
     * options, so an announcement is never aimed at a page none of its users can see. Returns the pages without
     * duplicates; no pages means every page.
     */
    public validateTargetPages(targetPages: string[] | undefined, userOptions: PageAnnouncementUserOption[]): string[] {
        if (!targetPages?.length) return [];

        const reachableRoutes = behaviour.announcementPages.getPagesReachableBy(userOptions).map((page) => page.route);
        const invalidRoutes = targetPages.filter((route) => !reachableRoutes.includes(route));

        if (invalidRoutes.length) {
            throw new HttpException(
                `Invalid request: these pages cannot be targeted for the selected user types: ${invalidRoutes.join(', ')}`,
                ErrorStatusCodeEnum._535
            );
        }

        return [...new Set(targetPages)];
    }

    public async addPageAnnouncement(input: AddPageAnnouncementInput, userId: string, file?: FileUploadToken): Promise<boolean> {
        let imageUrl = null;
        const { title, message, userOptions, includeImage, imageUrl: preDefinedImageUrl, priority, targetPages } = input;
        const validTargetPages = this.validateTargetPages(targetPages, userOptions);
        const user = this.shallowUserService.newShallowUser(userId);
        let imageType = null;

        if (preDefinedImageUrl) {
            imageUrl = preDefinedImageUrl;
            imageType = ImageSourceType.PREDEFINED;
        } else if (file && file.filename) {
            const filename = `${new Date().getTime()}_${file?.filename}`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedPageAnnouncementIcons}/${filename}`, file, true);
            imageUrl = filename;
            imageType = ImageSourceType.UPLOADED;
        }

        const pageAnnouncement = this.pageAnnouncementRepository.create({
            userOptions,
            targetPages: validTargetPages,
            title,
            message,
            includeImage,
            priority,
            schoolTags: await this.getSchoolTagsToAddForPageAnnouncement(input.schoolTagIds),
            imageUrl,
            status: PageAnnouncementStatus.ACTIVE,
            logCreatedBy: user,
            logUpdatedBy: user,
            imageType
        });

        await this.pageAnnouncementRepository.save(pageAnnouncement);

        return true;
    }

    public async updatePageAnnouncement(input: UpdatePageAnnouncementInput, userId: string, file?: FileUploadToken): Promise<boolean> {
        const { id, message, title, userOptions, hasImage, includeImage, imageUrl: preDefinedImageUrl, priority, targetPages } = input;
        const validTargetPages = this.validateTargetPages(targetPages, userOptions);
        const pageAnnouncement = await this.pageAnnouncementRepository.findOne({ where: { id } });

        if (!pageAnnouncement) throw new HttpException('Page announcement does not exist', ErrorStatusCodeEnum._535);

        const user = this.shallowUserService.newShallowUser(userId);

        pageAnnouncement.message = message;
        pageAnnouncement.title = title;
        pageAnnouncement.userOptions = userOptions;
        pageAnnouncement.targetPages = validTargetPages;
        pageAnnouncement.priority = priority;
        pageAnnouncement.schoolTags = await this.getSchoolTagsToAddForPageAnnouncement(input.schoolTagIds);
        pageAnnouncement.logUpdatedBy = user;
        pageAnnouncement.includeImage = includeImage;
        pageAnnouncement.logUpdatedAt = new Date();

        if (
            pageAnnouncement?.imageUrl &&
            pageAnnouncement?.imageType === ImageSourceType.UPLOADED &&
            (!hasImage || preDefinedImageUrl || file)
        ) {
            await this.helperService.removeFile(
                `${appConstants.minioPaths.public.uploadedPageAnnouncementIcons}/${pageAnnouncement.imageUrl}`,
                true
            );
            pageAnnouncement.imageUrl = null;
            pageAnnouncement.imageType = null;
        }

        if (file && file.filename) {
            const filename = `${new Date().getTime()}_${file?.filename}`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedPageAnnouncementIcons}/${filename}`, file, true);
            pageAnnouncement.imageUrl = filename;
            pageAnnouncement.imageType = ImageSourceType.UPLOADED;
        } else if (hasImage && preDefinedImageUrl) {
            pageAnnouncement.imageUrl = preDefinedImageUrl;
            pageAnnouncement.imageType = ImageSourceType.PREDEFINED;
        } else if (!hasImage) {
            pageAnnouncement.imageUrl = null;
            pageAnnouncement.imageType = null;
        }

        await this.pageAnnouncementRepository.save(pageAnnouncement);

        return true;
    }

    public async deletePageAnnouncement(id: string): Promise<OperationStatus> {
        const pageAnnouncement = await this.pageAnnouncementRepository.findOne({ where: { id }, select: ['id', 'imageUrl', 'imageType'] });

        if (!pageAnnouncement) return { status: 'fail', msg: 'No records deleted' } as OperationStatus;

        const res = await this.pageAnnouncementRepository.delete(id);

        if (res['affected'] > 0) {
            if (pageAnnouncement?.imageUrl && pageAnnouncement?.imageType === ImageSourceType.UPLOADED) {
                await this.helperService.removeFile(
                    `${appConstants.minioPaths.public.uploadedPageAnnouncementIcons}/${pageAnnouncement.imageUrl}`,
                    true
                );
            }

            return { status: 'ok', msg: `${res['affected']} record deleted` } as OperationStatus;
        } else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getUserAnnouncementContext(
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean
    ): Promise<UserAnnouncementContextOutput> {
        return {
            hasAnnouncements: (await this.getAllPageAnnouncementsForUserBaseQuery(userId, userType, isSchoolLeader).getCount()) > 0
        };
    }
}
