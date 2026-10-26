import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { SubjectProgrammeType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Brackets, Connection, In, Repository, SelectQueryBuilder } from 'typeorm';

import { TopicWithActivitiesForAdmin } from '../dtos/TopicWithActivitiesForAdmin';
import { StaticLwpActivity } from '../entities/activity';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from '../entities/static_topic_domain_year_group';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { LwpUser } from '../entities/user';
import { StaticLwpYearGroup } from '../entities/year_group';
import {
    ActivityStepType,
    ErrorStatusCodeEnum,
    OperationStatus,
    SchoolClassStatus,
    TopicFilter,
    TopicInput,
    UpdateTopicInput
} from '../model';
import { appConstants } from './../../constants';
import { ActivityService } from './activity.service';
import { HelperService } from './helper.service';
import { MagicLinkService } from './magic_link.service';
import { QueryBaseService } from './query_base.service';
import { StaticLwpSchoolTagService } from './static_lwp_school_tag.service';
import { StaticLwpTopicTagService } from './static_lwp_topic_tag.service';
import { StaticLwpTopicDomainYearGroupService } from './static_topic_domain_year_group.service';
import { TopicDomainService } from './topic_domain.service';

/**
 * The only fields programme entitlement depends on. Declared narrowly so a caller can see exactly
 * what to load, rather than fetching a whole class to read five booleans.
 *
 * With a query builder, that is:
 * ```
 * .leftJoin('schoolClass.school', 'school')
 * .select([
 *     'schoolClass.id',
 *     'schoolClass.isFullProgramme',
 *     'schoolClass.isReadyTeddyEnabled',
 *     'schoolClass.IsReadingLogsEnabled',
 *     'schoolClass.isRegistrationClass',
 *     'schoolClass.isGroupAcrossClasses',
 *     'school.isMoneySkillsAvailable'
 * ])
 * ```
 */
export interface ClassProgrammeEntitlementFields {
    isFullProgramme: boolean;
    isReadyTeddyEnabled: boolean;
    IsReadingLogsEnabled: boolean;
    isRegistrationClass: boolean;
    isGroupAcrossClasses: boolean;
    school: { isMoneySkillsAvailable: boolean };
}

/**
 * Which programmes' content a class is entitled to.
 *
 * This is the single source of truth for programme entitlement: it backs the teacher-facing
 * topic pickers via {@link TopicService.applyProgrammeFilterBasedOnClass} and the sequence
 * eligibility check in `ClassSequenceAssignmentService`, so the two can never disagree about
 * what a class may be offered.
 *
 * Note the flags are mostly per-class, despite the school-level names elsewhere:
 * `LwpSchool.isReadyTeddyAvailable` is a licensing gate controlling whether a class may switch
 * Ready Teddy on at all, whereas the entitlement itself is the class's `isReadyTeddyEnabled`.
 * Money Skills is the only programme with a school-level component, so it is the only one that
 * needs `school` loaded; it is silently dropped if the join was missed.
 */
export function allowedProgrammeTypesForClass(schoolClass: ClassProgrammeEntitlementFields): SubjectProgrammeType[] {
    const { isReadyTeddyEnabled, isFullProgramme, IsReadingLogsEnabled, isRegistrationClass, isGroupAcrossClasses } = schoolClass;

    const allowedProgrammes: SubjectProgrammeType[] = [];

    if (isFullProgramme) allowedProgrammes.push(SubjectProgrammeType.FULL_PROGRAMME);

    if (isReadyTeddyEnabled) allowedProgrammes.push(SubjectProgrammeType.READY_TEDDY);

    if (
        schoolClass?.school?.isMoneySkillsAvailable &&
        (((isRegistrationClass || isGroupAcrossClasses) && IsReadingLogsEnabled) || isFullProgramme)
    ) {
        allowedProgrammes.push(SubjectProgrammeType.MONEY_SKILLS);
    }

    return allowedProgrammes;
}

