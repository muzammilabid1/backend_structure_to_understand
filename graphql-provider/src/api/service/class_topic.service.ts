import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import _ from 'lodash';
import { SetByTeacherDataType, SubjectProgrammeType } from 'lwp-shared';
import moment from 'moment';
import newrelic from 'newrelic/index';
import { Weekday } from 'src/api/types/weekday';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { appConstants } from 'src/constants';
import { BaseEntity, Connection, type EntityManager, In, MoreThanOrEqual, Repository } from 'typeorm';

import { ClassTopicForClassDetailPageOutput } from '../dtos/ClassTopicForClassDetailPageOutput';
import { PupilReadingLogFeedbacksOutput } from '../dtos/PupilReadingLogFeedbacksOutput';
import { ReadingTopicOutput } from '../dtos/ReadingTopicOutput';
import { StaticLwpActivitySteps } from '../entities/activity';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpSetByTeacherStepMedia } from '../entities/lwp_set_by_teacher_step_media';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import {
    AddTopicToClassesInput,
    ClassTopicDeleteOptions,
    ClassTopicInput,
    ClassTopicStatistics,
    ErrorStatusCodeEnum,
    OperationStatus,
    ReadingNoteInput,
    SetByTeacherStepMessageInput,
    UpdateClassTopicInput
} from '../model';
import { HelperService } from './helper.service';
import { LwpPupilFeedbackService } from './lwp_pupil_feedback.service';
import { ParameterService } from './parameter.service';
import { PupilTopicService } from './pupil_topic.service';
import { QueryBaseService } from './query_base.service';

export function parseSetByTeacherStepEntry(entry: string): { stepId: string; fileIdentifier: string | null } {
    const colonIndex = entry.indexOf(':');

    return colonIndex !== -1
        ? { stepId: entry.substring(0, colonIndex), fileIdentifier: entry.substring(colonIndex + 1) }
        : { stepId: entry, fileIdentifier: null };
}

/** Staged uploads are prefixed on the way in; the per-class copy drops it. */
const STAGED_PREFIX_PATTERN = /^staged_\d+_/;

/**
 * What a teacher reads when saving a class topic fails for a reason that is ours, not theirs: storage refusing a
 * set-by-teacher file, or the database refusing the rows. It names what they were doing rather than the part
 * that failed, which they cannot act on, and the real error is logged. Raw storage and database errors carry no
 * status, and some no message, so the schedule forms would otherwise show a generic, raw or even blank error.
 */
export const CLASS_TOPIC_SAVE_FAILED = "We couldn't save this topic. Please try again.";

/** A file in object storage, addressed the way `HelperService` addresses it. */
export interface StoredFile {
    folder: string;
    filename: string;
}

/** A file already stored under its final name for one class, ready for its media row to be written. */
interface CopiedStagedFile extends StoredFile {
    stepId: string;
}

/**
 * Media for a new class topic, always stored before the transaction opens. The single-class route
 * uploads the teacher's files straight to their final names; the Set a Topic route stages them once
 * and copies per class. Either way the transaction only writes the rows.
 */
export type ClassTopicMedia = { route: 'staged'; copied: CopiedStagedFile[] };

/**
 * One class topic with its ids already resolved to entities, ready to be written.
 *
 * `logCreatedBy` is the resolved user row, which the teacher routes deliberately allow to be null so
 * an unknown id yields NULL rather than a foreign key error. `createdBy` is the acting user's id,
 * used for the media rows' audit columns, and is kept separate for exactly that reason.
 */
export interface ClassTopicWriteRequest {
    schoolClass: LwpSchoolClass;
    topic: StaticLwpTopic;
    releaseDate: Date;
    dueDate?: Date | null;
    teacherMessage?: string;
    createdBy: string;
    logCreatedBy: LwpUser | null;
    classSequenceAssignment?: LwpClassSequenceAssignment;
    /** Linked only for a registration or group-across-classes class, and only if not already linked. */
    subjectsToLink?: StaticLwpSubject[];
    media?: ClassTopicMedia;
    /** Written inside the transaction, after the media rows they belong to, so a failure undoes the whole write. */
    stepMessages?: SetByTeacherStepMessageInput[];
}

/**
 * State shared by every class topic written inside one transaction.
 *
 * **The one rule in this file: inside a transaction we only touch the database.** Object storage has
 * no rollback, so a file that needs deleting is recorded rather than deleted, and the owner of the
 * transaction acts on it at the only safe moment. `storedFiles` is the operation-wide undo list,
 * appended as each file lands so a failure part way through still has the complete list.
 */
export interface ClassTopicWriteContext {
    manager: EntityManager;
    /** Files put into storage for this operation. Delete these, and only these, if it rolls back. */
    storedFiles: StoredFile[];
    /** `classId:subjectId` links written in this operation, so a second write does not collide. */
    linkedSubjects: Set<string>;
    /** RELEASED_TIME, read once per operation rather than once per row. */
    releaseTime?: string;
}

/** Work that is only safe once the transaction has committed. */
export interface ClassTopicWriteEffects {
    /** Originals this write replaced. The new filenames are committed, so these can go. */
    supersededFiles: StoredFile[];
}

