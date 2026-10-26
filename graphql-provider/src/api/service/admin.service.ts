import { HttpException, Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { constants, SubjectProgrammeType, UserStatus } from 'lwp-shared';
import moment from 'moment';
import { ConfigService } from 'nestjs-config';
import { MINIO_CONNECTION, NestMinioService } from 'nestjs-minio';
import path from 'path';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UsersService } from 'src/auth/service/user.service';
import { UserType } from 'src/auth/types/UserType';
import media from 'src/config/media';
import { appConstants } from 'src/constants';
import { Pagination } from 'src/paginate';
import { Brackets, EntityManager, IsNull, Not, Repository } from 'typeorm';

import { AllFeedsOutput } from '../dtos/AllFeedsOutput';
import { UserResetPassword } from '../dtos/UserResetPassword';
import { LwpDemoActivityFeedback } from '../entities/demo_activity_feedback';
import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupilTag } from '../entities/lwp_pupil_tag';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { LwpStickerCharacterItem } from '../entities/lwp_sticker_character_item';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpActivityTag } from '../entities/static_lwp_activity_tag';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopicTag } from '../entities/static_lwp_topic_tag';
import { LwpUser } from '../entities/user';
import {
    AdminAllFeedsFilterInput,
    AdminInput,
    ErrorStatusCodeEnum,
    FeedbackType,
    GetTagsByColorInput,
    MagicLinkType,
    SchoolTypeFilter,
    Search,
    SearchTypeEnum,
    SharedStatus,
    StickerCharacterItemType,
    SubjectTypeForAllFeeds,
    TagsCategoryType,
    TagsColorOutput,
    UpdateAdminInput
} from '../model';
import { HelperService } from './helper.service';
import { MagicLinkService } from './magic_link.service';
import { NotificationService } from './notification.service';
import { SchoolClassService } from './school_class.service';
import { StaticLwpPeriodService } from './static_period.service';