@Injectable()
export class TopicService {
    constructor(
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpYearGroup)
        private yearGroupRepository: Repository<StaticLwpYearGroup>,
        @InjectRepository(StaticLwpActivity)
        private staticLwpActivityRepository: Repository<StaticLwpActivity>,
        @InjectRepository(StaticLwpSchoolTag)
        private staticLwpTopicSchoolRepository: Repository<StaticLwpSchoolTag>,
        @InjectRepository(StaticLwpTopicDomain)
        private topicDomainRepository: Repository<StaticLwpTopicDomain>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        private helperService: HelperService,
        private queryBaseService: QueryBaseService,
        private topicDomainService: TopicDomainService,
        private activityService: ActivityService,
        private magicLinkService: MagicLinkService,
        private lwpTopicTagService: StaticLwpTopicTagService,
        private lwpTopicDomainYearGroupService: StaticLwpTopicDomainYearGroupService,
        private connection: Connection,
        private shallowUserService: ShallowUserService,
        private staticLwpSchoolTagService: StaticLwpSchoolTagService
    ) {}

    private async isContainReadyTeddyDomain(domainIds: string[]): Promise<boolean> {
        if (!domainIds?.length) return false;

        const result = await this.topicDomainRepository
            .createQueryBuilder('domain')
            .leftJoin('domain.subject', 'subject')
            .where('domain.id IN (:...domainIds)', { domainIds })
            .select(['bool_or(subject.programmeType = :readyTeddy) as "isContainReadyTeddyDomain"'])
            .setParameter('readyTeddy', SubjectProgrammeType.READY_TEDDY)
            .getRawOne();

        return result?.isContainReadyTeddyDomain || false;
    }

    public async addTopic(input: TopicInput, file: FileUpload[], user: string | LwpUser): Promise<StaticLwpTopic> {
        const topic = new StaticLwpTopic();
        const domainsAndYearGroups = await this.lwpTopicDomainYearGroupService.getDomainsAndYearGroups(input.domainAndYearGroupIds);

        if (domainsAndYearGroups?.length === 0) throw new HttpException('Domains and year groups do not exist', ErrorStatusCodeEnum._535);

        const shallowUser = this.shallowUserService.newShallowUser(user);

        topic.teacherTopicName = input.teacherTopicName;
        topic.video = input.video;
        topic.teacherDescription = input.teacherDescription;
        topic.printablesFile = input.printablesFile;
        topic.parentTopicName = input.parentTopicName;
        topic.teacherEmailBody = input.teacherEmailBody;
        topic.isDemo = input.isDemo;
        topic.isHidden = input.isHidden;
        topic.noVideo = input.noVideo;
        topic.isPublished = input?.isPublished;
        topic.logCreatedBy = shallowUser;
        topic.logUpdatedBy = shallowUser;
        topic.domainsAndYearGroups = [];

        const isContainReadyTeddyDomain = await this.isContainReadyTeddyDomain(input.domainAndYearGroupIds.map((item) => item.domainId));

        if (isContainReadyTeddyDomain && input?.scrapbookPrompt) {
            topic.scrapbookPrompt = input?.scrapbookPrompt;
        }

        if (input?.topicTagId?.length > 0) {
            topic.tags = await this.lwpTopicTagService.getTagsByIds(input?.topicTagId);
        } else {
            topic.tags = [];
        }

        if (input?.schoolTagId?.length > 0) {
            topic.schoolTags = await this.staticLwpSchoolTagService.getTagsByIds(input?.schoolTagId);
        } else {
            topic.schoolTags = [];
        }

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);

            for (const fileUpload of fileUploads) {
                if (!fileUpload) continue;

                const filename = `${new Date().getTime()}_${fileUpload.filename}`;

                // Only the teacher resource carries an id. Anything else is the topic image, which
                // the form has always sent without one.
                if (input?.teacherResourceId && fileUpload.filename?.includes(input.teacherResourceId)) {
                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.topicTeacherResources}/${filename}`,
                        fileUpload,
                        true,
                        {
                            'Content-Type': 'binary/octet-stream'
                        }
                    );
                    topic.teacherResource = filename;
                } else {
                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.cardIconsForTopics}/${filename}`,
                        fileUpload,
                        true
                    );
                    topic.videoThumb = filename;
                }
            }
        }

        const newTopic = await this.topicRepository.save(topic);

        await this.lwpTopicDomainYearGroupService.addDomainAndYearGroupInTopic(newTopic, domainsAndYearGroups, shallowUser);

        newTopic.video = newTopic.video ? `${appConstants.vimeoBaseUrl}/${newTopic.video}` : null;
        newTopic.teacherPdf = newTopic?.teacherPdf
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${newTopic?.teacherPdf}`)
            : null;
        newTopic.teacherResource = newTopic?.teacherResource
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.topicTeacherResources}/${newTopic?.teacherResource}`)
            : null;
        newTopic.videoThumb = newTopic.videoThumb
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${newTopic.videoThumb}`)
            : null;

        return newTopic;
    }

    public async updateTopic(input: UpdateTopicInput, file: FileUpload[], userId: string): Promise<StaticLwpTopic> {
        const topic = await this.topicRepository.findOne({ where: { id: input.id } });

        if (!topic) throw new HttpException('topic does not exist', ErrorStatusCodeEnum._535);

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        if (input.teacherTopicName) topic.teacherTopicName = input.teacherTopicName;
        if (input.teacherDescription) topic.teacherDescription = input.teacherDescription;
        if (input.printablesFile) topic.printablesFile = input.printablesFile;
        if (input.parentTopicName != null) topic.parentTopicName = input.parentTopicName;
        if (input.teacherEmailBody) topic.teacherEmailBody = input.teacherEmailBody;
        topic.video = input.video ?? null;
        topic.isDemo = input.isDemo ?? topic.isDemo;
        topic.isHidden = input.isHidden ?? topic.isHidden;
        topic.noVideo = input.noVideo;
        topic.isTeacherPdfRequired = input.isTeacherPdfRequired;
        topic.logUpdatedBy = shallowUser;
        topic.isPublished = input?.isPublished;

        const isContainReadyTeddyDomain = await this.isContainReadyTeddyDomain(input.domainAndYearGroupIds.map((item) => item.domainId));

        topic.scrapbookPrompt = isContainReadyTeddyDomain ? input?.scrapbookPrompt : null;

        if (topic.videoThumb && !input.hasVideoThumb) {
            await this.helperService.removeFile(`${appConstants.minioPaths.public.cardIconsForTopics}/${topic.videoThumb}`, true);
            topic.videoThumb = null;
        }

        if (topic.teacherPdf && !input.hasTeacherPdf) {
            await this.helperService.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${topic.teacherPdf}`, true);
            topic.teacherPdf = null;
            topic.isTeacherPdfRequired = false;
        }

        if (topic.teacherResource && !input.hasTeacherResource) {
            await this.helperService.removeFile(`${appConstants.minioPaths.public.topicTeacherResources}/${topic.teacherResource}`, true);
            topic.teacherResource = null;
        }

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);

            for (const fileUpload of fileUploads) {
                if (fileUpload && fileUpload?.filename?.includes(input?.videoThumbId)) {
                    const filename = `${fileUpload?.filename}`;

                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.cardIconsForTopics}/${filename}`,
                        fileUpload,
                        true
                    );
                    topic.videoThumb = filename;
                }

                if (fileUpload && fileUpload?.filename?.includes(input?.teacherPdfId)) {
                    const filename = `${fileUpload?.filename}`;

                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.fileActivitySteps}/${filename}`,
                        fileUpload,
                        true,
                        input.hasTeacherPdf
                            ? {
                                  'Content-Type': 'binary/octet-stream'
                              }
                            : this.helperService.getFileMetaData(filename)
                    );

                    topic.teacherPdf = filename;
                }

                // Matched on its own id, and stored under the loop's own file, so a topic saved with
                // both a thumbnail and slides puts each where it belongs.
                if (fileUpload && input?.teacherResourceId && fileUpload?.filename?.includes(input.teacherResourceId)) {
                    // Same date prefix as addTopic, so a deck has one key format wherever it was set.
                    const filename = `${new Date().getTime()}_${fileUpload.filename}`;

                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.topicTeacherResources}/${filename}`,
                        fileUpload,
                        true,
                        {
                            'Content-Type': 'binary/octet-stream'
                        }
                    );

                    topic.teacherResource = filename;
                }
            }
        }

        if (input?.topicTagId?.length > 0) {
            topic.tags = await this.lwpTopicTagService.getTagsByIds(input?.topicTagId);
        } else {
            topic.tags = [];
        }

        if (input?.schoolTagId?.length > 0) {
            topic.schoolTags = await this.staticLwpSchoolTagService.getTagsByIds(input?.schoolTagId);
        } else {
            topic.schoolTags = [];
        }

        const newTopic = await this.topicRepository.save(topic);

        await this.lwpTopicDomainYearGroupService.updateDomainAndYearGroupInTopic(newTopic, input.domainAndYearGroupIds, shallowUser);

        newTopic.video = newTopic.video ? `${appConstants.vimeoBaseUrl}/${newTopic.video}` : null;
        newTopic.teacherPdf = newTopic?.teacherPdf
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${newTopic?.teacherPdf}`)
            : null;
        newTopic.teacherResource = newTopic?.teacherResource
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.topicTeacherResources}/${newTopic?.teacherResource}`)
            : null;
        newTopic.videoThumb = newTopic.videoThumb
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${newTopic.videoThumb}`)
            : null;

        return newTopic;
    }

    public async getTopic(id: string): Promise<StaticLwpTopic> {
        const topic = await this.topicRepository.findOne({ where: { id } });

        if (topic) {
            topic.video = topic.video ? `${appConstants.vimeoBaseUrl}/${topic.video}` : null;
            topic.teacherPdf = topic?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${topic?.teacherPdf}`)
                : null;
            topic.videoThumb = topic.videoThumb
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${topic.videoThumb}`)
                : null;
        }

        return topic;
    }

    public async getTopicForAdmin(id: string): Promise<StaticLwpTopic> {
        const topic = await this.topicRepository.findOne({ where: { id } });

        if (topic) {
            topic.video = topic.video ? `${appConstants.vimeoBaseUrl}/${topic.video}` : null;
            topic.teacherPdf = topic?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${topic?.teacherPdf}`)
                : null;
            topic.teacherResource = topic?.teacherResource
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.topicTeacherResources}/${topic?.teacherResource}`)
                : null;
            topic.videoThumb = topic.videoThumb
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${topic.videoThumb}`)
                : null;
        }

        return topic;
    }

    public async getTopicDomainsOfTopic(id: string): Promise<StaticLwpTopicDomain[]> {
        return await this.topicDomainService.getTopicDomainsOfTopic(id);
    }

    public async getDomainsAndYearGroupsForTopic(id: string): Promise<StaticLwpTopicDomainYearGroup[]> {
        return await this.lwpTopicDomainYearGroupService.getDomainsAndYearGroupsForTopic(id);
    }

    public async getTopicWithActivitiesForAdmin(id: string): Promise<TopicWithActivitiesForAdmin> {
        let topic: StaticLwpTopic | null = null;

        topic = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoinAndSelect('topic.activities', 'activities')
            .where('topic.id = :id', { id })
            .getOne();

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        const topicWithActivitiesForAdmin = new TopicWithActivitiesForAdmin();

        topicWithActivitiesForAdmin.id = topic?.id;
        topicWithActivitiesForAdmin.teacherTopicName = topic?.teacherTopicName;
        topicWithActivitiesForAdmin.activities =
            topic?.activities?.length > 0
                ? topic?.activities.map((activity) => {
                      activity.cardImage = activity?.cardImage
                          ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`)
                          : null;

                      return activity;
                  })
                : [];

        return topicWithActivitiesForAdmin;
    }

    public async getDemoTopic(topicId: string, magicLinkUrl?: string): Promise<StaticLwpTopic> {
        let skip = false;

        const topic = await this.topicRepository.findOne({ where: { id: topicId } });

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        if (magicLinkUrl) {
            const magicLink = await this.magicLinkService.verifyMagicLink(magicLinkUrl, null);

            if (magicLink?.context?.topicId === topic?.id) skip = true;
        }

        if (!skip && !topic.isDemo) throw new HttpException('This Topic is not for demo', ErrorStatusCodeEnum._535);

        if (topic) {
            topic.video = topic.video ? `${appConstants.vimeoBaseUrl}/${topic.video}` : null;
            topic.teacherPdf = topic?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${topic?.teacherPdf}`)
                : null;
            topic.videoThumb = topic.videoThumb
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${topic.videoThumb}`)
                : null;
        }

        return topic;
    }

    public async getTopicByClassTopic(classTopicId: string): Promise<StaticLwpTopic> {
        const classTopicBase = await this.queryBaseService.classTopicTopicBase(classTopicId);
        const topic = await classTopicBase.select('topic').getRawOne();
        const newTopic = Object.assign({}, ...this.helperService.changeObjKeys(topic, 'topic_'));

        if (newTopic?.id) {
            newTopic.video = newTopic.video ? `${appConstants.vimeoBaseUrl}/${newTopic.video}` : null;
            newTopic.teacherPdf = newTopic?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${newTopic?.teacherPdf}`)
                : null;
            newTopic.videoThumb = newTopic.videoThumb
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${newTopic.videoThumb}`)
                : null;

            return newTopic;
        }

        return null;
    }

    public async getTopicByStaticActivity(staticActivityId: string): Promise<StaticLwpTopic> {
        const pupilParentBase = await this.queryBaseService.staticActivityTopicBase(staticActivityId);
        const topic = await pupilParentBase.select('topic').getRawOne();
        const newTopic = Object.assign({}, ...this.helperService.changeObjKeys(topic, 'topic_'));

        if (newTopic?.id) {
            newTopic.video = newTopic.video ? `${appConstants.vimeoBaseUrl}/${newTopic.video}` : null;
            newTopic.teacherPdf = newTopic?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${newTopic?.teacherPdf}`)
                : null;
            newTopic.videoThumb = newTopic.videoThumb
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${newTopic.videoThumb}`)
                : null;

            return newTopic;
        }

        return null;
    }

    public async getTopicsByActivityIds(activityIds: readonly string[]): Promise<StaticLwpTopic[]> {
        const activities = await this.staticLwpActivityRepository.find({
            where: { id: In(activityIds as string[]) },
            relations: ['topic']
        });

        const topicsMap = new Map<string, StaticLwpTopic>();

        activities.forEach((activity) => {
            if (activity.topic) {
                const topic = activity.topic;

                topic.video = topic.video ? `${appConstants.vimeoBaseUrl}/${topic.video}` : null;
                topic.teacherPdf = topic.teacherPdf
                    ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${topic.teacherPdf}`)
                    : null;
                topic.videoThumb = topic.videoThumb
                    ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${topic.videoThumb}`)
                    : null;
                topicsMap.set(activity.id, topic);
            }
        });

        const topics: (StaticLwpTopic | null)[] = [];

        activityIds.forEach((id) => {
            topics.push(topicsMap.get(id) || null);
        });

        return topics;
    }

    public async deleteTopic(staticTopicId: string, deletedById: string): Promise<OperationStatus> {
        const staticTopic = await this.topicRepository.findOne({
            where: { id: staticTopicId },
            relations: ['classTopics', 'activities']
        });

        if (staticTopic?.classTopics?.length > 0)
            throw new HttpException('You cannot delete this topic because it has class topics.', ErrorStatusCodeEnum._535);

        await this.connection.manager.transaction(async (manager) => {
            if (staticTopic?.activities?.length > 0) {
                for (const staticActivity of staticTopic.activities) {
                    await this.activityService.deleteActivity(staticActivity?.id, deletedById, manager);
                }
            }

            const res = await manager.update(StaticLwpTopic, staticTopicId, {
                deletedBy: this.shallowUserService.newShallowUser(deletedById)
            });

            if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;

            return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
        });

        return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    private async applyProgrammeFilterBasedOnClass(
        query: SelectQueryBuilder<StaticLwpYearGroup | StaticLwpSubject | StaticLwpTopicDomain | StaticLwpTopic>,
        schoolId?: string,
        classId?: string,
        classDetail?: LwpSchoolClass
    ): Promise<void> {
        if (classId) {
            const schoolClass =
                classDetail ||
                (await this.schoolClassRepository
                    .createQueryBuilder('schoolClass')
                    .leftJoin('schoolClass.school', 'school')
                    .where('schoolClass.id = :classId', { classId })
                    .select([
                        'schoolClass.id',
                        'schoolClass.isRegistrationClass',
                        'schoolClass.isReadyTeddyEnabled',
                        'schoolClass.IsReadingLogsEnabled',
                        'schoolClass.isFullProgramme',
                        'schoolClass.isGroupAcrossClasses',
                        'school.isMoneySkillsAvailable'
                    ])
                    .getOne());

            if (!schoolClass) throw new HttpException('School class not found', ErrorStatusCodeEnum._535);

            const { isGroupAcrossClasses } = schoolClass;

            const allowedProgrammes = allowedProgrammeTypesForClass(schoolClass);

            if (!allowedProgrammes.length) {
                if (isGroupAcrossClasses) query.andWhere('1 = 0');
            } else {
                query.andWhere('subject.programmeType IN (:...allowedProgrammes)', { allowedProgrammes });
            }
        } else {
            const schoolClassPrograms = await this.schoolRepository
                .createQueryBuilder('school')
                .innerJoin(
                    'school.classes',
                    'classes',
                    `classes."periodIndex" >= school."curentPeriodIndex" AND classes."isRegistrationClass" = :isRegistrationClass and classes.status = :status`,
                    { isRegistrationClass: true, status: SchoolClassStatus.ACTIVE }
                )
                .where('school.id = :schoolId', { schoolId })
                .select([
                    `COALESCE(bool_or(classes."isFullProgramme"), false) AS "haveFullProgrammLicenceClasses"`,
                    `COALESCE(bool_or(classes."isReadyTeddyEnabled"), false) AS "haveReadyTeddyLicenceClasses"`,
                    `COALESCE(bool_or(school."isMoneySkillsAvailable" and (classes."isFullProgramme"OR classes."IsReadingLogsEnabled")), false) AS "haveMoneySkillsAvailable"`
                ])
                .getRawOne();

            const allowedProgrammes: SubjectProgrammeType[] = [];

            if (schoolClassPrograms?.haveFullProgrammLicenceClasses) allowedProgrammes.push(SubjectProgrammeType.FULL_PROGRAMME);
            if (schoolClassPrograms?.haveReadyTeddyLicenceClasses) allowedProgrammes.push(SubjectProgrammeType.READY_TEDDY);
            if (schoolClassPrograms?.haveMoneySkillsAvailable) allowedProgrammes.push(SubjectProgrammeType.MONEY_SKILLS);

            if (!allowedProgrammes.length)
                throw new HttpException(
                    'No active classes found for the school with available topic and activity programmes.',
                    ErrorStatusCodeEnum._535
                );

            query.andWhere('subject.programmeType IN (:...allowedProgrammes)', { allowedProgrammes });
        }
    }

    public async allTopics(filter: TopicFilter, schoolId?: string, classId?: string): Promise<StaticLwpTopic[]> {
        const allTopicsBase = this.topicRepository
            .createQueryBuilder('topics')
            .leftJoin('topics.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('topics.schoolTags', 'schoolTag')
            .leftJoin('topics.tags', 'topicTag')
            .leftJoin('schoolTag.schoolAndTag', 'schoolAndTag')
            .leftJoin('schoolAndTag.school', 'school')
            .leftJoin('domainsAndYearGroups.yearGroup', 'yearGroup')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .leftJoin('domain.subject', 'subject')
            .andWhere('topics.isReading = :isReading', { isReading: false });

        if (filter?.isHidden != null) {
            allTopicsBase.andWhere('topics.isHidden = :isHidden', { isHidden: filter?.isHidden });
        }

        if (schoolId) {
            allTopicsBase
                .andWhere('topics.isHidden = :isHidden', { isHidden: false })
                .andWhere('topics.isPublished = :isPublished', { isPublished: true })
                .andWhere(
                    new Brackets((qb) => {
                        qb.where('schoolTag.id IS NULL').orWhere('school.id = :schoolId', {
                            schoolId
                        });
                    })
                );
        }

        if (filter?.year?.length) {
            allTopicsBase.andWhere(
                new Brackets((qb) => {
                    qb.where('yearGroup.id IN (:...year)', { year: filter?.year });
                })
            );
        }

        if (filter?.subjects?.length) {
            allTopicsBase.andWhere('subject.id IN (:...subjects)', { subjects: filter.subjects });
        }

        if (filter?.domain?.length) {
            allTopicsBase.andWhere('domain.id IN (:...domainId)', { domainId: filter.domain });
        }

        if (classId || schoolId) {
            await this.applyProgrammeFilterBasedOnClass(allTopicsBase, schoolId, classId);
        }

        const topics = await allTopicsBase.orderBy('topics.teacherTopicName', 'ASC').addOrderBy('topics.parentTopicName', 'ASC').getMany();

        return topics.map((topic) => {
            topic.video = topic.video ? `${appConstants.vimeoBaseUrl}/${topic.video}` : null;
            topic.teacherPdf = topic?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${topic?.teacherPdf}`)
                : null;
            topic.videoThumb = topic.videoThumb
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForTopics}/${topic.videoThumb}`)
                : null;

            return topic;
        });
    }

    /**
     * Retrieves year groups that have associated topics.
     * If a topic is restricted to a specific school, only the year groups associated with that school are included.
     * Otherwise, year groups with topics that are not limited to any specific school are also included.
     */
    public async allYearGroupsWithTopics(schoolId: string, classId: string): Promise<StaticLwpYearGroup[]> {
        const classDetail = classId
            ? await this.schoolClassRepository
                  .createQueryBuilder('schoolClass')
                  .leftJoin('schoolClass.parentClass', 'parentClass')
                  .where('schoolClass.id = :classId', { classId })
                  .select([
                      'schoolClass.isRegistrationClass',
                      'schoolClass.isReadyTeddyEnabled',
                      'schoolClass.isFullProgramme',
                      'parentClass.id'
                  ])
                  .getOne()
            : null;

        const yearGroupQuery = this.yearGroupRepository
            .createQueryBuilder('yearGroup')
            .leftJoin('yearGroup.topicsAndDomains', 'topicsAndDomains')
            .leftJoin('topicsAndDomains.domain', 'domain')
            .leftJoin('domain.subject', 'subject')
            .leftJoin('topicsAndDomains.topic', 'topic')
            .leftJoin('topic.tags', 'topicTag')
            .leftJoin('topic.schoolTags', 'schoolTags')
            .leftJoin('schoolTags.schoolAndTag', 'schoolAndTag')
            .leftJoin('schoolAndTag.school', 'school')
            .where('topic.id IS NOT NULL AND topic.isHidden = :isHidden AND topic.isPublished = :isPublished', {
                isHidden: false,
                isPublished: true
            })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('schoolTags.id IS NULL').orWhere('school.id = :schoolId', {
                        schoolId
                    });
                })
            );

        /**
         * If the class is a group class, we will only display the year groups that contain topics for the class group subjects.
         */
        if (classDetail && classDetail?.parentClass?.id) {
            yearGroupQuery.leftJoin('subject.classes', 'classes').where('classes.id = :classId', { classId });
        }

        await this.applyProgrammeFilterBasedOnClass(yearGroupQuery, schoolId, classId);

        return await yearGroupQuery.orderBy('yearGroup.year', 'ASC').groupBy('yearGroup.id').getMany();
    }

    /**
     * Retrieves subjects that have associated topics.
     * If a topic is restricted to a specific school, only the subjects associated with that school are included.
     * Otherwise, subjects with topics that are not limited to any specific school are also included.
     */
    public async allSubjectsWithTopics(schoolId: string, yearGroupIds?: string[], classId?: string): Promise<StaticLwpSubject[]> {
        const classDetail = classId
            ? await this.schoolClassRepository
                  .createQueryBuilder('schoolClass')
                  .leftJoin('schoolClass.parentClass', 'parentClass')
                  .leftJoin('schoolClass.school', 'school')
                  .where('schoolClass.id = :classId', { classId })
                  .select([
                      'schoolClass.id',
                      'schoolClass.isRegistrationClass',
                      'schoolClass.isReadyTeddyEnabled',
                      'schoolClass.IsReadingLogsEnabled',
                      'schoolClass.isGroupAcrossClasses',
                      'schoolClass.isFullProgramme',
                      'school.isMoneySkillsAvailable',
                      'parentClass.id'
                  ])
                  .getOne()
            : null;

        const subjectBaseQuery: SelectQueryBuilder<StaticLwpSubject> = this.subjectRepository
            .createQueryBuilder('subject')
            .leftJoin('subject.topicDomain', 'topicDomain')
            .leftJoin('topicDomain.topicsAndYearGroups', 'topicsAndYearGroups')
            .leftJoin('topicsAndYearGroups.topic', 'staticTopic')
            .leftJoin('staticTopic.tags', 'topicTag')
            .leftJoin('staticTopic.schoolTags', 'schoolTags')
            .leftJoin('schoolTags.schoolAndTag', 'schoolAndTag')
            .leftJoin('schoolAndTag.school', 'school')
            .where('staticTopic.id IS NOT NULL AND staticTopic.isHidden = :isHidden AND staticTopic.isPublished = :isPublished', {
                isHidden: false,
                isPublished: true
            })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('schoolTags.id IS NULL').orWhere('school.id = :schoolId', {
                        schoolId
                    });
                })
            );

        if (yearGroupIds.length > 0) {
            subjectBaseQuery
                .leftJoin('topicsAndYearGroups.yearGroup', 'yearGroup')
                .andWhere('yearGroup.id IN (:...yearGroupIds)', { yearGroupIds });
        }

        // if the class is group then we will only show that class group subjects
        if (classId && classDetail?.parentClass?.id) {
            subjectBaseQuery.leftJoin('subject.classes', 'classes').andWhere('classes.id = :classId', { classId });
        }

        await this.applyProgrammeFilterBasedOnClass(subjectBaseQuery, schoolId, classId, classDetail);

        return await subjectBaseQuery.select(['subject.id', 'subject.name']).getMany();
    }

    /**
     * Retrieves topic domains that have associated topics.
     * If a topic is restricted to a specific school, only the domains associated with that school are included.
     * Otherwise, domains with topics that are not limited to any specific school are also included.
     */
    public async allTopicDomainsWithTopics(
        schoolId: string,
        yearGroupIds?: string[],
        subjects?: string[],
        classId?: string
    ): Promise<StaticLwpTopicDomain[]> {
        const topicDomainBaseQuery: SelectQueryBuilder<StaticLwpTopicDomain> = this.topicDomainRepository
            .createQueryBuilder('topicDomain')
            .leftJoin('topicDomain.topicsAndYearGroups', 'topicsAndYearGroups')
            .leftJoin('topicDomain.subject', 'subject')
            .leftJoin('topicsAndYearGroups.topic', 'topic')
            .leftJoin('topic.tags', 'topicTag')
            .leftJoin('topic.schoolTags', 'schoolTags')
            .leftJoin('schoolTags.schoolAndTag', 'schoolAndTag')
            .leftJoin('schoolAndTag.school', 'school')
            .where('topic.id IS NOT NULL AND topic.isHidden = :isHidden AND topic.isPublished = :isPublished', {
                isHidden: false,
                isPublished: true
            })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('schoolTags.id IS NULL').orWhere('school.id = :schoolId', {
                        schoolId
                    });
                })
            );

        if (yearGroupIds?.length > 0) {
            topicDomainBaseQuery
                .leftJoin('topicsAndYearGroups.yearGroup', 'yearGroup')
                .andWhere('yearGroup.id IN (:...yearGroupIds)', { yearGroupIds });
        }

        if (subjects?.length > 0) {
            topicDomainBaseQuery.andWhere('subject.id IN (:...subjects)', { subjects });
        }

        await this.applyProgrammeFilterBasedOnClass(topicDomainBaseQuery, schoolId, classId);

        return await topicDomainBaseQuery.orderBy('topicDomain.title', 'ASC').getMany();
    }

    public async getTopicsCountOfDomain(domainId: string): Promise<number> {
        const topicsCount = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .where('domain.id = :domainId', { domainId })
            .getCount();

        return topicsCount;
    }

    public async getTopicsOfDomain(domainId: string): Promise<StaticLwpTopic[]> {
        const topics = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .where('domain.id = :domainId', { domainId })
            .getMany();

        return topics;
    }

    public async getSchoolTags(topicId: string): Promise<StaticLwpSchoolTag[]> {
        return await this.staticLwpTopicSchoolRepository
            .createQueryBuilder('schoolTag')
            .leftJoin('schoolTag.topics', 'topic')
            .where('topic.id = :topicId', { topicId })
            .orderBy('schoolTag.id', 'ASC')
            .getMany();
    }

    /**
     * Batch method for DataLoader: Get school tags for multiple topic IDs
     */
    public async getSchoolTagsByTopicIds(topicIds: readonly string[]): Promise<StaticLwpSchoolTag[][]> {
        if (topicIds.length === 0) return [];

        const schoolTags = await this.staticLwpTopicSchoolRepository
            .createQueryBuilder('schoolTag')
            .leftJoinAndSelect('schoolTag.topics', 'topic')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .orderBy('schoolTag.id', 'ASC')
            .getMany();
        const schoolTagsByTopicId = {} as Record<string, StaticLwpSchoolTag[]>;

        schoolTags.forEach((schoolTag) => {
            schoolTag.topics.forEach((topic) => {
                const topicId = topic.id;

                if (topicIds.includes(topicId)) {
                    if (!schoolTagsByTopicId[topicId]) {
                        schoolTagsByTopicId[topicId] = [];
                    }

                    schoolTagsByTopicId[topicId].push(schoolTag);
                }
            });
        });

        const result: StaticLwpSchoolTag[][] = [];

        topicIds.forEach((topicId) => {
            result.push(schoolTagsByTopicId[topicId] || []);
        });

        return result;
    }

    public async isReadyTeddyTopic(topicId: string): Promise<boolean> {
        const topic: { isReadyTeddyTopic: boolean } = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.tags', 'topicTags')
            .leftJoin('topic.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .leftJoin('domain.subject', 'subject')
            .where('topic.id = :topicId', { topicId })
            .select([`COALESCE(BOOL_OR(subject.programmeType = '${SubjectProgrammeType.READY_TEDDY}'), false) AS "isReadyTeddyTopic"`])
            .getRawOne();

        return topic?.isReadyTeddyTopic;
    }

    /**
     * Batch method for DataLoader: Check if topics are Ready Teddy for multiple topic IDs
     */
    public async areReadyTeddyTopics(topicIds: readonly string[]): Promise<(boolean | Error)[]> {
        if (topicIds.length === 0) return [];

        const topics = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .leftJoin('domain.subject', 'subject')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .groupBy('topic.id')
            .select([
                'topic.id AS id',
                `COALESCE(BOOL_OR(subject.programmeType = '${SubjectProgrammeType.READY_TEDDY}'), false) AS "isReadyTeddyTopic"`
            ])
            .getRawMany();

        const topicsMap = new Map();

        topics.forEach((t) => {
            topicsMap.set(t.id, t.isReadyTeddyTopic);
        });

        const result: boolean[] = [];

        topicIds.forEach((id) => {
            result.push(topicsMap.get(id) ?? false);
        });

        return result;
    }

    public async topicsHaveSetByTeacherSteps(topicIds: readonly string[]): Promise<boolean[]> {
        if (topicIds.length === 0) return [];

        const rows = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.activities', 'activity')
            .leftJoin('activity.steps', 'step')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .andWhere('activity.isHidden = false')
            .groupBy('topic.id')
            .select([
                'topic.id AS id',
                `COALESCE(BOOL_OR(step.stepType = '${ActivityStepType.SET_BY_TEACHER}'), false) AS "hasSetByTeacherSteps"`
            ])
            .getRawMany<{ id: string; hasSetByTeacherSteps: boolean }>();

        const resultMap = new Map(rows.map((r) => [r.id, r.hasSetByTeacherSteps]));

        return topicIds.map((id) => resultMap.get(id) ?? false);
    }

    public async topicsHaveBeenReleasedInCurrentOrFutureAcademicYear(topicIds: readonly string[]): Promise<boolean[]> {
        if (topicIds.length === 0) return [];

        const releasedRows = await this.topicRepository
            .createQueryBuilder('topic')
            .innerJoin('topic.pupilTopics', 'pt')
            .innerJoin('pt.pupil', 'pupil')
            .innerJoin('pupil.school', 'school')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .andWhere('"pt"."periodIndex" >= "school"."curentPeriodIndex"')
            .select('topic.id AS id')
            .distinct(true)
            .getRawMany<{ id: string }>();

        const releasedSet = new Set(releasedRows.map((r) => r.id));

        return topicIds.map((id) => releasedSet.has(id));
    }
}