@Injectable()
export class ClassTopicService {
    constructor(
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(StaticLwpTopic)
        private staticLwpTopicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpSubject)
        private staticLwpSubjectRepository: Repository<StaticLwpSubject>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(StaticLwpActivitySteps)
        private activityStepsRepository: Repository<StaticLwpActivitySteps>,
        private helperService: HelperService,
        private pupilTopicService: PupilTopicService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private queryBaseService: QueryBaseService,
        private parameterService: ParameterService,
        private shallowUserService: ShallowUserService,
        private connection: Connection
    ) {}

    /**
     * Builds an unsaved class topic row, shared by every path that schedules a topic to a class:
     * the teacher-facing {@link addClassTopic} and the sequence materialization in
     * `ClassSequenceAssignmentService`. Keeping the row shape in one place means a column that
     * must be set at creation cannot be missed by one caller and set by the other.
     *
     * Deliberately does not save and does not open a transaction, so the caller owns the
     * transaction boundary. Sequence materialization needs many rows in a single transaction.
     *
     * `logCreatedBy` is passed in rather than resolved here, because the callers differ: the
     * teacher path looks the user up so a bad id yields NULL instead of a foreign key error,
     * while materialization already holds a shallow user.
     */
    public async buildClassTopicRow(params: {
        schoolClass: LwpSchoolClass;
        topic: StaticLwpTopic;
        releaseDate: Date;
        dueDate?: Date | null;
        teacherMessage?: string;
        logCreatedBy: LwpUser | null;
        classSequenceAssignment?: LwpClassSequenceAssignment;
        /** RELEASED_TIME, when the caller has already resolved it once for the whole operation. */
        releaseTime?: string;
    }): Promise<LwpClassTopic> {
        const { schoolClass, topic, releaseDate, dueDate, teacherMessage, logCreatedBy, classSequenceAssignment } = params;

        const newClassTopic = new LwpClassTopic();
        // Read here only when the caller has not supplied it, so a multi-row write does not repeat it.
        const releaseTime = params.releaseTime ?? (await this.parameterService.getParameterByKey('RELEASED_TIME'))?.value;

        newClassTopic.topic = topic;
        newClassTopic.class = schoolClass;
        newClassTopic.logCreatedBy = logCreatedBy;
        newClassTopic.releaseDate = this.helperService.getDateTimeFormat(releaseDate, releaseTime);
        newClassTopic.dueDate = dueDate ? new Date(moment(dueDate).format('YYYY-MM-DD')) : null;
        newClassTopic.displayDate = dueDate
            ? `Due By ${moment(dueDate).format('YYYY-MM-DD')}`
            : `Released on ${moment(releaseDate).format('YYYY-MM-DD')}`;
        newClassTopic.teacherMessage = teacherMessage;
        newClassTopic.logCreatedAt = new Date();

        if (classSequenceAssignment) newClassTopic.classSequenceAssignment = classSequenceAssignment;

        return newClassTopic;
    }

    /**
     * Schedules one topic to one class. The signature is unchanged, so the single-class mutation and
     * the two test-data seeders in `PupilService` are unaffected.
     */
    public async addClassTopic(input: ClassTopicInput, files?: FileUpload[]): Promise<LwpClassTopic> {
        const [classTopic] = await this.runClassTopicWrite(async (storedFiles) => {
            const topic = await this.resolveTopicForWrite(input.topicId);
            const schoolClass = await this.loadClassForWrite(input.classId);

            // After both checks, so a request rejected for its topic or class stores nothing.
            const uploaded =
                input.setByTeacherStepIds?.length && files?.length
                    ? await this.uploadSetByTeacherFiles(
                          input.setByTeacherStepIds,
                          // GraphQL Upload scalars arrive as Promises; resolve before touching .filename
                          await Promise.all(files.filter(Boolean)),
                          storedFiles
                      )
                    : [];

            return [
                {
                    schoolClass,
                    topic,
                    releaseDate: input.releaseDate,
                    dueDate: input.dueDate,
                    teacherMessage: input.teacherMessage,
                    createdBy: input.createdBy,
                    logCreatedBy: await this.userRepository.findOne({ where: { id: input.createdBy } }),
                    subjectsToLink: this.subjectsOfTopic(topic),
                    // A new class topic has no media to replace, so the insert-only staged route fits.
                    media: uploaded.length ? { route: 'staged' as const, copied: uploaded } : undefined,
                    stepMessages: input.setByTeacherStepMessages
                }
            ];
        });

        return classTopic;
    }

    /**
     * Schedules one topic to several classes in a single transaction, so a failure on any class leaves
     * none of them created. Each class used to commit separately, which left the teacher looking at an
     * error over a partially applied change.
     */
    public async addTopicToClasses(input: AddTopicToClassesInput, files: FileUpload[], userId: string): Promise<void> {
        /*
         * The same class twice would create the topic twice and then collide on the subject link,
         * which one shared transaction turns from a stray duplicate row into a failed operation.
         */
        const classIds = [...new Set(input.classId ?? [])];

        if (!classIds.length) return;

        /*
         * Staged once, outside any transaction, and copied per class afterwards. The files are
         * identical for every class, so uploading them again per class would be pure waste, and the
         * upload must not sit inside the transaction that spans all of them.
         */
        const staged =
            input.setByTeacherStepIds?.length && files?.length ? await this.stageSetByTeacherFiles(files, input.setByTeacherStepIds) : [];

        try {
            await this.runClassTopicWrite(async (storedFiles) => {
                // Resolved once for the whole operation: it is the same topic, user and subject list
                // for every class, so re-reading them per class was N copies of the same query.
                const topic = await this.resolveTopicForWrite(input.topicId);
                const logCreatedBy = await this.userRepository.findOne({ where: { id: userId } });
                const subjectsToLink = this.subjectsOfTopic(topic);

                const requests: ClassTopicWriteRequest[] = [];

                for (const classId of classIds) {
                    requests.push({
                        schoolClass: await this.loadClassForWrite(classId),
                        topic,
                        releaseDate: input.releaseDate,
                        dueDate: input.dueDate,
                        teacherMessage: input.teacherMessage,
                        createdBy: userId,
                        logCreatedBy,
                        subjectsToLink,
                        media: staged.length
                            ? { route: 'staged', copied: await this.copyStagedMediaForClass(staged, classId, storedFiles) }
                            : undefined,
                        stepMessages: staged.length ? input.setByTeacherStepMessages : undefined
                    });
                }

                return requests;
            });
        } finally {
            if (staged.length) await this.deleteSetByTeacherStagedFiles(staged);
        }
    }

    /**
     * The commit boundary for creating class topics, and the only place that knows when storage work
     * is safe to do. Three phases, in this order and for a reason:
     *
     * 1. `buildRequests` resolves the entities and stores any files under their final names (uploaded
     *    for one class, copied from the staged originals for several), outside the transaction,
     *    recording each file it stores as it lands so a later failure can undo it.
     * 2. One transaction writes every row. Pure SQL, so it is never held open across a network call.
     * 3. After the commit, superseded files are deleted.
     *
     * Phase 3 deliberately sits outside the `catch`: once the transaction has committed, a failure
     * while tidying up must not delete files the committed rows still point at. It cannot fail the
     * request either: it only deletes files, and a delete that fails is ignored.
     */
    private async runClassTopicWrite(
        buildRequests: (storedFiles: StoredFile[]) => Promise<ClassTopicWriteRequest[]>
    ): Promise<LwpClassTopic[]> {
        const storedFiles: StoredFile[] = [];

        let written: { classTopics: LwpClassTopic[]; effects: ClassTopicWriteEffects[] };

        try {
            const requests = await buildRequests(storedFiles);

            written = await this.connection.transaction(async (manager) => {
                const context = await this.beginClassTopicWrite(manager, storedFiles);

                const classTopics: LwpClassTopic[] = [];
                const effects: ClassTopicWriteEffects[] = [];

                for (const request of requests) {
                    const result = await this.persistClassTopic(context, request);

                    classTopics.push(result.classTopic);
                    effects.push(result.effects);
                }

                return { classTopics, effects };
            });
        } catch (err) {
            await this.discardStoredFiles(storedFiles);

            throw this.classTopicSaveFailed(err);
        }

        await this.applyClassTopicWriteEffects(written.effects);

        return written.classTopics;
    }

    /**
     * Opens a write context for one transaction. Callers that own their own transaction, such as
     * sequence assignment, start here and must pass the same `storedFiles` array to
     * {@link discardStoredFiles} on every failure path.
     */
    public async beginClassTopicWrite(manager: EntityManager, storedFiles: StoredFile[] = []): Promise<ClassTopicWriteContext> {
        const releaseTime = await this.parameterService.getParameterByKey('RELEASED_TIME', manager);

        return { manager, storedFiles, linkedSubjects: new Set(), releaseTime: releaseTime?.value };
    }

    /**
     * Writes one class topic with its media rows and subject link, and reports what the caller must do
     * once the transaction commits. Shared by the teacher-facing routes and by sequence assignment, so
     * a column or a side effect cannot be handled by one path and missed by the other.
     *
     * Touches nothing but the database: every storage effect is recorded, never performed here.
     */
    public async persistClassTopic(
        context: ClassTopicWriteContext,
        request: ClassTopicWriteRequest
    ): Promise<{ classTopic: LwpClassTopic; effects: ClassTopicWriteEffects }> {
        const row = await this.buildClassTopicRow({
            schoolClass: request.schoolClass,
            topic: request.topic,
            releaseDate: request.releaseDate,
            dueDate: request.dueDate,
            teacherMessage: request.teacherMessage,
            logCreatedBy: request.logCreatedBy,
            classSequenceAssignment: request.classSequenceAssignment,
            releaseTime: context.releaseTime
        });

        const classTopic = await context.manager.save(row);

        await this.linkSubjectsToClass(context, request);

        const effects: ClassTopicWriteEffects = { supersededFiles: [] };

        if (request.media) {
            await this.saveCopiedStagedMedia(context, classTopic, request.media.copied, request.createdBy);
        }

        // On the transaction's own connection, which can see the media rows saved just above. If it fails,
        // the topic and its media roll back with it, so the teacher is never shown an error for a saved topic.
        if (request.stepMessages?.length) {
            await this.updateSetByTeacherMessages(context.manager, classTopic.id, request.stepMessages, request.createdBy);
        }

        return { classTopic, effects };
    }

    /**
     * Runs the deferred half of one or more class topic writes, once their transaction has committed.
     * Only deletes files, and never throws: nothing that can fail the request belongs here, because by now
     * the rows are saved.
     */
    public async applyClassTopicWriteEffects(effects: ClassTopicWriteEffects[]): Promise<void> {
        const superseded = effects.flatMap((effect) => effect.supersededFiles);

        await Promise.allSettled(superseded.map(({ folder, filename }) => this.helperService.removeFile(`${folder}/${filename}`, true)));
    }

    /**
     * Removes files a rolled-back write had already put into storage. Storage has no rollback, so this
     * is the compensating half of the transaction and must run on every failure path.
     */
    public async discardStoredFiles(storedFiles: StoredFile[]): Promise<void> {
        if (!storedFiles.length) return;

        await Promise.allSettled(storedFiles.map(({ folder, filename }) => this.helperService.removeFile(`${folder}/${filename}`, true)));
    }

    /** The topic as the scheduling paths need it: published, with its domains and their subjects. */
    private async resolveTopicForWrite(topicId: string): Promise<StaticLwpTopic> {
        const topic = await this.topicRepository
            .createQueryBuilder('slt')
            .leftJoinAndSelect('slt.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoinAndSelect('domainsAndYearGroups.domain', 'domain')
            .leftJoinAndSelect('domain.subject', 'subject')
            .where('slt.id = :id AND slt.isPublished = true', { id: topicId })
            .getOne();

        if (!topic) throw new HttpException(`${topicId} Topic does not exist`, ErrorStatusCodeEnum._535);

        return topic;
    }

    private async loadClassForWrite(classId: string): Promise<LwpSchoolClass> {
        const schoolClass = await this.schoolClassRepository.findOne({
            where: { id: classId },
            relations: ['period', 'subjects', 'school']
        });

        if (!schoolClass) throw new HttpException(`${classId} Class does not exist`, ErrorStatusCodeEnum._535);

        return schoolClass;
    }

    /** The distinct subjects a topic belongs to, which a registration class gains when it is scheduled. */
    private subjectsOfTopic(topic: StaticLwpTopic): StaticLwpSubject[] {
        return _.unionBy(
            (topic.domainsAndYearGroups ?? [])
                .map((domainAndYearGroup) => domainAndYearGroup.domain?.subject)
                .filter((subject): subject is StaticLwpSubject => Boolean(subject)),
            'id'
        );
    }

    /**
     * A registration or group-across-classes class gains the topic's subject when a topic is scheduled
     * to it. Inside the transaction, so a rolled-back write does not leave the class holding a subject
     * with nothing scheduled in it, and tracked on the context so two topics in the same operation do
     * not both try to write the same link.
     */
    private async linkSubjectsToClass(context: ClassTopicWriteContext, request: ClassTopicWriteRequest): Promise<void> {
        const { schoolClass, subjectsToLink } = request;

        if (!subjectsToLink?.length) return;
        if (!schoolClass.isRegistrationClass && !schoolClass.isGroupAcrossClasses) return;

        const alreadyLinked = new Set((schoolClass.subjects ?? []).map((subject) => subject.id));

        const missing = subjectsToLink.filter(
            (subject) => !alreadyLinked.has(subject.id) && !context.linkedSubjects.has(`${schoolClass.id}:${subject.id}`)
        );

        if (!missing.length) return;

        /*
         * A relation insert rather than saving the class entity, which arrives with its relations
         * loaded and would write more than this one link. Matches how sequence assignment does it.
         */
        await context.manager
            .createQueryBuilder()
            .relation(LwpSchoolClass, 'subjects')
            .of(schoolClass.id)
            .add(missing.map((subject) => subject.id));

        missing.forEach((subject) => context.linkedSubjects.add(`${schoolClass.id}:${subject.id}`));
    }

    /**
     * Writes the media rows for files already copied for this class. The copy itself happens before the
     * transaction opens, so this is pure SQL, and one insert for every row.
     */
    private async saveCopiedStagedMedia(
        context: ClassTopicWriteContext,
        classTopic: LwpClassTopic,
        copied: CopiedStagedFile[],
        createdBy: string
    ): Promise<void> {
        if (!copied.length) return;

        const rows = copied.map(({ stepId, filename }) => {
            const media = new LwpSetByTeacherStepMedia();

            media.classTopic = classTopic;
            media.step = { id: stepId } as StaticLwpActivitySteps;
            media.filename = filename;
            media.logCreatedBy = { id: createdBy } as LwpUser;
            media.logCreatedAt = new Date();

            return media;
        });

        await context.manager.getRepository(LwpSetByTeacherStepMedia).save(rows);
    }

    public async getClassTopics(classId: string): Promise<Omit<LwpClassTopic, keyof BaseEntity>[]> {
        const classTopics = await this.classTopicRepository.find({
            where: { class: { id: classId } },
            order: { releaseDate: 'DESC' },
            // Loaded here rather than through a field resolver, as topic, class and statistics are,
            // because the schedule only needs to know whether the topic came from a sequence. One
            // left join on a many-to-one answers that for every row, where a resolver would be a
            // query per topic. Manually scheduled topics leave it null.
            relations: ['classSequenceAssignment']
        });

        const newClassTopics: LwpClassTopic[] = classTopics
            .map((topic) => Object.assign({}, ...this.helperService.changeObjKeys(topic, 'topics_')))
            .filter((topic) => topic.id !== null);

        return newClassTopics.map((classTopic) => {
            return {
                ...classTopic,
                displayDate: classTopic?.dueDate
                    ? `Due By ${moment(classTopic.dueDate).format('DD MMM')}`
                    : `Released on ${moment(classTopic.releaseDate).format('DD MMM')}`
            };
        });
    }

    public async teacherTopicsToBeReleasedTomorrow(): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpClassTopic).query(`
                -- A topic at an inactive school is stamped without an email, so reactivating the school does not
                -- send a backlog for every topic released while it was inactive.
                with due as (
                    select
                        lct.id,
                        ls.inactive as "schoolInactive",
                        gen_notif_data(lu.*, null, 'sendTeacherTopicsToBeReleasedTomorrow', false, jsonb_build_object(
                            'SCHOOL', ls."schoolName",
                            'CLASSTOPICID', lct.id,
                            'TOPICNAME', slt."teacherTopicName",
                            'TEACHERPDF_REQUIRED', slt."isTeacherPdfRequired",
                            'PARENTTOPICNAME', slt."parentTopicName",
                            'TOPICMESSAGE', replace(slt."teacherEmailBody", '{{ class }}', lsc.name),
                            'CLASS', lsc.name,
                            'TEACHERALIAS', lu."nameForChildren",
                            'RELEASEDATE', lct."releaseDate",
                            'DUEDATE', lct."dueDate",
                            'ISRELEASED', lct.released,
                            'CLASSTOPICID', lct.id,
                            'PUBLICFILES_BASEURL', '${process.env.MINIO_PUBLIC_BASE_URL}',
                            'CLASSID', lct."classId",
                            'TEACHERPDF_FILENAME', case when slt."teacherPdf" is null then null else slt."teacherPdf" end
                        )) as notification
                    from
                        lwp_class_topic lct
                        join static_lwp_topic slt on lct."topicId" = slt.id
                            and slt."isReading" = false
                        join lwp_school_class lsc on lct."classId" = lsc.id
                        join static_lwp_period slp on lsc."periodIndex" >= slp.index and slp."isCurrentPeriod" = true
                        join lwp_user lu on lsc."mainTeacherId" = lu.id
                            and lu."userStatus" = 'ACTIVE'
                        join lwp_school ls on lsc."schoolId" = ls.id
                    where
                        lct."releaseDate" <= current_date + 1
                        and lct."teacherNotified" = false
                ),
                sent_class_topics as (
                    insert into lwp_notification overriding user value
                    select (notification).* from due where not "schoolInactive"
                )
                update lwp_class_topic set "teacherNotified" = true where id in (select id from due);
            `);
        });

        return true;
    }

    /**
     * Emails a class's main teacher the assembly slides for any topic that carries them and releases within
     * the next seven days, with its own flag so it stays independent of the day-before email. The date range
     * also keeps out past topics that were never released, which inactive schools accumulate because the
     * release job skips them. Params mirror NotificationService#sendTeacherTopicToBeReleasedNextWeek, the
     * test send.
     */
    public async teacherTopicsToBeReleasedNextWeek(): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpClassTopic).query(
                `
                with topics_with_resources as (
                    select
                        slt.id,
                        slt."teacherTopicName",
                        slt."parentTopicName",
                        slt."teacherEmailBody",
                        slt."teacherResource",
                        slt."teacherPdf"
                    from
                        static_lwp_topic slt
                    where slt."isReading" = false and slt."teacherResource" is not null
                ),
                -- A topic at an inactive school is stamped without an email, as in teacherTopicsToBeReleasedTomorrow.
                due as (
                    select
                        lct.id,
                        ls.inactive as "schoolInactive",
                        gen_notif_data(lu.*, null, 'sendTeacherTopicToBeReleasedNextWeek', false, jsonb_build_object(
                            'SCHOOL', ls."schoolName",
                            'CLASS', lsc.name,
                            'CLASSID', lct."classId",
                            'CLASSTOPICID', lct.id,
                            'TOPICNAME', twr."teacherTopicName",
                            'PARENTTOPICNAME', twr."parentTopicName",
                            'TOPICMESSAGE', coalesce(replace(twr."teacherEmailBody", '{{ class }}', lsc.name), ''),
                            'TEACHERALIAS', lu."nameForChildren",
                            'RELEASEDATE', lct."releaseDate",
                            'DUEDATE', lct."dueDate",
                            'PUBLICFILES_BASEURL', $1::text,
                            'TEACHERRESOURCE_FILENAME', twr."teacherResource",
                            'TEACHERPDF_FILENAME', twr."teacherPdf"
                        )) as notification
                    from
                        lwp_class_topic lct
                        join topics_with_resources twr on twr."id" = lct."topicId"
                        join lwp_school_class lsc on lct."classId" = lsc.id
                        join static_lwp_period slp on lsc."periodIndex" >= slp.index and slp."isCurrentPeriod" = true
                        join lwp_user lu on lsc."mainTeacherId" = lu.id
                            and lu."userStatus" = 'ACTIVE'
                        join lwp_school ls on lsc."schoolId" = ls.id
                    where
                        lct."weekBeforeTeacherNotified" = false
                        and lct.released = false
                        and lct."releaseDate" between current_date and current_date + 6
                ),
                sent_class_topics as (
                    insert into lwp_notification overriding user value
                    select (notification).* from due where not "schoolInactive"
                )
                update lwp_class_topic set "weekBeforeTeacherNotified" = true where id in (select id from due);
            `,
                [process.env.MINIO_PUBLIC_BASE_URL]
            );
        });

        return true;
    }

    /**
     * Emails the launch resources when Money Skills is first scheduled: a school's leaders when it is the first
     * topic in their school, and a class's main teacher when it is the first in their class. A school that
     * schedules Money Skills in class A tells its leaders and A's teacher; class B scheduling later tells B's
     * teacher only, since the leaders were told already and their stamp keeps them out.
     *
     * A class or school whose earliest Money Skills topic has already been released launched without this email
     * and is left alone. Only scheduling from the last two days is acted on, which is what keeps the schools
     * that scheduled Money Skills before this email existed, and were told by hand, out of the first run. Two
     * days rather than one because the job only runs inside the teacher email window: a topic scheduled after
     * today's window has passed is picked up by tomorrow's run.
     *
     * The topic filling the email is the one scheduled first, by `topicScheduledAt`, in the person's own class
     * where they are its main teacher, otherwise in their school. Only registration classes of the school's
     * current period count, and inactive schools are skipped.
     *
     * Recipients are stamped in the same statement that queues their emails, so each goes out once. Someone who
     * cannot be emailed yet, because their account is invited or inactive, is left unstamped and is sent to once
     * they are active, so long as that happens inside the same two days.
     */
    public async teacherMoneySkillsFirstTopicScheduled(): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.query(
                `
                with money_skills_topics as (
                    -- One row per topic: the subject is reached through a row per domain and year group.
                    select distinct slt.id as "topicId"
                    from
                        static_lwp_topic slt
                        join static_lwp_topic_domain_year_group sltdyg on slt.id = sltdyg."topicId"
                        join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd.id
                        join static_lwp_subject sls on sltd."subjectId" = sls.id and sls."programmeType" = $1
                ),
                class_topics as (
                    select
                        lsc."schoolId",
                        lsc.id as "classId",
                        lsc."mainTeacherId",
                        lct.id as "classTopicId",
                        lct."logCreatedAt" as "topicScheduledAt",
                        row_number() over (partition by lsc.id order by lct."logCreatedAt", lct.id) as "classRank",
                        row_number() over (partition by lsc."schoolId" order by lct."logCreatedAt", lct.id) as "schoolRank",
                        min(lct."releaseDate") over (partition by lsc.id) as "classEarliestRelease",
                        min(lct."releaseDate") over (partition by lsc."schoolId") as "schoolEarliestRelease",
                        bool_or(lct.released) over (partition by lsc.id) as "classAnyReleased",
                        bool_or(lct.released) over (partition by lsc."schoolId") as "schoolAnyReleased"
                    from
                        lwp_school ls
                        join static_lwp_period slp on ls."curentPeriodIndex" = slp.index and slp."isCurrentPeriod" = true
                        join lwp_school_class lsc
                            on lsc."schoolId" = ls.id
                            and lsc."periodIndex" = ls."curentPeriodIndex"
                            and lsc."isRegistrationClass"
                        join lwp_class_topic lct on lct."classId" = lsc.id
                        join money_skills_topics mst on mst."topicId" = lct."topicId"
                    where not ls.inactive
                ),
                first_per_class as (
                    -- The topic scheduled first in a class that has never released one, if it was scheduled just now.
                    select "classId", "mainTeacherId", "classTopicId", "topicScheduledAt"
                    from class_topics
                    where "classRank" = 1 and "classEarliestRelease" >= current_date and not "classAnyReleased" and "topicScheduledAt" >= current_date - interval '2 days'
                ),
                first_per_school as (
                    -- The topic scheduled first in a school that has never released one, if it was scheduled just now.
                    select "schoolId", "classTopicId"
                    from class_topics
                    where "schoolRank" = 1 and "schoolEarliestRelease" >= current_date and not "schoolAnyReleased" and "topicScheduledAt" >= current_date - interval '2 days'
                ),
                recipients as (
                    /*
                     * One row per person: their own class's topic where they are its main teacher, otherwise
                     * their school's. A main teacher of two classes keeps the topic scheduled first.
                     *
                     * asLeader is the person's own flag rather than whether the school arm matched, so a
                     * leader emailed for their own class is still a leader to the template.
                     */
                    select distinct on (lu.id)
                        lu.id as "userId",
                        coalesce(fc."classTopicId", fs."classTopicId") as "classTopicId",
                        fc."classTopicId" is not null as "asMainTeacher",
                        coalesce(lu."isSchoolLeader", false) as "asLeader"
                    from
                        lwp_user lu
                        left join first_per_class fc on fc."mainTeacherId" = lu.id
                        left join first_per_school fs on lu."isSchoolLeader" = true and fs."schoolId" = lu."schoolId"
                    where
                        lu."lastMoneySkillsLaunchEmailSent" is null
                        and lu.type = 'TEACHER'
                        and lu."userStatus" = 'ACTIVE'
                        and (fc."classTopicId" is not null or fs."classTopicId" is not null)
                    order by lu.id, fc."topicScheduledAt", fc."classTopicId"
                ),
                queued as (
                    insert into lwp_notification overriding user value
                    select
                        (gen_notif_data(lu.*, null, 'sendTeacherMoneySkillsFirstTopicScheduled', false, jsonb_build_object(
                            'SCHOOL', ls."schoolName",
                            'CLASS', lsc.name,
                            'CLASSID', lsc.id,
                            'CLASSTOPICID', lct.id,
                            'TOPICNAME', slt."teacherTopicName",
                            'PARENTTOPICNAME', slt."parentTopicName",
                            'TEACHERALIAS', lu."nameForChildren",
                            'RELEASEDATE', lct."releaseDate",
                            'DUEDATE', lct."dueDate",
                            'PUBLICFILES_BASEURL', $2::text,
                            'TEACHERRESOURCE_FILENAME', slt."teacherResource",
                            'TEACHERPDF_FILENAME', slt."teacherPdf",
                            'TEACHERPDF_REQUIRED', slt."isTeacherPdfRequired",
                            'ISSCHOOLLEADER', r."asLeader",
                            'ISMAINTEACHER', r."asMainTeacher"
                        ))).*
                    from
                        recipients r
                        join lwp_user lu on r."userId" = lu.id
                        join lwp_class_topic lct on r."classTopicId" = lct.id
                        join lwp_school_class lsc on lct."classId" = lsc.id
                        join lwp_school ls on lsc."schoolId" = ls.id
                        join static_lwp_topic slt on lct."topicId" = slt.id
                )
                update lwp_user lu set "lastMoneySkillsLaunchEmailSent" = now()
                from recipients r
                where r."userId" = lu.id;
            `,
                [SubjectProgrammeType.MONEY_SKILLS, process.env.MINIO_PUBLIC_BASE_URL]
            );
        });

        return true;
    }

    public async sendTeacherReadingTopicEnd(scheduleDate?: Date): Promise<boolean> {
        const current_date = scheduleDate ? `'${moment(scheduleDate).format('YYYY-MM-DD')}'::date` : 'current_date';

        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpClassTopic).query(`
                -- A topic at an inactive school is stamped without an email, as in teacherTopicsToBeReleasedTomorrow.
                with due as (
                        select
                            lct.id,
                            ls.inactive as "schoolInactive",
                            gen_notif_data (lu.*, null, 'sendTeacherReadingTopicEnd', false, jsonb_build_object(
                                'SCHOOL', ls."schoolName",
                                'CLASSTOPICID', lct.id,
                                'TOPICNAME', slt."teacherTopicName",
                                'PARENTTOPICNAME', slt."parentTopicName",
                                'TOPICMESSAGE', replace(slt."teacherEmailBody", '{{ class }}', lsc.name),
                                'CLASS', lsc.name,
                                'TEACHERALIAS', lu."nameForChildren",
                                'RELEASEDATE', lct."releaseDate",
                                'DUEDATE', lct."dueDate",
                                'ISRELEASED', lct.released,
                                'CLASSTOPICID', lct.id,
                                'SCHOOL', ls."schoolName",
                                'TARGET', lct."readingTarget",
                                'CLASSID', lct."classId"
                            )) as notification
                            from
                                lwp_class_topic lct
                                join static_lwp_topic slt on lct."topicId" = slt.id
                                join lwp_school_class lsc on lct."classId" = lsc.id
                                join static_lwp_period slp on lsc."periodIndex" >= slp.index and slp."isCurrentPeriod" = true
                                join lwp_school ls on lsc."schoolId" = ls.id
                                join lwp_user lu on lsc."mainTeacherId" = lu.id and lu."userStatus" = 'ACTIVE'
                            where
                                lct."teacherNotified" = false
                                and lct."releaseDate" <= ${current_date} - interval '7 days'
                                and slt."isReading" = true
                                and lct."readingTarget" > 0
                ),
                sent_reading_topics as (
                    insert into lwp_notification overriding user value
                        select (notification).* from due where not "schoolInactive"
                )
                update
                    lwp_class_topic
                set
                    "teacherNotified" = true
                where
                    id in (
                        select
                            id
                        from
                            due);
            `);
        });

        return true;
    }

    public async createReadingTopics(): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpSchoolClass).query(
                `
                    with readingTopic as (
                        select
                            id
                        from
                            static_lwp_topic
                        where
                            "isReading" = true
                    ),
                    needingReadingTopics as (
                        select
                            distinct
                            next_rw_date."date" as "nextRWDate",
                            lsc.id as "classId",
                            case
                                -- this is a bit of a hack, but it is formally specified in SQL.
                                -- when you sum nulls, you get null back: when you sum a list
                                -- with nulls and anything else, you'll get the something else.
                                -- so, if sum of holiday IDs is null, then there are no holidays;
                                -- if the sum is not null, there is at least one holiday that applies,
                                -- and we can set the target to 0.
                                        when sum(lsh.id) is null then lsc."readingTarget"
                                else 0
                            end as "readingTarget",
                            case
                                when sum(lsh.id) is null then null
                                else min(lsh.id)
                            end as "holidayId"
                        from
                            lwp_school_class lsc
                        join (
                                select
                                    lsc.id as classId,
                                    dayNumber,
                                    case when lsc."readingLaunchDate" >= NOW() then lsc."readingLaunchDate" else CURRENT_DATE + (
                                        (
                                            (
                                                7 -- we're looking for a date next week, so we want to look into the future
                                                +
                                                dayNumber
                                            ) - extract(dow from CURRENT_DATE)::int
                                        ) % 7 -- 7 days in a week: only shift up to 6 days
                                    ) end as "date"
                                from (values (0), (1), (2), (3), (4), (5), (6)) as i(dayNumber)
                                cross join lwp_school_class lsc
                            ) next_rw_date on
                            dayNumber = lsc."readingStartDay"
                            and classId = lsc.id
                        join lwp_school ls on
                            ls.id = lsc."schoolId"
                        join static_lwp_period slp on
                            lsc."periodIndex" = slp."index"
                            and slp."isCurrentPeriod" = true
                        left join (select lct.* from lwp_class_topic lct join static_lwp_topic slt on
                            lct."topicId" = slt.id
                            and slt."isReading" = true) lcrt on
                            lcrt."classId" = lsc.id
                            and lcrt."releaseDate" <= next_rw_date."date"
                            and lcrt."releaseDate" > next_rw_date."date" - interval '1 week'
                        left join lwp_school_holidays lshs on
                            ls.id = lshs."lwpSchoolId"
                        left join lwp_school_holiday lsh on
                            lshs."lwpSchoolHolidayId" = lsh.id
                            and daterange(lsh."startDate"::date, lsh."endDate"::date) && daterange((next_rw_date."date")::date, (next_rw_date."date" + interval '6 days')::date)
                            and lsh."periodIndex" = lsc."periodIndex"
                        where
                            lsc."isRegistrationClass" is true
                            and lsc."IsReadingLogsEnabled" = true
                            and (
                                lsc."readingLaunchDate" is null
                                or lsc."readingLaunchDate" <= NOW() + interval '1 week'
                            )
                            and lcrt.id is null
                        -- don't return multiple entries for the same class.
                        group by
                            lsc.id,
                            next_rw_date."date"
                    ),
                    readingTopics as (
                        insert into lwp_class_topic (
                            "releaseDate",
                            "classId",
                            "readingTarget",
                            "topicId"
                        )
                            select
                                nrt."nextRWDate",
                                nrt."classId",
                                nrt."readingTarget",
                                rt.id
                    from
                        needingReadingTopics nrt
                    cross join readingTopic rt
                    returning "classId", id, "releaseDate"
                )

                -- Notify teachers when the reading topic is overlapping with a holiday
                insert into lwp_notification overriding user value
                select
                    (gen_notif_data(
                        lu.*,
                        null,
                        'sendTeacherReadingTopicHolidayOverlap',
                        false,
                        jsonb_build_object(
                            'SCHOOL', ls."schoolName",
                            'CLASSTOPICID', reading_topic.id,
                            'CLASS', lsc.name,
                            'TEACHERALIAS', lu."nameForChildren",
                            'RELEASEDATE', reading_topic."releaseDate",
                            'CLASSID', reading_topic."classId",
                            'HOLIDAYNAME', lsh."holidayName",
                            'HOLIDAYSTARTDATE', lsh."startDate"::date,
                            'HOLIDAYENDDATE', lsh."endDate"::date
                        )
                    )).*
                    from
                        needingReadingTopics nrt
                        join readingTopics reading_topic on reading_topic."classId" = nrt."classId"
                        join lwp_school_class lsc on reading_topic."classId" = lsc.id
                        join lwp_class_teacher lct on lct."lwpSchoolClassId" = lsc.id
                        join lwp_user lu on lct."lwpUserId" = lu.id and lu."userStatus" = 'ACTIVE'
                        join lwp_school ls on lsc."schoolId" = ls.id
                        join lwp_school_holiday lsh on lsh.id = nrt."holidayId"
                    where
                        nrt."readingTarget" = 0
                        and nrt."holidayId" is not null
                        and not ls.inactive;
                `
            );
        });
    }

    public async adminCreateThisWeekReadingTopic(classId: string): Promise<void> {
        const topic = await this.staticLwpTopicRepository.findOne({ where: { isReading: true } });

        const schoolClass = await this.schoolClassRepository.findOne({
            where: { id: classId },
            relations: ['school', 'school.curentPeriod']
        });

        const currentWeekReadingTopic = await this.getCurrentClassReadingTopic(schoolClass?.id);

        if (topic) {
            if (!currentWeekReadingTopic) {
                const nextReadingDate = moment(this.helperService.getNextDate(schoolClass?.readingStartDay)).format('YYYY MM DD');
                const nextWeekDate = await this.helperService.getTopicReleaseDate(new Date(nextReadingDate));
                const thisWeekDate = moment(nextWeekDate).subtract(1, 'w').toDate();

                const thisWeekDay = moment(thisWeekDate).day();
                const today = moment().day();

                if (thisWeekDay === today)
                    throw new HttpException(
                        `New week will start from today. Cannot create reading topic for previous week`,
                        ErrorStatusCodeEnum._535
                    );

                await this.generateClassTopic(thisWeekDate, schoolClass, topic);
            } else {
                throw new HttpException(`This week reading topic already exist.`, ErrorStatusCodeEnum._535);
            }
        }
    }

    /**
     * @param classIds Class IDs to change
     * @param newReadingStartDay New start day for reading log (1 = Monday, 7 = Sunday)
     */
    public async updateClassReadingWeekStartDay(classIds: string[], newReadingStartDay: Weekday): Promise<void> {
        await this.connection.manager.transaction(async (manager) => {
            for (const classId of classIds) {
                console.log(`Processing ${classId}...`);

                const allClassTopics: { id: string; releaseDate: string }[] = await manager.query(
                    `
                        SELECT lct.id AS id,
                            lct."releaseDate" AS "releaseDate"
                        FROM lwp_class_topic lct
                             JOIN static_lwp_topic slt on slt."isReading" = true and "topicId" = slt.id
                        WHERE
                            "classId" = $1
                        ORDER BY "releaseDate";
                    `,
                    [classId]
                );

                if (allClassTopics.length == 0) {
                    console.error('No class topics found!');

                    continue;
                }

                const firstReleaseDate = allClassTopics[0].releaseDate;
                const classTopics = allClassTopics.map((classTopic) => classTopic.id);

                const existingPupilTopics: { id: string }[] = await manager.query(
                    `
                        SELECT lpt.id AS id
                        FROM lwp_pupil_topic lpt
                                 JOIN lwp_class_topic lct on lct.id = lpt."classTopicId"
                        WHERE
                            lct.id = ANY ($1::bigint[])
                    `,
                    [classTopics]
                );
                const existingPupilTopicsIds = existingPupilTopics.map((pupilTopic) => pupilTopic.id);

                await manager.query(
                    `
                        UPDATE
                            lwp_school_class
                        SET "readingStartDay" = $1
                        WHERE
                            id = $2;
                    `,
                    [newReadingStartDay, classId]
                );

                const newFirstReleaseDate: string = (
                    await manager.query(
                        `
                            SELECT $1::date - (((7 + extract(isodow FROM $1::date) - $2)::numeric % 7) *
                                               interval '1 day') as "newDate"
                        `,
                        [firstReleaseDate, newReadingStartDay]
                    )
                )[0].newDate;

                await manager.query(
                    `
                        UPDATE
                            lwp_school_class
                        SET "readingLaunchDate" = $1
                        WHERE
                            id = $2;
                    `,
                    [newFirstReleaseDate, classId]
                );

                await manager.query(
                    `
                        DELETE
                        FROM lwp_pupil_topic
                        WHERE
                            id = ANY ($1::bigint[])
                    `,
                    [existingPupilTopicsIds]
                );
                await manager.query(
                    `
                        DELETE
                        FROM lwp_class_topic
                        WHERE
                            id = ANY ($1::bigint[])
                    `,
                    [classTopics]
                );

                await manager.query(
                    `
                        with readingTopic as (
                            select id
                            from static_lwp_topic
                            where
                                "isReading" = true
                        ),
                            allClassReadingTopicDates as (
                                select generate_series($1::date, CURRENT_DATE, interval '1 week') as "releaseDate"
                            )
                        insert
                        into lwp_class_topic ("releaseDate",
                                              "classId",
                                              "readingTarget",
                                              "topicId")
                        select acrtd."releaseDate",
                            $2,
                            case when "releaseDate" = current_date then lsc."readingTarget" else 0 end,
                            rt.id
                        from allClassReadingTopicDates acrtd
                                 join lwp_school_class lsc on lsc.id = $2
                                 cross join readingTopic rt;
                    `,
                    [newFirstReleaseDate, classId]
                );

                await this.helperService.releasePupilTopicsHelper(new Date(), manager);

                const allNewPupilTopics: { id: string }[] = await manager.query(
                    `
                        SELECT lpt.id AS id
                        FROM lwp_pupil_topic lpt
                                 JOIN lwp_class_topic lct on lct.id = lpt."classTopicId"
                        WHERE
                            lct."classId" = $1::bigint
                    `,
                    [classId]
                );

                const allNewPupilTopicsIds = allNewPupilTopics.map((pupilTopic) => pupilTopic.id);

                await this.pupilFeedbackService.updatePupilTopicStarCountReadingBatch(allNewPupilTopicsIds, manager);

                console.log(`Done processing ${classId}!`);
            }

            console.log('All done!');
        });
    }

    private generateClassTopic = async (date: Date, schoolClass: LwpSchoolClass, topic: StaticLwpTopic): Promise<void> => {
        const classTopic = new LwpClassTopic();
        const isDateInHoliday = await this.helperService.isDateInHoliday(
            date,
            schoolClass?.school?.id,
            schoolClass?.school?.curentPeriod?.index
        );

        classTopic.topic = topic;
        classTopic.class = schoolClass;
        classTopic.releaseDate = date;
        classTopic.displayDate = `Released on ${moment(date).format('YYYY-MM-DD')}`;
        classTopic.readingTarget = isDateInHoliday ? 0 : schoolClass?.readingTarget;
        classTopic.logCreatedAt = date;

        await this.classTopicRepository.save(classTopic);
    };

    public getCurrentClassReadingTopic = async (classId: string): Promise<LwpClassTopic> => {
        return this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .leftJoin('classTopic.topic', 'topic')
            .where('class.id = :schoolClassId', { schoolClassId: classId })
            .andWhere('topic.isReading = :isReading', { isReading: true })
            .andWhere('classTopic.released = true')
            .andWhere('class.IsReadingLogsEnabled = :IsReadingLogsEnabled', { IsReadingLogsEnabled: true })
            .orderBy('classTopic.releaseDate', 'DESC')
            .limit(1)
            .getOne();
    };

    public getCurrentClassTopic = async (classId: string): Promise<LwpClassTopic> => {
        return this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .leftJoin('classTopic.topic', 'topic')
            .where('class.id = :schoolClassId', { schoolClassId: classId })
            .andWhere('topic.isReading = :isReading', { isReading: false })
            .andWhere('classTopic.released = :bool', { bool: true })
            .orderBy('classTopic.releaseDate', 'DESC')
            .addOrderBy('classTopic.id', 'DESC')
            .limit(1)
            .getOne();
    };

    public getUpcomingClassTopic = async (classId: string): Promise<LwpClassTopic> => {
        return this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .leftJoin('classTopic.topic', 'topic')
            .where('class.id = :schoolClassId', { schoolClassId: classId })
            .andWhere('topic.isReading = :isReading', { isReading: false })
            .andWhere('classTopic.released = :bool', { bool: false })
            .orderBy('classTopic.releaseDate', 'ASC')
            .addOrderBy('classTopic.id', 'ASC')
            .limit(1)
            .getOne();
    };

    public async getClassTopicsForAdmin(classId: string): Promise<LwpClassTopic[]> {
        let classTopics = [];

        classTopics = await this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.class', 'schoolClass')
            .where('schoolClass.id = :classId', { classId })
            .getMany();

        return classTopics.map((classTopic) => {
            return {
                ...classTopic,
                displayDate: classTopic.dueDate
                    ? `Due By ${moment(classTopic.dueDate).format('DD MMM')}`
                    : `Released on ${moment(classTopic.releaseDate).format('DD MMM')}`
            };
        });
    }

    public async deleteClassTopic(
        id: string,
        option: ClassTopicDeleteOptions | null,
        deletedBy: string | LwpUser,
        userType: UserType
    ): Promise<OperationStatus> {
        return await this.connection.transaction(async (manager) => {
            const classTopicRepository = manager.getRepository(LwpClassTopic);

            const classTopic = await classTopicRepository
                .createQueryBuilder('classTopic')
                .leftJoinAndSelect('classTopic.pupilTopics', 'pupilTopics')
                .where('classTopic.id = :id', { id })
                .getOne();

            if (!classTopic) throw new HttpException('Class Topic does not exist', ErrorStatusCodeEnum._535);

            if (userType === UserType.ADMIN && option) {
                const pupilTopicIds = classTopic.pupilTopics
                    .filter((pupilTopic) => option === ClassTopicDeleteOptions.ALL_PUPIL_TOPICS || !pupilTopic?.earnedGoldStar)
                    .map((pupilTopic) => pupilTopic.id);

                await this.pupilTopicService.deletePupilTopics(pupilTopicIds, deletedBy, manager);
            } else if (classTopic.released) {
                throw new HttpException('This class topic is already released', ErrorStatusCodeEnum._535);
            }

            const res = await classTopicRepository.update(id, { deletedBy: this.shallowUserService.newShallowUser(deletedBy) });

            if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
            else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
        });
    }

    /**
     * Removes several class topics together, for the bulk selection on the class schedule page.
     *
     * Deliberately not a loop over {@link deleteClassTopic}: that commits each row on its own, so a
     * set that failed halfway would leave the schedule partly removed with no way to tell how far it
     * got. The single `update` below is one statement, so it takes every row or none, and needs no
     * explicit transaction around it.
     *
     * Both rules are re-checked here rather than trusted from the page, because the ids arrive from
     * the client. They are checked across the whole set before anything is written, so a selection
     * holding one topic it may not touch removes nothing at all rather than part of itself:
     *
     * - a released topic is work families may already have done, which is the rule the whole removal
     *   path exists to protect. Same guard {@link deleteClassTopic} applies to non-admins;
     * - a reading week is generated from the class's reading settings rather than scheduled, and the
     *   schedule page offers no way to delete one. Nothing enforced this before because no caller
     *   could reach a reading class topic with a delete.
     *
     * No admin pupil-topic option, unlike {@link deleteClassTopic}: nothing here can be released, so
     * there is no pupil work to decide about.
     *
     * Setting `deletedBy` is not a soft delete, despite reading like one. Every table with a
     * `deletedById` column carries a `delete_on_deleted_by_set` trigger that deletes the row the
     * moment that column stops being null, and a `delete_auditing` trigger that copies it into
     * `deleted_item` first. Going through the column rather than issuing a plain DELETE is what puts
     * the remover's id in that audit copy, so it is the route to keep.
     */
    public async deleteClassTopics(ids: string[], deletedBy: string | LwpUser): Promise<OperationStatus> {
        const uniqueIds = [...new Set(ids)];

        if (!uniqueIds.length) throw new HttpException('No topics were selected', ErrorStatusCodeEnum._535);

        const classTopics = await this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.topic', 'topic')
            .where('classTopic.id IN (:...uniqueIds)', { uniqueIds })
            .getMany();

        if (classTopics.length !== uniqueIds.length) throw new HttpException('Class Topic does not exist', ErrorStatusCodeEnum._535);

        if (classTopics.some((classTopic) => classTopic.released)) {
            throw new HttpException('One of these class topics is already released', ErrorStatusCodeEnum._535);
        }

        if (classTopics.some((classTopic) => classTopic.topic?.isReading)) {
            throw new HttpException('Reading weeks cannot be removed from the schedule', ErrorStatusCodeEnum._535);
        }

        const res = await this.classTopicRepository.update(uniqueIds, {
            deletedBy: this.shallowUserService.newShallowUser(deletedBy)
        });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getClassTopic(id: string): Promise<LwpClassTopic> {
        const classTopic = await this.classTopicRepository.findOne({ where: { id } });

        if (!classTopic) throw new HttpException('Class Topic does not exist', ErrorStatusCodeEnum._535);

        classTopic.displayDate = classTopic.dueDate
            ? `Due By ${moment(classTopic.dueDate).format('DD MMM')}`
            : `Released on ${moment(classTopic.releaseDate).format('DD MMM')}`;

        return classTopic;
    }

    public async getReadingTopic(id: string): Promise<ReadingTopicOutput> {
        const readingTopic = await this.classTopicRepository.findOne({ id });

        if (!readingTopic) throw new HttpException('Class Topic does not exist', ErrorStatusCodeEnum._535);

        const pupilTopics = await this.pupilFeedbackService
            .joinToReadingFeedback(
                this.pupilTopicRepository.createQueryBuilder('pt').leftJoin('pt.classTopic', 'ct').leftJoinAndSelect('pt.pupil', 'pupil')
            )
            .where('ct.id = :id', { id: readingTopic.id })
            .orderBy('pupil.firstname', 'ASC')
            .addOrderBy('readingFeedback.bookReadAt', 'ASC')
            .getMany();

        return {
            activeDateString: `${moment(readingTopic?.releaseDate).format('dddd DD MMM')} - ${moment(readingTopic?.releaseDate)
                .add(6, 'day')
                .format('dddd DD MMM')}`,
            readingStatistics: await this.getClassTopicStatistics(readingTopic?.id),
            pupilReadingLogFeedbacks: await this.getTopicReadingLogFeedbacks(pupilTopics),
            isReleased: readingTopic.released,
            classReadingTarget: readingTopic?.readingTarget ?? 0
        };
    }

    public async getTopicReadingLogFeedbacks(pupilTopics: LwpPupilTopic[]): Promise<PupilReadingLogFeedbacksOutput[]> {
        const pupilReadingLogFeedbacks: PupilReadingLogFeedbacksOutput[] = [];

        if (pupilTopics.length > 0) {
            for (const pupilTopic of pupilTopics) {
                pupilReadingLogFeedbacks.push({
                    id: pupilTopic?.pupil?.id,
                    pupilName: `${pupilTopic?.pupil?.firstname} ${pupilTopic?.pupil?.lastname}`,
                    releaseDate: pupilTopic?.classTopic?.releaseDate,
                    readingLogFeedbacks: await this.pupilFeedbackService.getPupilFeedbacksOfPupilTopic(pupilTopic),
                    pupilEarnedStars: pupilTopic?.earnedGoldStar ? pupilTopic?.readingTarget : pupilTopic?.silverStars
                });
            }
        }

        return pupilReadingLogFeedbacks;
    }

    public async updateClassTopic(input: UpdateClassTopicInput, files?: FileUpload[], userId?: string): Promise<LwpClassTopic> {
        const classTopic = await this.classTopicRepository.findOne({ where: { id: input.id }, relations: ['class'] });
        const releaseTime = await this.parameterService.getParameterByKey('RELEASED_TIME');

        if (!classTopic) throw new HttpException('class topic does not exist', ErrorStatusCodeEnum._535);

        // An early refusal, so an edit that is not allowed uploads nothing. It is checked again on a locked copy
        // inside the transaction, because the row can change while the photos upload.
        this.applyClassTopicEdit(classTopic, input, releaseTime?.value);

        const fileUploads = input.setByTeacherStepIds?.length && files?.length ? await Promise.all(files.filter(Boolean)) : [];

        // One row, so no atomicity problem here, but the same storage rules apply: see runClassTopicWrite.
        const storedFiles: StoredFile[] = [];
        const effects: ClassTopicWriteEffects = { supersededFiles: [] };
        // The row as this edit saved it, which is what the caller gets back.
        let locked: LwpClassTopic;

        try {
            // Before the transaction opens, so it is never held open across a network call.
            const uploaded = fileUploads.length
                ? await this.uploadSetByTeacherFiles(input.setByTeacherStepIds, fileUploads, storedFiles)
                : [];

            await this.connection.transaction(async (manager) => {
                const context = await this.beginClassTopicWrite(manager, storedFiles);

                /*
                 * A fresh copy, locked until the commit. The copy read above is as old as the upload, and save
                 * writes every column that differs from the database, so saving it would undo anything another
                 * job wrote meanwhile: the release job's `released`, or a teacher email job's flag. With the lock,
                 * those jobs wait for this commit instead. No `relations`: Postgres cannot lock the nullable side
                 * of an outer join.
                 */
                locked = await manager.findOne(LwpClassTopic, { where: { id: input.id }, lock: { mode: 'pessimistic_write' } });

                if (!locked) throw new HttpException('class topic does not exist', ErrorStatusCodeEnum._535);

                // Released during the upload: the same refusal as before the upload, and the catch below deletes the
                // files this edit stored.
                this.applyClassTopicEdit(locked, input, releaseTime?.value);

                await manager.save(locked);

                if (input.setByTeacherStepIds?.length) {
                    effects.supersededFiles = await this.saveSetByTeacherMedia(
                        context,
                        classTopic.id,
                        input.setByTeacherStepIds,
                        uploaded,
                        userId
                    );
                }

                // After the media above, so a replaced photo's row is the one that gets the message. Inside the
                // transaction, so a message that cannot be written undoes the edit instead of failing after it.
                if (input.setByTeacherStepMessages?.length) {
                    await this.updateSetByTeacherMessages(manager, classTopic.id, input.setByTeacherStepMessages, userId);
                }
            });
        } catch (err) {
            await this.discardStoredFiles(storedFiles);

            throw this.classTopicSaveFailed(err);
        }

        await this.applyClassTopicWriteEffects([effects]);

        // The class cannot change in an edit, so the copy read with it supplies it; the locked read could not.
        locked.class = classTopic.class;
        locked.displayDate = locked.dueDate
            ? `Due By ${moment(locked.dueDate).format('DD MMM')}`
            : `Released on ${moment(locked.releaseDate).format('DD MMM')}`;

        return locked;
    }

    /**
     * Applies an edit to a class topic, refusing it if the topic has been released and the edit changes its
     * release date or message. Once released, only the due date can change. Run twice by updateClassTopic: once
     * before the upload as an early refusal, and again inside the transaction on a fresh, locked copy.
     */
    private applyClassTopicEdit(classTopic: LwpClassTopic, input: UpdateClassTopicInput, releaseTime?: string): void {
        const { teacherMessage, releaseDate } = input;

        if (classTopic.released) {
            if (
                moment(classTopic.releaseDate).format('YYYY-MM-DD') !== moment(releaseDate).format('YYYY-MM-DD') ||
                classTopic.teacherMessage !== teacherMessage
            ) {
                throw new HttpException(
                    'Topic is released! You can not change release date, email message or topic message.',
                    ErrorStatusCodeEnum._535
                );
            }

            classTopic.dueDate = input?.dueDate ?? null;
        } else {
            classTopic.releaseDate = this.helperService.getDateTimeFormat(input?.releaseDate, releaseTime);
            classTopic.teacherMessage = input?.teacherMessage ?? classTopic?.teacherMessage;
            classTopic.dueDate = input?.dueDate ?? null;
        }
    }

    public async getClassTopicByPupilTopic(pupilTopicId: string): Promise<LwpClassTopic> {
        const pupilParentBase = this.queryBaseService.pupilTopicClassTopicBase(pupilTopicId);
        const topicClass = await pupilParentBase.select('classTopic').getRawOne();

        if (!topicClass) return null;

        const newTopicClass = Object.assign({}, ...this.helperService.changeObjKeys(topicClass, 'classTopic_'));

        if (!newTopicClass?.id) return null;

        return {
            ...newTopicClass,
            displayDate: newTopicClass.dueDate
                ? `Due By ${moment(newTopicClass.dueDate).format('DD MMM')}`
                : `Released on ${moment(newTopicClass.releaseDate).format('DD MMM')}`
        };
    }

    public async getClassTopicStatistics(classTopicId: string): Promise<ClassTopicStatistics> {
        const classTopicStatistics = new ClassTopicStatistics();

        const pupilTopics = await this.pupilTopicRepository.find({ where: { classTopic: { id: classTopicId } }, relations: ['pupil'] });

        if (pupilTopics?.length > 0) {
            for (const pupilTopic of pupilTopics) {
                // If the pupil has completed the topic or acheived the target
                if (pupilTopic?.earnedGoldStar) {
                    classTopicStatistics.completed.push(pupilTopic?.pupil?.getFullName());
                    continue;
                }

                // If the pupil has not started the topic yet mean silver stars is 0 and watched video is false
                if (pupilTopic?.silverStars === 0 && !pupilTopic?.watchedVideo) {
                    classTopicStatistics.notStarted.push(pupilTopic?.pupil?.getFullName());
                    continue;
                }

                classTopicStatistics.inProgress.push(pupilTopic?.pupil?.getFullName());
            }
        }

        return classTopicStatistics;
    }

    public async saveReadingNote(input: ReadingNoteInput): Promise<LwpClassTopic> {
        const classTopic = await this.getClassTopic(input.classTopicId);

        classTopic.readingNote = input.readingNote;
        classTopic.readingTarget = input.readingTarget;

        return await this.classTopicRepository.save(classTopic);
    }

    async getClassTopicsByClassId(
        classId: string,
        topicId: string,
        isReadingTopic = false
    ): Promise<{ currentTopicId: string; previousTopicId: string; nextTopicId: string } | null> {
        let classTopicsQuery = await this.classTopicRepository
            .createQueryBuilder('ct')
            .leftJoin('ct.class', 'class')
            .leftJoin('ct.topic', 'static_topic')
            .where('static_topic.isReading = :isReading', { isReading: isReadingTopic })
            .select(['ct.id', 'ct.released'])
            .orderBy('ct.releaseDate', 'DESC');

        if (isReadingTopic) {
            /**
             * Display reading topics in the group.
             * If the class is part of a class group and the group is a reading group,
             * we need to include reading topics from the parent class of the group.
             */

            classTopicsQuery = classTopicsQuery
                .leftJoin('class.groups', 'cg', 'cg.id = :classId', { classId })
                .andWhere('(class.id = :classId OR class.id = cg.parentClassId)', { classId });
        } else {
            classTopicsQuery = classTopicsQuery.andWhere('(class.id = :classId OR class.parentClass.id = :classId)', { classId });
        }

        const class_topics = await classTopicsQuery.getMany();

        if (!class_topics.length) return null;

        let currentTopicIndex = class_topics.findIndex((item) => (topicId ? item.id == topicId : item.released));

        if (currentTopicIndex == -1 && topicId) {
            throw new HttpException(`Invalid topic ID. Please enter a valid topic ID.`, ErrorStatusCodeEnum._535);
        } else {
            // If we do not have a topic ID and no released topic, then "currentTopicIndex" will be -1.
            // If there are no released topics in the class, we will set it to the first created topic.
            currentTopicIndex = currentTopicIndex >= 0 ? currentTopicIndex : 0;
        }

        const currentTopicId = class_topics?.[currentTopicIndex].id;
        const nextTopicId = class_topics?.[currentTopicIndex - 1]?.id || null;
        const previousTopicId = class_topics?.[currentTopicIndex + 1]?.id || null;

        return { currentTopicId, nextTopicId, previousTopicId };
    }

    public async getClassTopicForWeekByWeek(classId: string, topicId: string): Promise<ClassTopicForClassDetailPageOutput> {
        const topicIds = await this.getClassTopicsByClassId(classId, topicId);

        if (!topicIds) return null;

        const classTopicData = await this.classTopicRepository.query(
            `
                SELECT
                    lct."teacherMessage",
                    slt."teacherTopicName",
                    slt."teacherPdf",
                    slt."id" as "staticTopicId",
                    slt."scrapbookPrompt" as "scrapbookPrompt",
                    lct."releaseDate",
                    lct."dueDate",
                    lct.released,
                    lsc.name as "schoolClassName",
                    CASE
                        WHEN lsc."parentClassId" IS NULL THEN TRUE
                        ELSE FALSE
                    END AS "isRegisterationClassTopic",
                    COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', base."id",
                            'watchedVideo', base."watchedVideo",
                            'classTopicId', base."classTopicId",
                            'totalEarnedStars', base."totalEarnedStars",
                            'pupil', base."pupil",
                            'activities', base."activities"
                        )
                    ) FILTER (WHERE base."id" IS NOT NULL), '[]'::jsonb) AS "pupilTopics",
                    jsonb_build_object(
                        'completed', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."earnedGoldStar" = true), '[]'::jsonb),
                        'notStarted', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."silverStars" = 0 and base."watchedVideo" = false), '[]'::jsonb),
                        'inProgress', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE (base."silverStars" <> 0 OR base."watchedVideo" = true) AND base."earnedGoldStar" = false), '[]'::jsonb)
                    ) AS "statistics",
                    CASE
                        WHEN lct."released" = false THEN
                            (
                                SELECT COALESCE(
                                    jsonb_agg(
                                        jsonb_build_object(
                                            'id', lp.id,
                                            'firstname', lp."firstname",
                                            'lastname', lp."lastname"
                                        )
                                    ORDER BY lp."firstname" ASC, lp."lastname" ASC
                                    ),
                                    '[]'::jsonb
                                )
                                FROM
                                    lwp_class_pupil lcp
                                    JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                                WHERE
                                    lcp."lwpSchoolClassId" = lct."classId"
                            )
                        ELSE
                            '[]'::jsonb
                    END AS "topicWillReleasedFor",
                    CASE
                        WHEN lsc."parentClassId" IS NOT NULL THEN
                            (
                                SELECT COALESCE(
                                    jsonb_agg(
                                        jsonb_build_object(
                                            'id', lp.id,
                                            'firstname', lp."firstname",
                                            'lastname', lp."lastname"
                                        )
                                    ),
                                    '[]'::jsonb
                                )
                                FROM
                                    lwp_class_pupil lcp
                                    JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                                WHERE
                                    lcp."lwpSchoolClassId" = $2
                                    AND lp.id NOT IN (
                                        SELECT lcp1."lwpPupilId"
                                        FROM lwp_class_pupil lcp1
                                        WHERE lcp1."lwpSchoolClassId" = lct."classId"
                                    )
                            )
                        ELSE
                            '[]'::jsonb
                    END AS "topicNotSetFor"
                FROM
                    lwp_class_topic lct
                    LEFT JOIN (
                        SELECT
                            lpt.id,
                            lpt."watchedVideo" AS "watchedVideo",
                            lpt."classTopicId" AS "classTopicId",
                            lpt."earnedGoldStar" AS "earnedGoldStar",
                            lpt."silverStars" AS "silverStars",
                            lp."firstname" || ' ' || lp."lastname" AS "fullname",
                            COUNT(DISTINCT CASE WHEN lpa."earnedStar" = true THEN lpa.id END) AS "totalEarnedStars",
                            jsonb_build_object(
                                'id', lp."id",
                                'firstname', lp."firstname",
                                'lastname', lp."lastname"
                            ) AS "pupil",
                            COALESCE(
                                jsonb_agg(
                                    DISTINCT jsonb_build_object(
                                        'id', lpa."id",
                                        'pupilTopicId', lpa."topicId",
                                        'earnedStar', lpa."earnedStar"
                                    )
                                ) FILTER (WHERE lpa."id" IS NOT NULL),
                                '[]'::jsonb
                            ) AS "activities"
                        FROM
                            lwp_class_pupil lcp
                        JOIN lwp_pupil lp ON lcp."lwpPupilId" = lp.id
                        JOIN lwp_pupil_topic lpt ON lp.id = lpt."pupilId"
                        LEFT JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
                        WHERE
                            lpt."classTopicId" = $1
                        GROUP BY
                            lpt.id, lp.id
                        ORDER BY
                            lp."firstname" ASC,
                            lp."lastname" ASC
                    ) base ON base."classTopicId" = lct.id
                    LEFT JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    LEFT JOIN lwp_school_class lsc ON lsc.id = lct."classId"
                WHERE
                    lct.id = $1
                GROUP BY
                    slt.id, lct.id, lsc.id;
            `,
            [topicIds.currentTopicId, classId]
        );
        const classTopicDetails = classTopicData?.[0];

        const classTopic: ClassTopicForClassDetailPageOutput = {
            ...classTopicDetails,
            teacherPdf: classTopicDetails?.teacherPdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${classTopicDetails?.teacherPdf}`)
                : null,
            isReleased: classTopicDetails.released,
            nextTopicId: topicIds.nextTopicId,
            previousTopicId: topicIds.previousTopicId,
            topicId: topicIds.currentTopicId
        };

        return classTopic;
    }

    public async getClassReadingTopicForWeekByWeek(classId: string, topicId: string): Promise<ClassTopicForClassDetailPageOutput> {
        const topicIds = await this.getClassTopicsByClassId(classId, topicId, true);

        if (!topicIds) return null;

        const classTopicData = await this.classTopicRepository.query(
            `
                WITH feedbacks AS (
                    SELECT
                        lpf."bookReadAt",
                        lvrltrt."pupilTopicId",
                        bool_or(lpf."userType" <> 'TEACHER') AS "isReadAtHome",
                        bool_or(lpf."userType" = 'TEACHER' AND NOT lpf."logOnReadingAsGroupTab") AS "isReadAtSchool",
                        bool_or(lpf."logOnReadingAsGroupTab") AS "isReadingWithGroup"
                    FROM
                        lwp_class_topic lct
                    JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = lct."id"
                    JOIN lwp_view_reading_log_to_reading_topic lvrltrt ON lpt."id" = lvrltrt."pupilTopicId"
                    JOIN lwp_pupil_feedback lpf ON lpf."id" = lvrltrt."pupilFeedbackId"
                    WHERE
                        lct.id = $1 AND lpf."bookReadAt" IS NOT NULL AND lpf."originalFeedbackId" IS NULL
                    GROUP BY
                        lpf."bookReadAt", lvrltrt."pupilTopicId"
                ),
                pupil_topic_details AS (
                    SELECT
                        lpt.id,
                        lpt."classTopicId",
                        lpt."earnedGoldStar",
                        lpt."silverStars",
                        lp."firstname" || ' ' || lp."lastname" AS "fullname",
                        jsonb_build_object(
                            'id', lp."id",
                            'firstname', lp."firstname",
                            'lastname', lp."lastname"
                        ) AS "pupil",
                        COALESCE(jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'bookReadAt', fb."bookReadAt",
                                'isReadAtHome', COALESCE(fb."isReadAtHome", false),
                                'isReadAtSchool', COALESCE(fb."isReadAtSchool", false),
                                'isReadingWithGroup', COALESCE(fb."isReadingWithGroup", false)
                            )
                        ) FILTER (WHERE fb."bookReadAt" IS NOT NULL), '[]'::jsonb) AS "feedbacks"
                    FROM
                        lwp_class_pupil lcp
                    JOIN lwp_pupil lp ON lcp."lwpPupilId" = lp.id
                    JOIN lwp_pupil_topic lpt ON lp.id = lpt."pupilId"
                    LEFT JOIN feedbacks fb ON fb."pupilTopicId" = lpt."id"
                    WHERE
                        lpt."classTopicId" = $1 AND lcp."lwpSchoolClassId" = $2
                    GROUP BY
                        lpt.id, lp.id
                    ORDER BY
                        lp."firstname" ASC,
                        lp."lastname" ASC
                )
                SELECT
                    lct."readingNote",
                    lct."releaseDate",
                    lct.released,
                    slt."id" as "staticTopicId",
                    lct."readingTarget",
                    lsc.name as "schoolClassName",
                    lsc."readingStartDay",
                    slt."teacherTopicName",
                    COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', base."id",
                            'classTopicId', base."classTopicId",
                            'earnedGoldStar', base."earnedGoldStar",
                            'silverStars', base."silverStars",
                            'pupil', base."pupil",
                            'feedbacks', base."feedbacks"
                        )
                    ) FILTER (WHERE base."id" IS NOT NULL), '[]'::jsonb) AS "pupilTopics",
                    jsonb_build_object(
                        'completed', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."earnedGoldStar" = true), '[]'::jsonb),
                        'notStarted', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."silverStars" = 0), '[]'::jsonb),
                        'inProgress', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."silverStars" <> 0 AND base."earnedGoldStar" = false), '[]'::jsonb)
                    ) AS "statistics"
                FROM
                    lwp_class_topic lct
                LEFT JOIN pupil_topic_details base ON base."classTopicId" = lct.id
                LEFT JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                LEFT JOIN lwp_school_class lsc ON lsc.id = lct."classId"
                WHERE
                    lct.id = $1
                GROUP BY
                    slt.id, lct.id, lsc.id;
            `,
            [topicIds.currentTopicId, classId]
        );
        const classTopicDetails = classTopicData?.[0];

        const classTopic: ClassTopicForClassDetailPageOutput = {
            ...classTopicDetails,
            activeDateString: `${moment(classTopicDetails?.releaseDate).format('dddd DD MMM')} - ${moment(classTopicDetails?.releaseDate)
                .add(6, 'day')
                .format('dddd DD MMM')}`,
            isReleased: classTopicDetails.released,
            nextTopicId: topicIds.nextTopicId,
            previousTopicId: topicIds.previousTopicId,
            topicId: topicIds.currentTopicId
        };

        return classTopic;
    }

    /**
     * Retrieves a paginated list of distinct reading topics (deduplicated by `releaseDate` + `readingTarget`)
     * for a given class, traversing through pupils' registration classes to find relevant topics.
     *
     * Returns the current, previous, and next topic IDs to support week-by-week navigation.
     * Results are ordered by `releaseDate` descending (most recent first), so "next" means a more
     * recent week and "previous" means an older week.
     *
     * @param classId - The ID of the subject class (e.g. a reading group) to fetch topics for.
     * @param topicId - Optional. The ID of the topic to treat as the current position in the list.
     *                  If omitted, defaults to the most recent topic (index 0).
     *                  If provided but not found in the list, also falls back to index 0.
     *
     * @returns An object containing:
     * - `currentTopicId` — the ID of the current topic (either the provided `topicId` or the most recent one)
     * - `previousTopicId` — the ID of the topic from the week before the current one, or `null` if none exists
     * - `nextTopicId` — the ID of the topic from the week after the current one, or `null` if none exists
     *
     * Returns `null` if no released reading topics are found for the given class.
     *
     * @throws {HttpException} If `topicId` is provided and is not one of the group's reading weeks - it does not
     * exist, its class shares no pupil with the group, or its week is unreleased or out of the current period.
     */
    async getGroupAcrossClassesReadingTopicsByClassId(
        classId: string,
        topicId?: string
    ): Promise<{ currentTopicId: string; previousTopicId: string; nextTopicId: string } | null> {
        const result = await this.classTopicRepository.query(
            `
                WITH registration_class_topics AS (
                    SELECT DISTINCT
                        lct.id,
                        lct."releaseDate",
                        lct.released,
                        lct."readingTarget"
                    FROM lwp_school_class lsc
                    LEFT JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
                    LEFT JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                    LEFT JOIN lwp_class_pupil lcp2 ON lcp2."lwpPupilId" = lp.id
                    LEFT JOIN lwp_school_class lsc2 ON lsc2.id = lcp2."lwpSchoolClassId" AND lsc2."isRegistrationClass" = true
                    LEFT JOIN lwp_school ls ON ls.id = lsc2."schoolId"
                    LEFT JOIN lwp_class_topic lct ON lct."classId" = lsc2.id
                    LEFT JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    WHERE
                        lsc.id = $1
                        AND slt."isReading" = true
                        AND lct.id IS NOT NULL
                        AND lct.released = true
                        AND lsc2."periodIndex" >= ls."curentPeriodIndex"
                ),
                distinct_dates AS (
                    SELECT
                        "releaseDate",
                        "readingTarget",
                        MIN(id) AS "representativeTopicId"
                    FROM registration_class_topics
                    GROUP BY "releaseDate", "readingTarget"
                    ORDER BY "releaseDate" DESC
                )
                SELECT
                    "releaseDate",
                    "readingTarget",
                    "representativeTopicId" AS id
                FROM distinct_dates
            `,
            [classId]
        );

        if (!result.length) return null;

        let currentIndex: number;

        if (topicId) {
            /**
             * The topic has to belong to the group before its week is worth resolving. A group across
             * classes owns no reading topics of its own, so "belongs to the group" means the topic's
             * class shares at least one pupil with the group - anything else is a topic ID from a class
             * the teacher happens to be able to read, and the page would render that class's week
             * against this group's pupils.
             */
            const topicDateResult = await this.classTopicRepository.query(
                `
                    SELECT lct."releaseDate", lct."readingTarget"
                    FROM lwp_class_topic lct
                    WHERE lct.id = $1
                      AND EXISTS (
                          SELECT 1
                          FROM lwp_class_pupil group_cp
                          JOIN lwp_class_pupil reg_cp ON reg_cp."lwpPupilId" = group_cp."lwpPupilId"
                          WHERE group_cp."lwpSchoolClassId" = $2
                            AND reg_cp."lwpSchoolClassId" = lct."classId"
                      )
                `,
                [topicId, classId]
            );

            if (!topicDateResult.length) {
                throw new HttpException(`Invalid topic ID. Please enter a valid topic ID.`, ErrorStatusCodeEnum._535);
            }

            const { releaseDate, readingTarget } = topicDateResult[0];

            currentIndex = result.findIndex(
                (item) =>
                    moment(item.releaseDate).format('YYYY-MM-DD') === moment(releaseDate).format('YYYY-MM-DD') &&
                    item.readingTarget === readingTarget
            );

            /**
             * The topic is one of the group's, but its week is not in the navigable set - it is
             * unreleased, or its class has moved past the school's current period. There is no week to
             * show and no arrows to place it between, so treat it the same as a topic from elsewhere
             * rather than falling back to the latest week under the requested topic's own details.
             */
            if (currentIndex === -1) {
                throw new HttpException(`Invalid topic ID. Please enter a valid topic ID.`, ErrorStatusCodeEnum._535);
            }
        } else {
            currentIndex = 0;
        }

        const currentTopicId = topicId ?? result[currentIndex].id;
        const nextTopicId = result[currentIndex - 1]?.id || null;
        const previousTopicId = result[currentIndex + 1]?.id || null;

        return { currentTopicId, nextTopicId, previousTopicId };
    }

    /**
     * Retrieves the full detail of a reading topic for a specific week, scoped to the pupils
     * of the given class. Includes pupil progress (gold/silver stars), per-pupil reading feedback
     * (read at home, at school, or with group), and aggregated statistics.
     *
     * Internally calls `getGroupAcrossClassesReadingTopicsByClassId` to resolve the current,
     * previous, and next topic IDs for navigation, then fetches the full week's data for the
     * current topic.
     *
     * Topic matching across registration classes is done by both `releaseDate` AND `readingTarget`,
     * ensuring that topics sharing the same release date but targeting different reading levels
     * are treated as separate records.
     *
     * Only pupils enrolled in the group across class (`classId`) are included in the results,
     * even if their registration class topics overlap with pupils from other classes.
     *
     * @param classId - The ID of the group across class to scope the results to.
     * @param topicId - The ID of the class topic representing the week to retrieve details for.
     *
     * @returns A `ClassTopicForClassDetailPageOutput` object containing:
     * - `readingNote` — teacher's note for the topic
     * - `releaseDate` — the date the topic was released
     * - `released` — whether the topic has been released
     * - `staticTopicId` — the ID of the underlying static topic
     * - `readingTarget` — the reading target for this topic
     * - `schoolClassName` — the name of the class topic's class
     * - `readingStartDay` — the configured reading start day for the class
     * - `teacherTopicName` — the topic name as seen by the teacher
     * - `activeDateString` — a human-readable date range string for the week, e.g. `"Monday 01 Jan - Sunday 07 Jan"`
     * - `isReleased` — alias of `released`
     * - `topicId` — the current topic ID
     * - `nextTopicId` — the topic ID for the following week, or `null`
     * - `previousTopicId` — the topic ID for the preceding week, or `null`
     * - `pupilTopics` — array of pupil topic objects with progress and feedback details
     * - `statistics` — object grouping pupil full names into `completed`, `inProgress`, and `notStarted`
     *
     * Returns `null` if no topics are found for the given class.
     *
     * @throws {HttpException} If `topicId` is not one of the group's reading weeks - see
     * `getGroupAcrossClassesReadingTopicsByClassId` for what qualifies.
     */
    public async getGroupAcrossClassesReadingTopicForWeekByWeek(
        classId: string,
        topicId: string
    ): Promise<ClassTopicForClassDetailPageOutput> {
        const topicIds = await this.getGroupAcrossClassesReadingTopicsByClassId(classId, topicId);

        if (!topicIds) return null;

        const classTopicData = await this.classTopicRepository.query(
            `
                WITH target_topic AS (
                    SELECT id, "releaseDate", "readingTarget", "readingNote", released, "topicId", "classId"
                    FROM lwp_class_topic
                    WHERE id = $1
                ),
                registration_class_topics AS (
                    SELECT DISTINCT
                        lct.id AS "classTopicId"
                    FROM lwp_school_class lsc
                    INNER JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
                    INNER JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                    INNER JOIN lwp_class_pupil lcp2 ON lcp2."lwpPupilId" = lp.id
                    INNER JOIN lwp_school_class lsc2 ON lsc2.id = lcp2."lwpSchoolClassId" AND lsc2."isRegistrationClass" = true
                    INNER JOIN lwp_class_topic lct ON lct."classId" = lsc2.id
                    INNER JOIN static_lwp_topic slt ON slt.id = lct."topicId"
                    JOIN target_topic tt ON lct."releaseDate" = tt."releaseDate" AND lct."readingTarget" = tt."readingTarget"
                    WHERE
                        lsc.id = $2
                        AND slt."isReading" = true
                        AND lct.released = true
                ),
                feedbacks AS (
                    SELECT
                        lpf."bookReadAt",
                        lvrltrt."pupilTopicId",
                        bool_or(lpf."userType" <> 'TEACHER') AS "isReadAtHome",
                        bool_or(lpf."userType" = 'TEACHER' AND NOT lpf."logOnReadingAsGroupTab") AS "isReadAtSchool",
                        bool_or(lpf."logOnReadingAsGroupTab") AS "isReadingWithGroup"
                    FROM registration_class_topics rct
                    JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = rct."classTopicId"
                    JOIN lwp_view_reading_log_to_reading_topic lvrltrt ON lpt."id" = lvrltrt."pupilTopicId"
                    JOIN lwp_pupil_feedback lpf ON lpf."id" = lvrltrt."pupilFeedbackId"
                    WHERE
                        lpf."bookReadAt" IS NOT NULL
                        AND lpf."originalFeedbackId" IS NULL
                    GROUP BY
                        lpf."bookReadAt", lvrltrt."pupilTopicId"
                ),
                class_pupils AS (
                    SELECT lcp."lwpPupilId"
                    FROM lwp_class_pupil lcp
                    WHERE lcp."lwpSchoolClassId" = $2
                ),
                pupil_topic_details AS (
                    SELECT
                        lpt.id,
                        lpt."classTopicId",
                        lpt."earnedGoldStar",
                        lpt."silverStars",
                        lp."firstname" || ' ' || lp."lastname" AS "fullname",
                        jsonb_build_object(
                            'id', lp."id",
                            'firstname', lp."firstname",
                            'lastname', lp."lastname"
                        ) AS "pupil",
                        COALESCE(jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'bookReadAt', fb."bookReadAt",
                                'isReadAtHome', COALESCE(fb."isReadAtHome", false),
                                'isReadAtSchool', COALESCE(fb."isReadAtSchool", false),
                                'isReadingWithGroup', COALESCE(fb."isReadingWithGroup", false)
                            )
                        ) FILTER (WHERE fb."bookReadAt" IS NOT NULL), '[]'::jsonb) AS "feedbacks"
                    FROM registration_class_topics rct
                    JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = rct."classTopicId"
                    JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
                    JOIN class_pupils cp ON cp."lwpPupilId" = lp.id
                    LEFT JOIN feedbacks fb ON fb."pupilTopicId" = lpt."id"
                    GROUP BY
                        lpt.id, lp.id
                    ORDER BY
                        lp."firstname" ASC,
                        lp."lastname" ASC
                )
                SELECT
                    tt."readingNote",
                    tt."releaseDate",
                    tt.released,
                    slt."id" as "staticTopicId",
                    tt."readingTarget",
                    lsc.name as "schoolClassName",
                    lsc."readingStartDay",
                    slt."teacherTopicName",
                    COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', base."id",
                            'classTopicId', base."classTopicId",
                            'earnedGoldStar', base."earnedGoldStar",
                            'silverStars', base."silverStars",
                            'pupil', base."pupil",
                            'feedbacks', base."feedbacks"
                        )
                    ) FILTER (WHERE base."id" IS NOT NULL), '[]'::jsonb) AS "pupilTopics",
                    jsonb_build_object(
                        'completed', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."earnedGoldStar" = true), '[]'::jsonb),
                        'notStarted', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."silverStars" = 0), '[]'::jsonb),
                        'inProgress', COALESCE(jsonb_agg(base."fullname") FILTER (WHERE base."silverStars" <> 0 AND base."earnedGoldStar" = false), '[]'::jsonb)
                    ) AS "statistics"
                FROM target_topic tt
                LEFT JOIN pupil_topic_details base ON true
                LEFT JOIN static_lwp_topic slt ON slt.id = tt."topicId"
                LEFT JOIN lwp_school_class lsc ON lsc.id = tt."classId"
                GROUP BY
                    slt.id, tt."readingNote", tt."releaseDate", tt.released, tt."readingTarget", lsc.name, lsc."readingStartDay", slt."teacherTopicName";
            `,
            [topicIds.currentTopicId, classId]
        );

        const classTopicDetails = classTopicData?.[0];

        const classTopic: ClassTopicForClassDetailPageOutput = {
            ...classTopicDetails,
            activeDateString: `${moment(classTopicDetails?.releaseDate).format('dddd DD MMM')} - ${moment(classTopicDetails?.releaseDate)
                .add(6, 'day')
                .format('dddd DD MMM')}`,
            isReleased: classTopicDetails.released,
            nextTopicId: topicIds.nextTopicId,
            previousTopicId: topicIds.previousTopicId,
            topicId: topicIds.currentTopicId
        };

        return classTopic;
    }

    public async updateReadingTargetForFutureClassTopics(
        manager: EntityManager,
        schoolClassId: string,
        readingTarget: number
    ): Promise<void> {
        const classTopicRepository = manager.getRepository(LwpClassTopic);
        const pupilTopicRepository = manager.getRepository(LwpPupilTopic);

        const now = new Date();

        now.setHours(0, 0, 0, 0);

        const affectedClassTopics = await classTopicRepository.find({
            where: { class: { id: schoolClassId }, released: false, releaseDate: MoreThanOrEqual(now) },
            select: ['id']
        });
        const classTopicIds = affectedClassTopics.map(({ id }) => id);

        await classTopicRepository.update({ id: In(classTopicIds) }, { readingTarget });

        const affectedPupilTopics = await pupilTopicRepository.find({
            where: { classTopic: { id: In(classTopicIds) } },
            select: ['id']
        });
        const pupilTopicIds = affectedPupilTopics.map(({ id }) => id);

        await pupilTopicRepository.update({ id: In(pupilTopicIds) }, { readingTarget });
    }

    /**
     * Uploads the teacher's files straight to their final names, before any transaction opens, so the
     * transaction that writes the rows is pure SQL and is not held open across a network call.
     *
     * Each upload is recorded on `storedFiles` as it lands rather than being returned at the end, so a
     * failure part way through this loop still leaves the caller with the complete list to undo.
     *
     * An entry with no file identifier matches no file, which is how an edit says "remove this step's
     * media". Unlike staging, it deliberately does not fall back to matching on the step id.
     */
    private async uploadSetByTeacherFiles(stepIds: string[], files: FileUpload[], storedFiles: StoredFile[]): Promise<CopiedStagedFile[]> {
        const entriesWithFiles = stepIds
            .map(parseSetByTeacherStepEntry)
            .map(({ stepId, fileIdentifier }) => ({
                stepId,
                file: fileIdentifier ? files.find((f) => this.helperService.isValidUrlForActivityStep(f?.filename, fileIdentifier)) : null
            }))
            .filter((e) => e.file);

        if (!entriesWithFiles.length) return [];

        const steps = await this.activityStepsRepository
            .createQueryBuilder('step')
            .where('step.id IN (:...stepIds)', { stepIds: entriesWithFiles.map((e) => e.stepId) })
            .select(['step.id', 'step.setByTeacherData'])
            .getMany();

        const uploaded: CopiedStagedFile[] = [];

        for (const { stepId, file } of entriesWithFiles) {
            const step = steps.find((s) => s.id === stepId);

            if (!step) continue;

            const isAudio = step.setByTeacherData?.type === SetByTeacherDataType.AUDIO;
            const folder = isAudio
                ? appConstants.minioPaths.public.uploadedSetByTeacherAudio
                : appConstants.minioPaths.public.uploadedSetByTeacherImage;

            const filename = `${new Date().getTime()}_${file.filename}`;

            await this.helperService.uploadFile(`${folder}/${filename}`, file, true);

            storedFiles.push({ folder, filename });
            uploaded.push({ stepId, folder, filename });
        }

        return uploaded;
    }

    /**
     * Writes an edited class topic's media rows for files {@link uploadSetByTeacherFiles} has already
     * stored, and returns the originals this write replaced or removed. Those are **not** deleted here:
     * the rows pointing at the new filenames are still uncommitted, so deleting now would strand a
     * restored row on a missing file if the transaction rolled back.
     */
    private async saveSetByTeacherMedia(
        context: ClassTopicWriteContext,
        classTopicId: string,
        stepIds: string[],
        uploaded: CopiedStagedFile[],
        userId: string
    ): Promise<StoredFile[]> {
        const { manager } = context;
        const setByTeacherMediaRepo = manager.getRepository(LwpSetByTeacherStepMedia);
        const activityStepsRepo = manager.getRepository(StaticLwpActivitySteps);

        const parsedEntries = stepIds.map(parseSetByTeacherStepEntry);

        const pureStepIds = parsedEntries.map((e) => e.stepId);

        const [steps, existingMedia] = await Promise.all([
            activityStepsRepo
                .createQueryBuilder('step')
                .where('step.id IN (:...stepIds)', { stepIds: pureStepIds })
                .select(['step.id', 'step.setByTeacherData'])
                .getMany(),
            setByTeacherMediaRepo
                .createQueryBuilder('media')
                .innerJoin('media.step', 'step')
                .where('media.classTopic = :classTopicId', { classTopicId })
                .andWhere('media.step IN (:...stepIds)', { stepIds: pureStepIds })
                .select(['media.id', 'media.filename', 'media.parentMessage', 'step.id'])
                .getMany()
        ]);

        const mediaToSave: LwpSetByTeacherStepMedia[] = [];
        // Originals this write replaces or removes, for the caller to delete once committed.
        const supersededFiles: StoredFile[] = [];
        const mediaRowIdsToDelete: string[] = [];

        for (const { stepId } of parsedEntries) {
            const upload = uploaded.find((u) => u.stepId === stepId);

            if (!upload) {
                const existing = existingMedia.find((m) => m.step?.id === stepId);

                if (existing) {
                    const step = steps.find((s) => s.id === stepId);

                    const isAudio = step?.setByTeacherData?.type === SetByTeacherDataType.AUDIO;

                    const folder = isAudio
                        ? appConstants.minioPaths.public.uploadedSetByTeacherAudio
                        : appConstants.minioPaths.public.uploadedSetByTeacherImage;

                    mediaRowIdsToDelete.push(existing.id);
                    supersededFiles.push({ folder, filename: existing.filename });
                }

                continue;
            }

            const { folder, filename } = upload;

            const existing = existingMedia.find((m) => m.step?.id === stepId);

            if (existing) {
                supersededFiles.push({ folder, filename: existing.filename });
                existing.filename = filename;
                existing.logUpdatedBy = { id: userId } as LwpUser;
                mediaToSave.push(existing);
            } else {
                const media = new LwpSetByTeacherStepMedia();

                media.step = { id: stepId } as StaticLwpActivitySteps;
                media.classTopic = { id: classTopicId } as LwpClassTopic;
                media.filename = filename;
                media.logCreatedBy = { id: userId } as LwpUser;
                media.logUpdatedBy = { id: userId } as LwpUser;
                mediaToSave.push(media);
            }
        }

        if (mediaToSave.length) await setByTeacherMediaRepo.save(mediaToSave);

        if (mediaRowIdsToDelete.length) await setByTeacherMediaRepo.delete(mediaRowIdsToDelete);

        return supersededFiles;
    }

    /**
     * Sets the parent message on the media rows a topic already has a file for. Takes the transaction's
     * `manager`, never a repository: a repository is another connection, which cannot see media rows this
     * transaction has saved but not yet committed.
     */
    private async updateSetByTeacherMessages(
        manager: EntityManager,
        classTopicId: string,
        stepMessages: SetByTeacherStepMessageInput[],
        userId: string
    ): Promise<void> {
        if (!stepMessages.length) return;

        const stepIds = stepMessages.map((m) => m.stepId);
        const setByTeacherMediaRepo = manager.getRepository(LwpSetByTeacherStepMedia);

        const existingMedia = await setByTeacherMediaRepo
            .createQueryBuilder('media')
            .innerJoin('media.step', 'step')
            .where('media.classTopic = :classTopicId', { classTopicId })
            .andWhere('media.step IN (:...stepIds)', { stepIds })
            .andWhere('media.filename IS NOT NULL')
            .select(['media.id', 'media.parentMessage', 'step.id'])
            .getMany();

        if (!existingMedia.length) return;

        const mediaToSave = existingMedia
            .map((media) => {
                const msg = stepMessages.find((m) => m.stepId === media.step?.id);
                const incoming = msg?.parentMessage?.trim() || null;

                if (media.parentMessage === incoming) return null;
                media.parentMessage = incoming;
                media.logUpdatedBy = { id: userId } as LwpUser;

                return media;
            })
            .filter(Boolean);

        if (!mediaToSave.length) return;

        await setByTeacherMediaRepo.save(mediaToSave);
    }

    /**
     * Copies the staged files into their per-class names, before any transaction opens, so the
     * transaction that writes the rows is pure SQL and is not held open across a network call.
     *
     * Each copy is recorded on `storedFiles` as it lands rather than being returned at the end, so a
     * failure part way through this loop still leaves the caller with the complete list to undo.
     */
    private async copyStagedMediaForClass(
        staged: Array<{ stepId: string; folder: string; stagedFilename: string }>,
        classId: string,
        storedFiles: StoredFile[]
    ): Promise<CopiedStagedFile[]> {
        const copied: CopiedStagedFile[] = [];

        for (const { stepId, folder, stagedFilename } of staged) {
            const baseFilename = stagedFilename.replace(STAGED_PREFIX_PATTERN, '');
            const filename = `${new Date().getTime()}_${classId.substring(0, 8)}_${baseFilename}`;

            await this.helperService.copyFile(folder, stagedFilename, filename, true);

            storedFiles.push({ folder, filename });
            copied.push({ stepId, folder, filename });
        }

        return copied;
    }

    public async stageSetByTeacherFiles(
        files: FileUpload[],
        setByTeacherStepIds: string[]
    ): Promise<Array<{ stepId: string; folder: string; stagedFilename: string }>> {
        if (!setByTeacherStepIds.length || !files.length) return [];

        // GraphQL Upload scalars arrive as Promises; resolve before accessing .filename
        const resolvedFiles = await Promise.all(files.filter(Boolean));

        const stepsWithFiles = setByTeacherStepIds
            .map((entry) => {
                // entries arrive as `stepId:fileIdentifier`; fall back to stepId for entries saved before fileIdentifier was introduced
                const { stepId, fileIdentifier } = parseSetByTeacherStepEntry(entry);

                return {
                    stepId,
                    file: resolvedFiles.find((f) => this.helperService.isValidUrlForActivityStep(f?.filename, fileIdentifier ?? stepId))
                };
            })
            .filter((e): e is { stepId: string; file: FileUpload } => e.file != null);

        if (!stepsWithFiles.length) return [];

        const steps = await this.activityStepsRepository
            .createQueryBuilder('step')
            .where('step.id IN (:...stepIds)', { stepIds: stepsWithFiles.map((e) => e.stepId) })
            .select(['step.id', 'step.setByTeacherData'])
            .getMany();

        const staged: Array<{ stepId: string; folder: string; stagedFilename: string }> = [];

        try {
            for (const { stepId, file } of stepsWithFiles) {
                const step = steps.find((s) => s.id === stepId);

                if (!step) continue;

                const isAudio = step.setByTeacherData?.type === SetByTeacherDataType.AUDIO;
                const folder = isAudio
                    ? appConstants.minioPaths.public.uploadedSetByTeacherAudio
                    : appConstants.minioPaths.public.uploadedSetByTeacherImage;

                const stagedFilename = `staged_${new Date().getTime()}_${file.filename}`;

                await this.helperService.uploadFile(`${folder}/${stagedFilename}`, file, true);
                staged.push({ stepId, folder, stagedFilename });
            }
        } catch (err) {
            await this.deleteSetByTeacherStagedFiles(staged);
            // Staging runs before runClassTopicWrite opens, so its failure needs the same treatment here.
            throw this.classTopicSaveFailed(err);
        }

        return staged;
    }

    /**
     * The error a failed class topic save hands back. One of our own messages, such as "Class does not exist",
     * passes through as it is. Anything else (storage or the database) becomes a message the teacher can read,
     * with the original kept in the logs, so the reason is not lost and SQL does not reach the browser.
     *
     * The original is sent to New Relic here because nothing else would send it: the Apollo plugin records the
     * error a resolver throws, which is now the generic one, and the agent does not collect console output.
     */
    private classTopicSaveFailed(err: unknown): HttpException {
        if (err instanceof HttpException) return err;

        console.error('Class topic save failed', err);
        newrelic.noticeError(err as Error, { caught: true, handled: false });

        return new HttpException(CLASS_TOPIC_SAVE_FAILED, ErrorStatusCodeEnum._535);
    }

    public async deleteSetByTeacherStagedFiles(staged: Array<{ folder: string; stagedFilename: string }>): Promise<void> {
        await Promise.allSettled(
            staged.map(({ folder, stagedFilename }) => this.helperService.removeFile(`${folder}/${stagedFilename}`, true))
        );
    }
}