@Injectable()
export class AdminService implements OnApplicationBootstrap {
    constructor(
        @Inject(MINIO_CONNECTION) private readonly minioClient: ReturnType<NestMinioService['getMinio']>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchoolDates)
        private schoolDatesRepository: Repository<LwpSchoolDates>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(ImportedSchoolClass)
        private importedSchoolClassRepository: Repository<ImportedSchoolClass>,
        @InjectRepository(ImportedStudent)
        private importedStudentRepository: Repository<ImportedStudent>,
        @InjectRepository(ImportedContact)
        private importedContactRepository: Repository<ImportedContact>,
        @InjectRepository(StaticLwpSchoolTag)
        private staticLwpSchoolTagRepository: Repository<StaticLwpSchoolTag>,
        @InjectRepository(StaticLwpTopicTag)
        private staticLwpTopicTagRepository: Repository<StaticLwpTopicTag>,
        @InjectRepository(StaticLwpActivityTag)
        private staticLwpActivityTagRepository: Repository<StaticLwpActivityTag>,
        @InjectRepository(LwpPupilTag)
        private lwpPupilTagRepository: Repository<LwpPupilTag>,
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(LwpDemoActivityFeedback)
        private demoActivityFeedbackRepository: Repository<LwpDemoActivityFeedback>,
        @InjectRepository(LwpStickerCharacterItem)
        private stickerCharacterItemRepository: Repository<LwpStickerCharacterItem>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        @InjectEntityManager()
        private entityManager: EntityManager,
        private usersService: UsersService,
        private shallowUserService: ShallowUserService,
        private periodService: StaticLwpPeriodService,
        private schoolClassService: SchoolClassService,
        private notificationService: NotificationService,
        private readonly configService: ConfigService,
        private helperService: HelperService,
        private magicLinkService: MagicLinkService
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        if (process.env.ALLOW_SCHEDULING === 'true') {
            // Only do this once per deployment on the notification service.
            Logger.verbose('Syncing site images...');
            await this.syncSiteImages();
            Logger.verbose('Done syncing site images.');

            Logger.verbose('Syncing default characters and items...');
            await this.uploadDefaultCharactersItemsForSticker();
            Logger.verbose('Done syncing characters and items.');

            Logger.verbose('Syncing blank certificates...');
            await this.uploadBlankCertificateForDownload();
            Logger.verbose('Done syncing blank certificates.');

            Logger.verbose('Syncing default page announcement images.');
            await this.uploadDefaultPageAnnouncementImages();
            Logger.verbose('Done syncing page announcement images.');
        }
    }

    private async uploadStickerAsset(fileName: string, filePath: string, type: StickerCharacterItemType): Promise<void> {
        const fullFilePath = path.join(filePath, fileName);
        const minioKey = path.posix.join(appConstants.minioPaths.public.uploadedStickersCharacterItem, fileName);

        try {
            await this.minioClient.fPutObject(media.bucket_public, minioKey, fullFilePath);
            Logger.verbose(`- put ${fileName}`);

            const newCharacter = new LwpStickerCharacterItem();

            newCharacter.fileName = fileName;
            newCharacter.isActive = true;
            newCharacter.type = type;
            newCharacter.alt = fileName;

            await this.stickerCharacterItemRepository.save(newCharacter);
        } catch (error) {
            Logger.error(`Failed to upload and save ${type.toLowerCase()} "${fileName}":`, error);
            throw error; // Rethrow or handle accordingly
        }
    }

    async uploadDefaultCharactersItemsForSticker(): Promise<boolean> {
        const character_items_count = await this.stickerCharacterItemRepository.count();

        if (character_items_count > 0) {
            Logger.verbose('Default characters and items already inserted.');

            return false;
        }

        try {
            const defaultAssetsPath = path.join('src', 'resources', 'default-sticker-assets');
            const charactersPath = path.join(defaultAssetsPath, 'characters');
            const itemsPath = path.join(defaultAssetsPath, 'items');

            const characters = fs.readdirSync(charactersPath);
            const items = fs.readdirSync(itemsPath);

            const uploadPromises = [
                ...characters.map((fileName) => this.uploadStickerAsset(fileName, charactersPath, StickerCharacterItemType.CHARACTER)),
                ...items.map((fileName) => this.uploadStickerAsset(fileName, itemsPath, StickerCharacterItemType.ITEM))
            ];

            await Promise.all(uploadPromises);

            Logger.verbose(`Inserted ${characters.length} characters and ${items.length} items.`);

            return true;
        } catch (error) {
            Logger.error('Error uploading default characters and items:', error);
            throw error; // Rethrow or handle accordingly
        }
    }

    public async uploadBlankCertificateForDownload(): Promise<void> {
        try {
            const blankCertificatesPath = path.join('src', 'resources', 'blank-certificates');
            const blankCertificates = fs.readdirSync(blankCertificatesPath);
            const filePromises = blankCertificates.map((fileName) =>
                this.minioClient.fPutObject(
                    media.bucket_public,
                    path.posix.join(appConstants.minioPaths.public.staticCertificates, fileName),
                    path.join(blankCertificatesPath, fileName)
                )
            );

            await Promise.all(filePromises);
            Logger.verbose(`Uploaded ${blankCertificates.length} certificates successfully.`);
        } catch (err) {
            Logger.error(`Error uploading certificates: ${err}`);
        }
    }

    async uploadDefaultPageAnnouncementImages(): Promise<void> {
        try {
            const announcementImagesPath = path.join('src', 'resources', 'default-page-announcement-images');
            const announcementImages = fs.readdirSync(announcementImagesPath);

            const filePromises = announcementImages.map((fileName) =>
                this.minioClient.fPutObject(
                    media.bucket_public,
                    path.posix.join(appConstants.minioPaths.public.defaultPageAnnouncementIcons, fileName),
                    path.join(announcementImagesPath, fileName)
                )
            );

            await Promise.all(filePromises);
            Logger.verbose(`Uploaded ${announcementImages.length} announcement images successfully.`);
        } catch (err) {
            Logger.error(`Error uploading default page announcement images: ${err}`);
        }
    }

    public async addAdmin(input: AdminInput, userId: string): Promise<UserResetPassword> {
        const user = this.shallowUserService.newShallowUser(userId);
        const adminUser = new LwpUser();
        const { firstname, lastname, email } = input;

        adminUser.firstname = firstname;
        adminUser.lastname = lastname;
        adminUser.email = email;
        adminUser.logCreatedBy = user;
        adminUser.logUpdatedBy = user;
        adminUser.userStatus = UserStatus.INVITED;
        adminUser.type = UserType.ADMIN;
        adminUser.emailVerificationCode = email ? this.helperService.generateId(4, '') : null;

        const userResetPassword = new UserResetPassword();

        userResetPassword.user = await this.userRepository.save(adminUser);

        const invitationMagicLink = await this.magicLinkService.generateMagicLink({
            userId: adminUser.id,
            pupilTopicId: null,
            pupilId: null,
            schoolId: null,
            termId: null,
            topicId: null,
            trophyId: null,
            reportType: null,
            type: MagicLinkType.INVITATION
        });
        const rejectMagicLink = await this.magicLinkService.generateMagicLink({
            userId: adminUser.id,
            pupilTopicId: null,
            pupilId: null,
            topicId: null,
            schoolId: null,
            reportType: null,
            termId: null,
            trophyId: null,
            type: MagicLinkType.REJECT_INVITATION
        });

        userResetPassword.link = `${process.env.HOSTED_URL}/magic/${invitationMagicLink?.url}`;

        await this.notificationService.adminInvitationEmail(adminUser, invitationMagicLink?.url, rejectMagicLink.url, true);

        return userResetPassword;
    }

    public async updateAdmin(input: UpdateAdminInput, userId: string): Promise<LwpUser> {
        const user = this.shallowUserService.newShallowUser(userId);
        const { firstname, lastname, email, id, isDeactivated, adminRestrictionsInput } = input;

        const adminUser = await this.userRepository.findOne({ where: { id } });

        if (!adminUser) throw new HttpException('Admin does not exist', ErrorStatusCodeEnum._535);

        if (adminRestrictionsInput !== null) {
            adminUser.adminRestrictions = adminRestrictionsInput;
        }

        adminUser.firstname = firstname;
        adminUser.lastname = lastname;
        adminUser.email = email;
        adminUser.logUpdatedBy = user;

        if (isDeactivated) {
            adminUser.userStatus = UserStatus.DEACTIVATED;
        }

        if (isDeactivated === false) {
            adminUser.userStatus = UserStatus.ACTIVE;
        }

        return await this.userRepository.save(adminUser);
    }

    public async getAdmins(): Promise<LwpUser[]> {
        return await this.userRepository.find({ where: { type: UserType.ADMIN } });
    }

    public async resetUserPassword(email: string, userId: string): Promise<UserResetPassword> {
        const admin = this.shallowUserService.newShallowUser(userId);
        const user = await this.userRepository.findOne({ where: { email }, select: ['id', 'userStatus'] });
        const userResetPassword = new UserResetPassword();

        if (!user) throw new HttpException('User does not exist', ErrorStatusCodeEnum._535);

        if (user.userStatus === UserStatus.DEACTIVATED) {
            throw new HttpException('Account is deactivated. Password reset is not allowed.', ErrorStatusCodeEnum._535);
        }

        user.logUpdatedBy = admin;
        user.logUpdatedAt = new Date();

        const magicLink = await this.magicLinkService.generateMagicLink({
            userId: user?.id,
            pupilTopicId: null,
            reportType: null,
            pupilId: null,
            topicId: null,
            schoolId: null,
            termId: null,
            trophyId: null,
            type: MagicLinkType.RESETPASSWORD
        });

        userResetPassword.user = await this.userRepository.save(user);
        userResetPassword.link = `${this.configService.get('server.hostedUrl')}/magic/${magicLink?.url}`;

        return userResetPassword;
    }

    public async adminReleasePupilTopics(inputDate: Date): Promise<boolean> {
        const date = inputDate ? moment(inputDate).add(5, 'hours').toDate() : moment().toDate();

        await this.helperService.releasePupilTopicsHelper(date);

        return true;
    }

    public async syncSiteImages(): Promise<boolean> {
        try {
            const siteImagesPath = path.join('src', 'resources', 'site-images');
            const siteImages = fs.readdirSync(siteImagesPath);

            const filePromises = siteImages.map((fileName) =>
                this.minioClient.fPutObject(
                    media.bucket_public,
                    path.posix.join(appConstants.minioPaths.public.siteImage, fileName),
                    path.join(siteImagesPath, fileName)
                )
            );

            await Promise.all(filePromises);

            Logger.verbose(`Uploaded ${siteImages.length} images successfully.`);

            return true;
        } catch (err) {
            Logger.error(`Error syncing site images: ${err}`);

            return false;
        }
    }

    public async resetUsersSavedPermissions(): Promise<boolean> {
        await this.userRepository.update({ sharingAllowed: Not(IsNull()) }, { sharingAllowed: null });

        return true;
    }

    public async getAllFeeds(limit = 10, offset = 0, filter?: AdminAllFeedsFilterInput): Promise<AllFeedsOutput> {
        let feedbackIds = [];
        let total = 0;

        let allFeedBase = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoin('feedback.activity', 'activity')
            .leftJoin('feedback.pupils', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('activity.topic', 'activityPupilTopic')
            .leftJoin('activityPupilTopic.period', 'activityPupilTopicPeriod')
            .leftJoin('activityPupilTopic.topic', 'activityStaticTopic')
            .leftJoin('activityStaticTopic.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .leftJoin('domain.subject', 'subject')
            .andWhere('feedback.originalFeedbackId IS NULL');

        if (filter?.subjects && filter?.subjects?.length > 0) {
            const getReadingFeedbacks = filter?.subjects?.includes(constants.readingAsASubjectId);
            const topicSubjectIds = filter?.subjects?.filter((subjectIds) => subjectIds !== constants.readingAsASubjectId);

            // Scrapbook entries belong to the Ready Teddy programme but are not linked to a topic/subject,
            // so include them whenever a Ready Teddy subject is selected in the filter.
            let includeScrapbookFeedbacks = false;

            if (topicSubjectIds.length > 0) {
                const readyTeddySubjectCount = await this.subjectRepository
                    .createQueryBuilder('subject')
                    .where('subject.id IN (:...topicSubjectIds)', { topicSubjectIds })
                    .andWhere('subject.programmeType = :programmeType', { programmeType: SubjectProgrammeType.READY_TEDDY })
                    .getCount();

                includeScrapbookFeedbacks = readyTeddySubjectCount > 0;
            }

            allFeedBase = allFeedBase.andWhere(
                new Brackets((qb) => {
                    if (getReadingFeedbacks) {
                        qb.orWhere('feedback.type = :readingType', { readingType: SubjectTypeForAllFeeds.READING });
                    }

                    if (topicSubjectIds.length > 0) {
                        qb.orWhere('subject.id IN (:...topicSubjectIds)', { topicSubjectIds });
                    }

                    if (includeScrapbookFeedbacks) {
                        qb.orWhere('feedback.type = :scrapbookType', { scrapbookType: FeedbackType.SCRAPBOOK });
                    }
                })
            );
        }

        if (filter?.feedbackTypes?.length > 0) {
            allFeedBase = allFeedBase.andWhere('feedback.type IN (:...feedbackTypes)', {
                feedbackTypes: filter.feedbackTypes
            });
        }

        if (filter?.sharedStatus === SharedStatus.SHAREDPHOTOSONLY) {
            allFeedBase = allFeedBase.innerJoin('feedback.media', 'media').andWhere(
                new Brackets((qb) => {
                    qb.where(`feedback.sharingAllowed = ${true}`);
                })
            );
        } else {
            allFeedBase = allFeedBase.leftJoin('feedback.media', 'media');
        }

        if (filter?.sharedStatus === SharedStatus.INCLUDEDINIMPACTREPORT) {
            allFeedBase = allFeedBase.andWhere(
                new Brackets((qb) => {
                    qb.where(`feedback.includePhotoInImpactReport = ${true}`)
                        .orWhere(`feedback.includeParentCommentInImpactReport = ${true}`)
                        .orWhere(`feedback.includePupilCommentInImpactReport = ${true}`)
                        .orWhere(`feedback.includeReadingCommentInImpactReport = ${true}`);
                })
            );
        }

        if (filter?.sharedStatus === SharedStatus.SHAREDONLY) {
            allFeedBase = allFeedBase.andWhere(
                new Brackets((qb) => {
                    qb.where(`feedback.sharingAllowed = ${true}`);
                })
            );
        }

        if (filter?.postedBefore) {
            allFeedBase = allFeedBase.andWhere('feedback.logCreatedAt < :before', {
                before: moment(filter?.postedBefore).endOf('day').format('YYYY-MM-DD HH:mm:ss')
            });
        }

        if (filter?.defaultDate && !filter?.postedAfter) {
            filter.postedAfter = (
                await this.schoolDatesRepository
                    .createQueryBuilder('sd')
                    .where('sd.startDate < current_date')
                    .orderBy('sd.startDate', 'DESC')
                    .select('sd.startDate')
                    .limit(1)
                    .getOne()
            )?.startDate;
        }

        if (filter?.postedAfter) {
            allFeedBase = allFeedBase.andWhere('feedback.logCreatedAt > :after', {
                after: moment(filter?.postedAfter).startOf('day').format('YYYY-MM-DD HH:mm:ss')
            });
        }

        if (filter?.schoolIds?.length) {
            allFeedBase = allFeedBase.andWhere('school.id IN (:...schoolIds)', { schoolIds: filter.schoolIds });
        }

        if (filter?.topicIds?.length > 0) {
            allFeedBase = allFeedBase.andWhere('activityStaticTopic.id IN (:...topicIds)', { topicIds: filter.topicIds });
        }

        if (filter?.topicYearGroupIds?.length > 0) {
            allFeedBase = allFeedBase
                .leftJoin('domainsAndYearGroups.yearGroup', 'yearGroup')
                .andWhere('yearGroup.id IN (:...topicYearGroupIds)', {
                    topicYearGroupIds: filter.topicYearGroupIds
                });
        }

        if (filter?.topicTagIds?.length > 0) {
            allFeedBase = allFeedBase.leftJoin('activityStaticTopic.tags', 'topicTags').andWhere('topicTags.id IN (:...topicTagIds)', {
                topicTagIds: filter.topicTagIds
            });
        }

        if (filter?.schoolTagIds?.length > 0) {
            allFeedBase = allFeedBase
                .leftJoin('school.schoolTags', 'schoolTags')
                .leftJoin('schoolTags.tag', 'schoolStaticTag')
                .andWhere('schoolStaticTag.id IN (:...schoolTagIds)', {
                    schoolTagIds: filter.schoolTagIds
                });
        }

        if (filter?.activityTagIds?.length > 0) {
            allFeedBase = allFeedBase
                .leftJoin('activity.activity', 'staticActivity')
                .leftJoin('staticActivity.tags', 'activityTags')
                .andWhere('activityTags.id IN (:...activityTagIds)', {
                    activityTagIds: filter.activityTagIds
                });
        }

        if (filter?.starRating?.length > 0) {
            allFeedBase = allFeedBase.andWhere('activity.rating IN (:...rating)', { rating: filter?.starRating });
        }

        if (filter?.schoolTypes?.length > 0) {
            allFeedBase = allFeedBase.andWhere(
                new Brackets((qb) => {
                    if (filter.schoolTypes.includes(SchoolTypeFilter.ACTIVE)) {
                        qb.orWhere('school.inactive = :inactive', { inactive: false });

                        if (!filter.schoolTypes.includes(SchoolTypeFilter.TEST)) {
                            qb.andWhere('school.isTestSchool = :isTestSchool', {
                                isTestSchool: false
                            });
                        }
                    }

                    if (filter.schoolTypes.includes(SchoolTypeFilter.INACTIVE)) {
                        qb.orWhere('school.inactive = :inactive', { inactive: true });
                    }

                    if (filter.schoolTypes.includes(SchoolTypeFilter.TEST)) {
                        qb.orWhere('school.isTestSchool = :isTestSchool', { isTestSchool: true });
                    }
                })
            );
        }

        if (filter?.bookOptions?.length > 0) {
            allFeedBase = allFeedBase.andWhere('feedback."readingType" IN (:...bookOptions)', { bookOptions: filter.bookOptions });
        }

        if (filter?.photoRatings?.length) {
            allFeedBase = allFeedBase.andWhere('feedback.rating IN (:...photoRatings)', { photoRatings: filter.photoRatings });
        }

        if (filter?.bookName?.trim()?.length > 0) {
            allFeedBase = allFeedBase.andWhere('feedback.normalisedBookName ILIKE :bookName', {
                bookName: `%${filter?.bookName?.trim().toLowerCase()}%`
            });
        }

        if (filter?.searchInput?.trim()?.length > 0) {
            allFeedBase = allFeedBase.andWhere(
                new Brackets((qb) => {
                    qb.where("feedback.pupilComment || ' ' || feedback.parentComment ILIKE :searchTerm", {
                        searchTerm: `%${filter?.searchInput?.trim()}%`
                    }).orWhere('feedback.comment ILIKE :searchTerm', {
                        searchTerm: `%${filter?.searchInput?.trim()}%`
                    });
                })
            );
        }

        if (!filter) filter = { postedAfter: null };

        [feedbackIds, total] = await allFeedBase
            .select('feedback.id')
            .groupBy('feedback.id')
            .orderBy('feedback.logCreatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .getManyAndCount();

        if (feedbackIds.length === 0 || (filter?.sharedStatus === SharedStatus.ALL && !filter?.schoolIds?.length)) {
            return {
                feed: new Pagination<LwpPupilFeedback>({
                    results: [],
                    total: total,
                    limit,
                    offset
                }),
                filter
            };
        }

        const allFeeds = await this.pupilFeedbackRepository
            .createQueryBuilder('allFeeds')
            .leftJoinAndSelect('allFeeds.feedbackReplies', 'feedbackReplies')
            .orderBy('allFeeds.logCreatedAt', 'DESC')
            .andWhere('allFeeds.id IN (:...feedbackIds)', {
                feedbackIds: feedbackIds?.map(({ id }) => id)
            })
            .getMany();

        return {
            feed: new Pagination<LwpPupilFeedback>({
                results: allFeeds,
                total: total,
                limit,
                offset
            }),
            filter
        };
    }

    public async getDemoActivityAllFeeds(limit = 10, offset = 0): Promise<Pagination<LwpDemoActivityFeedback>> {
        const allFeedBase = this.demoActivityFeedbackRepository
            .createQueryBuilder('demoActivityFeedback')
            .leftJoinAndSelect('demoActivityFeedback.activity', 'demoActivity');

        const [allFeeds, total] = await allFeedBase
            .orderBy('demoActivityFeedback.logCreatedAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        for (const feed of allFeeds) {
            feed.photo = feed.photo
                ? await this.helperService.getUsermediaUrl(`${appConstants.minioPaths.usermedia.uploadedImages}/${feed.photo}`)
                : null;
        }

        return new Pagination<LwpDemoActivityFeedback>({
            results: allFeeds,
            total,
            limit,
            offset
        });
    }

    public async getSearchResults(query: string): Promise<Search[]> {
        const searchResults: Search[] = [];

        if (!query?.trim()) {
            return searchResults;
        }

        const users = await this.userRepository
            .createQueryBuilder('users')
            .where("users.firstname || ' ' || users.lastname ILIKE :searchTerm", { searchTerm: `%${query}%` })
            .orWhere('users.email ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .orWhere('users.phoneNumber ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .take(10)
            .getMany();

        const pupils = await this.pupilRepository
            .createQueryBuilder('pupils')
            .where("pupils.firstname || ' ' || pupils.lastname ILIKE :searchTerm", { searchTerm: `%${query}%` })
            .take(10)
            .getMany();

        const schools = await this.schoolRepository
            .createQueryBuilder('schools')
            .where('schools.schoolName ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .take(10)
            .getMany();

        const schoolClasses = await this.schoolClassRepository
            .createQueryBuilder('schoolClasses')
            .leftJoinAndSelect('schoolClasses.yearGroup', 'yearGroup')
            .leftJoinAndSelect('schoolClasses.mainTeacher', 'mainTeacher')
            .leftJoinAndSelect('schoolClasses.period', 'period')
            .where('schoolClasses.name ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .andWhere('schoolClasses.isRegistrationClass = true')
            .take(10)
            .getMany();

        const groups = await this.schoolClassRepository
            .createQueryBuilder('groups')
            .leftJoinAndSelect('groups.mainTeacher', 'mainTeacher')
            .leftJoinAndSelect('groups.parentClass', 'parentClass')
            .leftJoinAndSelect('groups.subjects', 'subjects')
            .where('groups.name ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .andWhere('groups.isRegistrationClass = false')
            .take(10)
            .getMany();

        const importedSchoolClasses = await this.importedSchoolClassRepository
            .createQueryBuilder('importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.yearGroup', 'yearGroup')
            .where('importedSchoolClass.name ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .orWhere('importedSchoolClass.id ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .take(10)
            .getMany();

        const importedStudents = await this.importedStudentRepository
            .createQueryBuilder('importedStudents')
            .where("importedStudents.forename || ' ' || importedStudents.surname ILIKE :searchTerm", { searchTerm: `%${query}%` })
            .orWhere('importedStudents.UPN ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .orWhere('importedStudents.id ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .take(10)
            .getMany();

        const importedContacts = await this.importedContactRepository
            .createQueryBuilder('importedContacts')
            .where("importedContacts.forename || ' ' || importedContacts.surname ILIKE :searchTerm", { searchTerm: `%${query}%` })
            .orWhere('importedContacts.email ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .orWhere('importedContacts.phoneNumber ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .orWhere('importedContacts.id ILIKE :searchTerm', { searchTerm: `%${query}%` })
            .take(10)
            .getMany();

        if (users.length > 0) {
            users.map((user) => {
                const search = new Search();

                search.id = user?.id;
                search.email = user?.email;
                search.name = `${user?.firstname} ${user?.lastname}`;
                search.phone = user?.phoneNumber;
                search.type = user?.isSchoolLeader
                    ? SearchTypeEnum.SCHOOLLEADER
                    : user?.type === UserType.ADMIN
                      ? SearchTypeEnum.ADMIN
                      : user?.type === UserType.PARENT
                        ? SearchTypeEnum.PARENT
                        : SearchTypeEnum.TEACHER;

                searchResults.push(search);
            });
        }

        if (pupils.length > 0) {
            for (const pupil of pupils) {
                const search = new Search();

                search.id = pupil?.id;
                search.name = `${pupil?.firstname} ${pupil?.lastname}`;
                search.isPremium = pupil?.isPremium;
                search.pupilStatus = await pupil?.getPupilStatus();
                search.type = SearchTypeEnum.PUPIL;

                searchResults.push(search);
            }
        }

        if (schools.length > 0) {
            schools.map((school) => {
                const search = new Search();

                search.id = school?.id;
                search.name = school?.schoolName;
                search.commentsAndPhotos = school?.commentsAndPhotos;
                search.type = SearchTypeEnum.SCHOOL;

                searchResults.push(search);
            });
        }

        if (schoolClasses.length > 0) {
            for (const schoolClass of schoolClasses) {
                const search = new Search();

                search.id = schoolClass?.id;
                search.name = schoolClass?.name;
                search.classSize = await this.schoolClassService.getClassNumOfPupils(schoolClass?.id);
                search.yearGroup = schoolClass?.yearGroup?.year;
                search.mainTeacherName = `${schoolClass?.mainTeacher?.firstname} ${schoolClass?.mainTeacher?.lastname}`;
                search.periodName = schoolClass?.period?.longName;
                search.type = SearchTypeEnum.CLASS;

                searchResults.push(search);
            }
        }

        if (groups.length > 0) {
            groups.map((group) => {
                const search = new Search();

                search.id = group?.id;
                search.name = group?.name;
                search.mainClassName = group?.parentClass?.name ?? '-';
                search.mainTeacherName = `${group?.mainTeacher?.firstname} ${group?.mainTeacher?.lastname}`;
                search.subjects = group?.subjects ?? [];
                search.isReadingGroup = group?.IsReadingLogsEnabled;
                search.type = SearchTypeEnum.GROUP;

                searchResults.push(search);
            });
        }

        if (importedSchoolClasses.length > 0) {
            importedSchoolClasses.map((importedSchoolClass) => {
                const search = new Search();

                search.id = Math.floor(Math.random() * 1000).toString();
                search.wondeId = importedSchoolClass?.id;
                search.name = importedSchoolClass?.name;
                search.code = importedSchoolClass?.code;
                search.yearGroup = importedSchoolClass?.yearGroup?.year;
                search.type = SearchTypeEnum.WONDESCHOOLCLASS;

                searchResults.push(search);
            });
        }

        if (importedStudents.length > 0) {
            importedStudents.map((importedStudent) => {
                const search = new Search();

                search.id = Math.floor(Math.random() * 1000).toString();
                search.wondeId = importedStudent?.id;
                search.name = `${importedStudent?.forename} ${importedStudent?.surname}`;
                search.isPremium = importedStudent?.isPremium;
                search.UPN = importedStudent?.UPN;
                search.type = SearchTypeEnum.WONDESTUDENT;

                searchResults.push(search);
            });
        }

        if (importedContacts.length > 0) {
            importedContacts.map((importedContact) => {
                const search = new Search();

                search.id = Math.floor(Math.random() * 1000).toString();
                search.wondeId = importedContact?.id;
                search.name = `${importedContact?.forename} ${importedContact?.surname}`;
                search.email = importedContact?.email;
                search.phone = importedContact?.phoneNumber;
                search.type = SearchTypeEnum.WONDECONTACT;

                searchResults.push(search);
            });
        }

        return searchResults;
    }

    public async getTagsByColor(input: GetTagsByColorInput): Promise<TagsColorOutput[]> {
        let repository;

        switch (input.category) {
            case TagsCategoryType.SCHOOL_TAG:
                repository = this.staticLwpSchoolTagRepository;
                break;
            case TagsCategoryType.TOPIC_TAG:
                repository = this.staticLwpTopicTagRepository;
                break;
            case TagsCategoryType.ACTIVITY_TAG:
                repository = this.staticLwpActivityTagRepository;
                break;
            case TagsCategoryType.PUPIL_TAG:
                return await this.lwpPupilTagRepository.find({
                    where: {
                        color: input.color,
                        school: input.schoolId
                    },
                    select: ['id', 'color', 'name']
                });

            default:
                throw new Error(`Unsupported category: ${input.category}`);
        }

        return await repository.find({
            where: {
                color: input.color
            },
            select: ['id', 'color', 'name']
        });
    }

    public async getRecentAddedColors(category: TagsCategoryType, schoolId: string): Promise<TagsColorOutput[]> {
        let repository;

        switch (category) {
            case TagsCategoryType.SCHOOL_TAG:
                repository = this.staticLwpSchoolTagRepository;
                break;
            case TagsCategoryType.TOPIC_TAG:
                repository = this.staticLwpTopicTagRepository;
                break;
            case TagsCategoryType.ACTIVITY_TAG:
                repository = this.staticLwpActivityTagRepository;
                break;
            case TagsCategoryType.PUPIL_TAG:
                return await this.lwpPupilTagRepository.find({
                    where: {
                        school: schoolId
                    },
                    order: {
                        logCreatedAt: 'DESC'
                    },
                    take: 4,
                    select: ['id', 'color', 'name']
                });

            default:
                throw new Error(`Unsupported category: ${category}`);
        }

        return await repository.find({
            order: {
                logCreatedAt: 'DESC'
            },
            take: 4,
            select: ['color']
        });
    }
}
