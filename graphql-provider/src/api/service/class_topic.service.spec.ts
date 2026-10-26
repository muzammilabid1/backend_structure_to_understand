import newrelic from 'newrelic/index';
import { appConstants } from 'src/constants';
import { EntityManager } from 'typeorm';

import { StaticLwpActivitySteps } from '../entities/activity';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import { AddTopicToClassesInput, ClassTopicInput, UpdateClassTopicInput } from '../model';
import { CLASS_TOPIC_SAVE_FAILED, ClassTopicService, ClassTopicWriteRequest, parseSetByTeacherStepEntry } from './class_topic.service';

// Stands in for the agent, so a test can see what a failed save reports.
jest.mock('newrelic/index', () => ({ __esModule: true, default: { noticeError: jest.fn() } }));

const noticeError = newrelic.noticeError as jest.Mock;

describe('parseSetByTeacherStepEntry', () => {
    it('parses a step entry with a file identifier', () => {
        expect(parseSetByTeacherStepEntry('5:abc123')).toEqual({ stepId: '5', fileIdentifier: 'abc123' });
    });

    it('returns null fileIdentifier for a step entry with no colon', () => {
        expect(parseSetByTeacherStepEntry('5')).toEqual({ stepId: '5', fileIdentifier: null });
    });

    it('handles multi-digit step IDs', () => {
        expect(parseSetByTeacherStepEntry('15:abc123')).toEqual({ stepId: '15', fileIdentifier: 'abc123' });
    });

    it('uses the first colon as the separator so file identifiers containing colons are preserved', () => {
        expect(parseSetByTeacherStepEntry('5:nano:with:colons')).toEqual({ stepId: '5', fileIdentifier: 'nano:with:colons' });
    });
});

/**
 * buildClassTopicRow is shared by the teacher-facing addClassTopic and by sequence
 * materialization, so a change here silently affects both paths.
 */
describe('ClassTopicService#buildClassTopicRow', () => {
    const schoolClass = { id: '10' } as LwpSchoolClass;
    const topic = { id: '20' } as StaticLwpTopic;
    const user = { id: '30' } as LwpUser;

    const releaseTime = { value: '4' };
    const formattedRelease = new Date('2026-09-07T04:00:00');

    let service: ClassTopicService;
    let getDateTimeFormat: jest.Mock;
    let getParameterByKey: jest.Mock;

    beforeEach(() => {
        getDateTimeFormat = jest.fn().mockReturnValue(formattedRelease);
        getParameterByKey = jest.fn().mockResolvedValue(releaseTime);

        // Only these two collaborators are reachable from buildClassTopicRow.
        service = new ClassTopicService(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            { getDateTimeFormat } as never,
            null,
            null,
            null,
            { getParameterByKey } as never,
            null,
            null
        );
    });

    it('maps the class, topic and creating user onto the row', async () => {
        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            logCreatedBy: user
        });

        expect(row.class).toBe(schoolClass);
        expect(row.topic).toBe(topic);
        expect(row.logCreatedBy).toBe(user);
    });

    it('runs the release date through the RELEASED_TIME parameter', async () => {
        const releaseDate = new Date('2026-09-07T00:00:00');

        const row = await service.buildClassTopicRow({ schoolClass, topic, releaseDate, logCreatedBy: user });

        expect(getParameterByKey).toHaveBeenCalledWith('RELEASED_TIME');
        expect(getDateTimeFormat).toHaveBeenCalledWith(releaseDate, '4');
        expect(row.releaseDate).toBe(formattedRelease);
    });

    it('leaves dueDate null when none is given, and reflects that in displayDate', async () => {
        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            logCreatedBy: user
        });

        expect(row.dueDate).toBeNull();
        expect(row.displayDate).toEqual('Released on 2026-09-07');
    });

    it('keeps a supplied dueDate as a date only, and shows it in displayDate', async () => {
        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            dueDate: new Date('2026-09-13T00:00:00'),
            logCreatedBy: user
        });

        // The date is round-tripped through a 'YYYY-MM-DD' string, which JavaScript parses as UTC
        // midnight rather than local, so any time component on the way in is dropped.
        expect(row.dueDate).toEqual(new Date('2026-09-13'));
        expect(row.displayDate).toEqual('Due By 2026-09-13');
    });

    it('carries the teacher message through', async () => {
        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            teacherMessage: 'Have a go at this one',
            logCreatedBy: user
        });

        expect(row.teacherMessage).toEqual('Have a go at this one');
    });

    it('leaves the sequence assignment unset for a manually scheduled topic', async () => {
        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            logCreatedBy: user
        });

        expect(row.classSequenceAssignment).toBeUndefined();
    });

    it('links to the sequence assignment when materializing a sequence', async () => {
        const assignment = { id: '40' } as LwpClassSequenceAssignment;

        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            logCreatedBy: user,
            classSequenceAssignment: assignment
        });

        expect(row.classSequenceAssignment).toBe(assignment);
    });

    it('does not save, so the caller owns the transaction', async () => {
        const row = await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            logCreatedBy: user
        });

        expect(row.id).toBeUndefined();
    });

    it('uses a release time the caller already resolved rather than reading it again', async () => {
        await service.buildClassTopicRow({
            schoolClass,
            topic,
            releaseDate: new Date('2026-09-07T00:00:00'),
            logCreatedBy: user,
            releaseTime: '7'
        });

        expect(getParameterByKey).not.toHaveBeenCalled();
        expect(getDateTimeFormat).toHaveBeenCalledWith(expect.any(Date), '7');
    });
});

/**
 * The service takes fifteen constructor arguments, so the write suites below build it through this
 * helper and name only the collaborators the path under test can actually reach.
 */
const createService = (parts: {
    classTopicRepository?: unknown;
    topicRepository?: unknown;
    schoolClassRepository?: unknown;
    userRepository?: unknown;
    activityStepsRepository?: unknown;
    helperService?: unknown;
    parameterService?: unknown;
    shallowUserService?: unknown;
    connection?: unknown;
}): ClassTopicService =>
    new ClassTopicService(
        parts.classTopicRepository as never,
        null,
        parts.topicRepository as never,
        parts.schoolClassRepository as never,
        null,
        null,
        parts.userRepository as never,
        parts.activityStepsRepository as never,
        parts.helperService as never,
        null,
        null,
        null,
        parts.parameterService as never,
        parts.shallowUserService as never,
        parts.connection as never
    );

/**
 * The one rule these tests exist to protect: inside a transaction, a class topic write only touches
 * the database. Storage is not transactional, so every file effect is reported to the caller and done
 * either after the commit or on the rollback, never in between.
 */
describe('ClassTopicService class topic writes', () => {
    const subject = { id: 'subj-1' } as StaticLwpSubject;
    const topic = {
        id: 'topic-1',
        domainsAndYearGroups: [{ domain: { subject } }]
    } as unknown as StaticLwpTopic;
    const user = { id: 'user-1' } as LwpUser;

    let service: ClassTopicService;
    let removeFile: jest.Mock;
    let copyFile: jest.Mock;
    let uploadFile: jest.Mock;
    let managerSave: jest.Mock;
    let mediaSave: jest.Mock;
    let addRelation: jest.Mock;
    let manager: EntityManager;
    let transaction: jest.Mock;
    let messagesQuery: { getMany: jest.Mock };
    /** How many files had been deleted at the moment the transaction was about to commit. */
    let deletesBeforeCommit: number;
    /** A failed save logs its real error; silenced here so the expected failures do not flood the output. */
    let consoleError: jest.SpyInstance;

    const registrationClass = (id: string, subjects: StaticLwpSubject[] = []): LwpSchoolClass =>
        ({ id, subjects, isRegistrationClass: true, isGroupAcrossClasses: false }) as LwpSchoolClass;

    const request = (schoolClass: LwpSchoolClass, overrides = {}): ClassTopicWriteRequest => ({
        schoolClass,
        topic,
        releaseDate: new Date('2026-09-07T00:00:00'),
        createdBy: user.id,
        logCreatedBy: user,
        subjectsToLink: [subject],
        ...overrides
    });

    beforeEach(() => {
        removeFile = jest.fn().mockResolvedValue(undefined);
        copyFile = jest.fn().mockResolvedValue(undefined);
        uploadFile = jest.fn().mockResolvedValue(undefined);
        mediaSave = jest.fn().mockResolvedValue(undefined);
        addRelation = jest.fn().mockResolvedValue(undefined);
        managerSave = jest.fn().mockImplementation((row) => Promise.resolve(Object.assign(row, { id: 'class-topic-1' })));
        deletesBeforeCommit = 0;
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        noticeError.mockClear();

        messagesQuery = { getMany: jest.fn().mockResolvedValue([]) };

        const messagesQueryBuilder = {
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getMany: (): Promise<unknown[]> => messagesQuery.getMany()
        };

        manager = {
            save: managerSave,
            getRepository: jest.fn(() => ({
                save: mediaSave,
                createQueryBuilder: (): typeof messagesQueryBuilder => messagesQueryBuilder
            })),
            createQueryBuilder: jest.fn(() => ({
                relation: jest.fn(() => ({ of: jest.fn(() => ({ add: addRelation })) }))
            }))
        } as unknown as EntityManager;

        transaction = jest.fn(async (runInTransaction: (m: EntityManager) => Promise<unknown>) => {
            const result = await runInTransaction(manager);

            // Captured before the commit, so a delete inside the transaction cannot slip through.
            deletesBeforeCommit = removeFile.mock.calls.length;

            return result;
        });

        service = createService({
            helperService: {
                getDateTimeFormat: jest.fn().mockReturnValue(new Date('2026-09-07T04:00:00')),
                removeFile,
                copyFile,
                uploadFile
            },
            parameterService: { getParameterByKey: jest.fn().mockResolvedValue({ value: '4' }) },
            connection: { transaction }
        });
    });

    afterEach(() => consoleError.mockRestore());

    describe('#persistClassTopic', () => {
        it('writes the row through the caller transaction and never deletes a file', async () => {
            const context = await service.beginClassTopicWrite(manager);

            const { classTopic, effects } = await service.persistClassTopic(context, request(registrationClass('class-1')));

            expect(managerSave).toHaveBeenCalledTimes(1);
            expect(classTopic.id).toBe('class-topic-1');
            expect(removeFile).not.toHaveBeenCalled();
            expect(effects.supersededFiles).toEqual([]);
        });

        it('reads the release time once per transaction rather than once per row', async () => {
            const getParameterByKey = jest.fn().mockResolvedValue({ value: '4' });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (service as any).parameterService = { getParameterByKey };

            const context = await service.beginClassTopicWrite(manager);

            await service.persistClassTopic(context, request(registrationClass('class-1')));
            await service.persistClassTopic(context, request(registrationClass('class-2')));

            expect(getParameterByKey).toHaveBeenCalledTimes(1);
        });

        it('writes parent messages inside the transaction, so nothing but file deletes is left for after the commit', async () => {
            messagesQuery.getMany.mockResolvedValue([{ id: 'media-1', parentMessage: null, step: { id: 'step-1' } }]);

            const context = await service.beginClassTopicWrite(manager);

            const { effects } = await service.persistClassTopic(
                context,
                request(registrationClass('class-1'), { stepMessages: [{ stepId: 'step-1', parentMessage: 'Look at this' }] })
            );

            expect(mediaSave).toHaveBeenCalledWith([expect.objectContaining({ id: 'media-1', parentMessage: 'Look at this' })]);
            expect(effects).toEqual({ supersededFiles: [] });
        });

        it('writes the media rows for files already copied for this class', async () => {
            const context = await service.beginClassTopicWrite(manager);

            await service.persistClassTopic(
                context,
                request(registrationClass('class-1'), {
                    media: { route: 'staged', copied: [{ stepId: 'step-1', folder: 'images', filename: 'copied.jpg' }] }
                })
            );

            expect(mediaSave).toHaveBeenCalledTimes(1);
            expect(mediaSave.mock.calls[0][0]).toEqual([expect.objectContaining({ filename: 'copied.jpg' })]);
            expect(copyFile).not.toHaveBeenCalled();
        });

        it('links the topic subject to a registration class', async () => {
            const context = await service.beginClassTopicWrite(manager);

            await service.persistClassTopic(context, request(registrationClass('class-1')));

            expect(addRelation).toHaveBeenCalledWith([subject.id]);
        });

        it('does not link a subject the class already has', async () => {
            const context = await service.beginClassTopicWrite(manager);

            await service.persistClassTopic(context, request(registrationClass('class-1', [subject])));

            expect(addRelation).not.toHaveBeenCalled();
        });

        it('does not link a subject twice for the same class in one transaction', async () => {
            const context = await service.beginClassTopicWrite(manager);
            const schoolClass = registrationClass('class-1');

            await service.persistClassTopic(context, request(schoolClass));
            await service.persistClassTopic(context, request(schoolClass));

            // Two rows, one link. A second insert would violate the join table's primary key and take
            // the whole transaction down with it.
            expect(managerSave).toHaveBeenCalledTimes(2);
            expect(addRelation).toHaveBeenCalledTimes(1);
        });

        it('leaves a class that is neither a registration nor a group-across-classes class alone', async () => {
            const context = await service.beginClassTopicWrite(manager);
            const ordinaryClass = {
                id: 'class-9',
                subjects: [],
                isRegistrationClass: false,
                isGroupAcrossClasses: false
            } as LwpSchoolClass;

            await service.persistClassTopic(context, request(ordinaryClass));

            expect(addRelation).not.toHaveBeenCalled();
        });
    });

    describe('#applyClassTopicWriteEffects', () => {
        it('deletes every superseded file across all rows', async () => {
            await service.applyClassTopicWriteEffects([
                { supersededFiles: [{ folder: 'images', filename: 'one.jpg' }] },
                { supersededFiles: [{ folder: 'audio', filename: 'two.mp3' }] }
            ]);

            expect(removeFile).toHaveBeenCalledTimes(2);
            expect(removeFile).toHaveBeenCalledWith('images/one.jpg', true);
            expect(removeFile).toHaveBeenCalledWith('audio/two.mp3', true);
        });

        it('cannot fail the request, because the rows are already saved by the time it runs', async () => {
            removeFile.mockRejectedValue(new Error('storage down'));

            await expect(
                service.applyClassTopicWriteEffects([{ supersededFiles: [{ folder: 'images', filename: 'one.jpg' }] }])
            ).resolves.toBeUndefined();
        });
    });

    describe('#discardStoredFiles', () => {
        it('removes every file the rolled-back write had stored', async () => {
            await service.discardStoredFiles([
                { folder: 'images', filename: 'a.jpg' },
                { folder: 'images', filename: 'b.jpg' }
            ]);

            expect(removeFile).toHaveBeenCalledTimes(2);
        });

        it('does nothing when the write stored no files', async () => {
            await service.discardStoredFiles([]);

            expect(removeFile).not.toHaveBeenCalled();
        });
    });

    describe('#addTopicToClasses', () => {
        const input = {
            topicId: topic.id,
            classId: ['class-1', 'class-2', 'class-3'],
            releaseDate: new Date('2026-09-07T00:00:00'),
            dueDate: null,
            teacherMessage: '',
            createdBy: user.id
        } as unknown as AddTopicToClassesInput;

        beforeEach(() => {
            const topicQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(topic)
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const internals = service as any;

            internals.topicRepository = { createQueryBuilder: (): typeof topicQueryBuilder => topicQueryBuilder };
            internals.schoolClassRepository = { findOne: jest.fn(({ where }) => Promise.resolve(registrationClass(where.id))) };
            internals.userRepository = { findOne: jest.fn().mockResolvedValue(user) };
        });

        it('creates every class in one transaction', async () => {
            await service.addTopicToClasses(input, [], user.id);

            expect(transaction).toHaveBeenCalledTimes(1);
            expect(managerSave).toHaveBeenCalledTimes(3);
        });

        it('resolves the topic and the user once rather than once per class', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const internals = service as any;

            await service.addTopicToClasses(input, [], user.id);

            expect(internals.userRepository.findOne).toHaveBeenCalledTimes(1);
            expect(internals.schoolClassRepository.findOne).toHaveBeenCalledTimes(3);
        });

        it('collapses the same class listed twice', async () => {
            await service.addTopicToClasses({ ...input, classId: ['class-1', 'class-1'] }, [], user.id);

            expect(managerSave).toHaveBeenCalledTimes(1);
        });

        it('does nothing when no class is given', async () => {
            await service.addTopicToClasses({ ...input, classId: [] }, [], user.id);

            expect(transaction).not.toHaveBeenCalled();
        });

        it('creates no class topics at all when one class fails', async () => {
            managerSave.mockImplementationOnce((row) => Promise.resolve(Object.assign(row, { id: 'class-topic-1' })));
            managerSave.mockImplementationOnce(() => Promise.reject(new Error('insert failed')));

            await expect(service.addTopicToClasses(input, [], user.id)).rejects.toMatchObject({ message: CLASS_TOPIC_SAVE_FAILED });

            // Every row was in the one transaction, so the rollback covers the class that succeeded too.
            expect(transaction).toHaveBeenCalledTimes(1);
        });

        it('deletes the files copied for every class when the transaction fails', async () => {
            const staged = [{ stepId: 'step-1', folder: 'images', stagedFilename: 'staged_1_photo.jpg' }];

            jest.spyOn(service, 'stageSetByTeacherFiles').mockResolvedValue(staged);
            jest.spyOn(service, 'deleteSetByTeacherStagedFiles').mockResolvedValue(undefined);

            managerSave.mockImplementation(() => Promise.reject(new Error('insert failed')));

            const withFiles = { ...input, setByTeacherStepIds: ['step-1:photo'] };

            await expect(service.addTopicToClasses(withFiles, [{ filename: 'photo.jpg' } as never], user.id)).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED
            });

            // One copy per class, and every one of them removed, not only the class that failed.
            expect(copyFile).toHaveBeenCalledTimes(3);
            expect(removeFile).toHaveBeenCalledTimes(3);
            expect(deletesBeforeCommit).toBe(0);
        });

        it('does not delete anything when every class succeeds', async () => {
            const staged = [{ stepId: 'step-1', folder: 'images', stagedFilename: 'staged_1_photo.jpg' }];

            jest.spyOn(service, 'stageSetByTeacherFiles').mockResolvedValue(staged);
            jest.spyOn(service, 'deleteSetByTeacherStagedFiles').mockResolvedValue(undefined);

            const withFiles = { ...input, setByTeacherStepIds: ['step-1:photo'] };

            await service.addTopicToClasses(withFiles, [{ filename: 'photo.jpg' } as never], user.id);

            expect(copyFile).toHaveBeenCalledTimes(3);
            expect(removeFile).not.toHaveBeenCalled();
            expect(deletesBeforeCommit).toBe(0);
        });

        it('removes the staged originals whether the write succeeds or fails', async () => {
            const staged = [{ stepId: 'step-1', folder: 'images', stagedFilename: 'staged_1_photo.jpg' }];

            jest.spyOn(service, 'stageSetByTeacherFiles').mockResolvedValue(staged);

            const deleteStaged = jest.spyOn(service, 'deleteSetByTeacherStagedFiles').mockResolvedValue(undefined);

            managerSave.mockImplementation(() => Promise.reject(new Error('insert failed')));

            const withFiles = { ...input, setByTeacherStepIds: ['step-1:photo'] };

            await expect(service.addTopicToClasses(withFiles, [{ filename: 'photo.jpg' } as never], user.id)).rejects.toThrow();

            expect(deleteStaged).toHaveBeenCalledWith(staged);
        });

        it('creates no class topics, and removes every copy, when a parent message cannot be written', async () => {
            const staged = [{ stepId: 'step-1', folder: 'images', stagedFilename: 'staged_1_photo.jpg' }];
            const messageError = new Error('message save failed');

            jest.spyOn(service, 'stageSetByTeacherFiles').mockResolvedValue(staged);
            jest.spyOn(service, 'deleteSetByTeacherStagedFiles').mockResolvedValue(undefined);

            messagesQuery.getMany.mockResolvedValue([{ id: 'media-1', parentMessage: null, step: { id: 'step-1' } }]);
            // The media rows save; only the write that sets a parent message fails.
            mediaSave.mockImplementation((rows: Array<{ parentMessage?: string }>) =>
                rows[0]?.parentMessage ? Promise.reject(messageError) : Promise.resolve()
            );

            const withMessage = {
                ...input,
                setByTeacherStepIds: ['step-1:photo'],
                setByTeacherStepMessages: [{ stepId: 'step-1', parentMessage: 'Look at this' }]
            };

            await expect(service.addTopicToClasses(withMessage, [{ filename: 'photo.jpg' } as never], user.id)).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED
            });

            expect(copyFile).toHaveBeenCalledTimes(3);
            expect(removeFile).toHaveBeenCalledTimes(3);
            expect(noticeError).toHaveBeenCalledWith(messageError, expect.objectContaining({ caught: true }));
        });

        it('tells the teacher the topic could not be saved when a copy fails, and removes every copy and staged file', async () => {
            const staged = [{ stepId: 'step-1', folder: 'images', stagedFilename: 'staged_1_photo.jpg' }];

            jest.spyOn(service, 'stageSetByTeacherFiles').mockResolvedValue(staged);

            const deleteStaged = jest.spyOn(service, 'deleteSetByTeacherStagedFiles').mockResolvedValue(undefined);

            copyFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('storage down'));

            const withFiles = { ...input, setByTeacherStepIds: ['step-1:photo'] };

            await expect(service.addTopicToClasses(withFiles, [{ filename: 'photo.jpg' } as never], user.id)).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED
            });

            expect(transaction).not.toHaveBeenCalled();
            // The first class's copy had landed, so it is removed; the staged original goes too.
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(deleteStaged).toHaveBeenCalledWith(staged);
        });

        it('tells the teacher the topic could not be saved when staging fails, and removes what was staged', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const internals = service as any;

            internals.helperService.isValidUrlForActivityStep = (url: string, fileIdentifier: string): boolean =>
                url?.includes(fileIdentifier);
            internals.activityStepsRepository = {
                createQueryBuilder: (): Record<string, jest.Mock> => ({
                    where: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    getMany: jest.fn().mockResolvedValue([
                        { id: 'step-1', setByTeacherData: { type: 'IMAGE' } },
                        { id: 'step-2', setByTeacherData: { type: 'IMAGE' } }
                    ])
                })
            };

            uploadFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('storage down'));

            const withFiles = { ...input, setByTeacherStepIds: ['step-1:first', 'step-2:second'] };

            await expect(
                service.addTopicToClasses(withFiles, [{ filename: 'first.jpg' } as never, { filename: 'second.jpg' } as never], user.id)
            ).rejects.toMatchObject({ message: CLASS_TOPIC_SAVE_FAILED });

            expect(transaction).not.toHaveBeenCalled();
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(uploadFile.mock.calls[0][0], true);
        });
    });
});

/**
 * The single-class and edit routes' own media. Their uploads used to run inside the transaction, so a
 * slow upload held a database connection open for its whole length. Every test here checks that the
 * transaction itself makes no storage call: files go in before it opens, and come out only after it
 * commits or rolls back.
 */
describe('ClassTopicService set by teacher media on the single-class and edit routes', () => {
    const imageFolder = appConstants.minioPaths.public.uploadedSetByTeacherImage;
    const subject = { id: 'subj-1' } as StaticLwpSubject;
    const topic = { id: 'topic-1', domainsAndYearGroups: [{ domain: { subject } }] } as unknown as StaticLwpTopic;
    const user = { id: 'user-1' } as LwpUser;
    const photo = { filename: 'photo.jpg' } as never;

    let service: ClassTopicService;
    let uploadFile: jest.Mock;
    let removeFile: jest.Mock;
    let managerSave: jest.Mock;
    let mediaSave: jest.Mock;
    let mediaDelete: jest.Mock;
    let classFindOne: jest.Mock;
    let transaction: jest.Mock;
    let existingMedia: unknown[];
    let storageCallsDuringTransaction: number;
    /** A failed save logs its real error; silenced here so the expected failures do not flood the output. */
    let consoleError: jest.SpyInstance;
    /** The edit's second, locked read inside the transaction: the row as it is after the upload. */
    let lockedFindOne: jest.Mock;

    const steps = [
        { id: 'step-1', setByTeacherData: { type: 'IMAGE' } },
        { id: 'step-2', setByTeacherData: { type: 'IMAGE' } }
    ];

    const queryBuilder = (rows: () => unknown[]): Record<string, jest.Mock> => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn(() => Promise.resolve(rows()))
    });

    const storageCalls = (): number => uploadFile.mock.calls.length + removeFile.mock.calls.length;

    const uploadedName = (call = 0): string => uploadFile.mock.calls[call][0];

    const parentMessages = [{ stepId: 'step-1', parentMessage: 'Look at this' }];

    /** Saves of media rows succeed; the one that sets a parent message fails, as a database fault would. */
    const failParentMessageSave = (error: Error): void => {
        mediaSave.mockImplementation((rows: Array<{ parentMessage?: string }>) =>
            rows[0]?.parentMessage ? Promise.reject(error) : Promise.resolve()
        );
    };

    const addInput = (setByTeacherStepIds: string[], setByTeacherStepMessages?: typeof parentMessages): ClassTopicInput =>
        ({
            topicId: topic.id,
            classId: 'class-1',
            releaseDate: new Date('2026-09-07T00:00:00'),
            createdBy: user.id,
            setByTeacherStepIds,
            setByTeacherStepMessages
        }) as unknown as ClassTopicInput;

    const editInput = (setByTeacherStepIds: string[], setByTeacherStepMessages?: typeof parentMessages): UpdateClassTopicInput =>
        ({
            id: 'class-topic-1',
            releaseDate: new Date('2026-09-07T00:00:00'),
            dueDate: null,
            teacherMessage: 'Updated',
            setByTeacherStepIds,
            setByTeacherStepMessages
        }) as unknown as UpdateClassTopicInput;

    beforeEach(() => {
        uploadFile = jest.fn().mockResolvedValue(undefined);
        removeFile = jest.fn().mockResolvedValue(undefined);
        managerSave = jest.fn().mockImplementation((row) => Promise.resolve(Object.assign(row, { id: 'class-topic-1' })));
        mediaSave = jest.fn().mockResolvedValue(undefined);
        mediaDelete = jest.fn().mockResolvedValue(undefined);
        classFindOne = jest.fn().mockResolvedValue({ id: 'class-1', subjects: [], isRegistrationClass: false });
        existingMedia = [];
        storageCallsDuringTransaction = 0;
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        noticeError.mockClear();
        // By default nothing changed during the upload, so the locked copy matches the first read.
        lockedFindOne = jest.fn().mockImplementation(() => Promise.resolve({ id: 'class-topic-1', released: false }));

        const manager = {
            save: managerSave,
            findOne: lockedFindOne,
            getRepository: jest.fn((entity) =>
                entity === StaticLwpActivitySteps
                    ? { createQueryBuilder: (): Record<string, jest.Mock> => queryBuilder(() => steps) }
                    : {
                          createQueryBuilder: (): Record<string, jest.Mock> => queryBuilder(() => existingMedia),
                          save: mediaSave,
                          delete: mediaDelete
                      }
            ),
            createQueryBuilder: jest.fn(() => ({
                relation: jest.fn(() => ({ of: jest.fn(() => ({ add: jest.fn() })) }))
            }))
        } as unknown as EntityManager;

        // Counts storage calls made while the callback runs, whether it commits or throws.
        transaction = jest.fn(async (runInTransaction: (m: EntityManager) => Promise<unknown>) => {
            const before = storageCalls();

            try {
                return await runInTransaction(manager);
            } finally {
                storageCallsDuringTransaction = storageCalls() - before;
            }
        });

        service = createService({
            classTopicRepository: {
                findOne: jest.fn().mockResolvedValue({ id: 'class-topic-1', released: false, class: { id: 'class-1' } })
            },
            topicRepository: {
                createQueryBuilder: () => ({
                    leftJoinAndSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(topic)
                })
            },
            schoolClassRepository: { findOne: classFindOne },
            userRepository: { findOne: jest.fn().mockResolvedValue(user) },
            activityStepsRepository: { createQueryBuilder: () => queryBuilder(() => steps) },
            helperService: {
                getDateTimeFormat: jest.fn().mockReturnValue(new Date('2026-09-07T04:00:00')),
                isValidUrlForActivityStep: (url: string, fileIdentifier: string) => url?.includes(fileIdentifier),
                uploadFile,
                removeFile
            },
            parameterService: { getParameterByKey: jest.fn().mockResolvedValue({ value: '4' }) },
            connection: { transaction }
        });
    });

    afterEach(() => consoleError.mockRestore());

    describe('scheduling to one class', () => {
        it('uploads the photo before the transaction and writes only its row inside it', async () => {
            await service.addClassTopic(addInput(['step-1:photo']), [photo]);

            expect(uploadFile).toHaveBeenCalledTimes(1);
            expect(uploadedName()).toMatch(new RegExp(`^${imageFolder}/\\d+_photo\\.jpg$`));
            expect(storageCallsDuringTransaction).toBe(0);
            expect(mediaSave).toHaveBeenCalledWith([
                expect.objectContaining({ step: { id: 'step-1' }, filename: uploadedName().replace(`${imageFolder}/`, '') })
            ]);
        });

        it('removes the uploaded photo when the transaction rolls back', async () => {
            const databaseError = new Error('media save failed');

            mediaSave.mockRejectedValue(databaseError);

            // The teacher gets the save message, not the database's own text; that goes to the logs instead.
            await expect(service.addClassTopic(addInput(['step-1:photo']), [photo])).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED,
                status: 535
            });

            expect(storageCallsDuringTransaction).toBe(0);
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(uploadedName(), true);
            expect(consoleError).toHaveBeenCalledWith(expect.any(String), databaseError);
            // New Relic gets the real reason; the generic message the resolver throws would say nothing.
            expect(noticeError).toHaveBeenCalledTimes(1);
            expect(noticeError).toHaveBeenCalledWith(databaseError, expect.objectContaining({ caught: true }));
        });

        it('removes the uploaded photo, and reports the real error, when its parent message cannot be written', async () => {
            const messageError = new Error('message save failed');

            existingMedia = [{ id: 'media-1', parentMessage: null, step: { id: 'step-1' } }];
            failParentMessageSave(messageError);

            await expect(service.addClassTopic(addInput(['step-1:photo'], parentMessages), [photo])).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED,
                status: 535
            });

            expect(storageCallsDuringTransaction).toBe(0);
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(uploadedName(), true);
            expect(noticeError).toHaveBeenCalledWith(messageError, expect.objectContaining({ caught: true }));
        });

        it('opens no transaction and leaves nothing behind when an upload fails part way', async () => {
            const storageError = new Error('storage down');

            uploadFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(storageError);

            // A readable message with a status, because the storage client's own error has neither and the
            // schedule forms show a generic or even a blank message for that.
            await expect(
                service.addClassTopic(addInput(['step-1:first', 'step-2:second']), [
                    { filename: 'first.jpg' } as never,
                    { filename: 'second.jpg' } as never
                ])
            ).rejects.toMatchObject({ message: CLASS_TOPIC_SAVE_FAILED, status: 535 });

            expect(transaction).not.toHaveBeenCalled();
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(uploadedName(0), true);
            // The original is kept in the logs, so the reason is not lost behind the friendly message.
            expect(consoleError).toHaveBeenCalledWith(expect.any(String), storageError);
            expect(noticeError).toHaveBeenCalledWith(storageError, expect.objectContaining({ caught: true }));
        });

        it('uploads nothing for a request refused because its class does not exist', async () => {
            classFindOne.mockResolvedValue(null);

            await expect(service.addClassTopic(addInput(['step-1:photo']), [photo])).rejects.toThrow('Class does not exist');

            expect(uploadFile).not.toHaveBeenCalled();
            // Our own refusal is not a fault, so it is passed through as it is and not reported.
            expect(noticeError).not.toHaveBeenCalled();
        });
    });

    describe('editing a class topic', () => {
        beforeEach(() => {
            existingMedia = [{ id: 'media-1', filename: 'previous.jpg', step: { id: 'step-1' } }];
        });

        it('uploads a replacement before the transaction and deletes the original only after the commit', async () => {
            await service.updateClassTopic(editInput(['step-1:photo']), [photo], user.id);

            expect(storageCallsDuringTransaction).toBe(0);
            expect(mediaSave).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'media-1', filename: uploadedName().replace(`${imageFolder}/`, '') })
            ]);
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(`${imageFolder}/previous.jpg`, true);
        });

        it('removes the replacement and keeps the original when the transaction rolls back', async () => {
            mediaSave.mockRejectedValue(new Error('media save failed'));

            await expect(service.updateClassTopic(editInput(['step-1:photo']), [photo], user.id)).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED
            });

            expect(storageCallsDuringTransaction).toBe(0);
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(uploadedName(), true);
        });

        it('tells the teacher the topic could not be saved, and leaves the original photo in place, when a replacement upload fails', async () => {
            uploadFile.mockRejectedValueOnce(new Error('storage down'));

            await expect(service.updateClassTopic(editInput(['step-1:photo']), [photo], user.id)).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED,
                status: 535
            });

            expect(transaction).not.toHaveBeenCalled();
            expect(mediaSave).not.toHaveBeenCalled();
            expect(removeFile).not.toHaveBeenCalled();
        });

        it('writes a message-only edit inside the transaction', async () => {
            await service.updateClassTopic(editInput([], parentMessages), [], user.id);

            expect(uploadFile).not.toHaveBeenCalled();
            expect(mediaSave).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'media-1', parentMessage: 'Look at this', logUpdatedBy: { id: user.id } })
            ]);
            expect(removeFile).not.toHaveBeenCalled();
        });

        it('keeps the original photo and removes the replacement when the parent message cannot be written', async () => {
            const messageError = new Error('message save failed');

            failParentMessageSave(messageError);

            await expect(service.updateClassTopic(editInput(['step-1:photo'], parentMessages), [photo], user.id)).rejects.toMatchObject({
                message: CLASS_TOPIC_SAVE_FAILED,
                status: 535
            });

            expect(storageCallsDuringTransaction).toBe(0);
            // Only the replacement goes. The original is deleted after a commit, and there was none.
            expect(removeFile).toHaveBeenCalledTimes(1);
            expect(removeFile).toHaveBeenCalledWith(uploadedName(), true);
            expect(noticeError).toHaveBeenCalledWith(messageError, expect.objectContaining({ caught: true }));
        });

        it('removes the media row of a step sent with no file, and its file only after the commit', async () => {
            // An entry with no file identifier is how the edit form says the teacher removed the photo.
            await service.updateClassTopic(editInput(['step-1']), [], user.id);

            expect(uploadFile).not.toHaveBeenCalled();
            expect(storageCallsDuringTransaction).toBe(0);
            expect(mediaDelete).toHaveBeenCalledWith(['media-1']);
            expect(removeFile).toHaveBeenCalledWith(`${imageFolder}/previous.jpg`, true);
        });

        /*
         * The first read happens before the upload, which can take seconds, and the release job (or a teacher
         * email job) can write to the row in that time. The edit has to be judged and saved on the row as it is
         * after the upload, or it puts back what those jobs just changed.
         */
        describe('when the topic is released while the photo uploads', () => {
            const releasedDuringUpload = (releaseDate: Date): Record<string, unknown> => ({
                id: 'class-topic-1',
                released: true,
                teacherNotified: true,
                releaseDate,
                teacherMessage: 'Updated'
            });

            it('refuses an edit that changes the release date, and removes the photo it uploaded', async () => {
                // Released on 1 September, while the edit moves it to 7 September.
                lockedFindOne.mockResolvedValue(releasedDuringUpload(new Date('2026-09-01T04:00:00')));

                await expect(service.updateClassTopic(editInput(['step-1:photo']), [photo], user.id)).rejects.toMatchObject({
                    message: 'Topic is released! You can not change release date, email message or topic message.'
                });

                expect(managerSave).not.toHaveBeenCalled();
                expect(mediaSave).not.toHaveBeenCalled();
                expect(removeFile).toHaveBeenCalledTimes(1);
                expect(removeFile).toHaveBeenCalledWith(uploadedName(), true);
                // Our own refusal, so it reaches the teacher as written and is not reported as a fault.
                expect(noticeError).not.toHaveBeenCalled();
            });

            it('saves a photo-only edit on the locked fresh copy, keeping what the jobs wrote', async () => {
                const fresh = releasedDuringUpload(new Date('2026-09-07T04:00:00'));

                lockedFindOne.mockResolvedValue(fresh);

                await service.updateClassTopic(editInput(['step-1:photo']), [photo], user.id);

                expect(lockedFindOne).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({ where: { id: 'class-topic-1' }, lock: { mode: 'pessimistic_write' } })
                );
                expect(managerSave).toHaveBeenCalledTimes(1);
                expect(managerSave.mock.calls[0][0]).toBe(fresh);
                expect(fresh).toMatchObject({ released: true, teacherNotified: true });
                expect(mediaSave).toHaveBeenCalled();
            });
        });
    });
});

/** The single-class mutation and the two test-data seeders all come through addClassTopic. */
describe('ClassTopicService#addClassTopic', () => {
    const subject = { id: 'subj-1' } as StaticLwpSubject;
    const topic = { id: 'topic-1', domainsAndYearGroups: [{ domain: { subject } }] } as unknown as StaticLwpTopic;
    const user = { id: 'user-1' } as LwpUser;

    let service: ClassTopicService;
    let transaction: jest.Mock;
    let managerSave: jest.Mock;
    let addRelation: jest.Mock;
    let removeFile: jest.Mock;
    let topicGetOne: jest.Mock;
    let classFindOne: jest.Mock;

    const input = {
        topicId: topic.id,
        classId: 'class-1',
        releaseDate: new Date('2026-09-07T00:00:00'),
        dueDate: null,
        teacherMessage: 'Have a go',
        createdBy: user.id
    } as unknown as ClassTopicInput;

    beforeEach(() => {
        managerSave = jest.fn().mockImplementation((row) => Promise.resolve(Object.assign(row, { id: 'class-topic-1' })));
        addRelation = jest.fn().mockResolvedValue(undefined);
        removeFile = jest.fn().mockResolvedValue(undefined);
        topicGetOne = jest.fn().mockResolvedValue(topic);
        classFindOne = jest.fn().mockResolvedValue({ id: 'class-1', subjects: [], isRegistrationClass: true });

        const manager = {
            save: managerSave,
            getRepository: jest.fn(() => ({ save: jest.fn() })),
            createQueryBuilder: jest.fn(() => ({
                relation: jest.fn(() => ({ of: jest.fn(() => ({ add: addRelation })) }))
            }))
        } as unknown as EntityManager;

        transaction = jest.fn(async (runInTransaction: (m: EntityManager) => Promise<unknown>) => runInTransaction(manager));

        service = createService({
            topicRepository: {
                createQueryBuilder: () => ({
                    leftJoinAndSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: topicGetOne
                })
            },
            schoolClassRepository: { findOne: classFindOne },
            userRepository: { findOne: jest.fn().mockResolvedValue(user) },
            helperService: { getDateTimeFormat: jest.fn().mockReturnValue(new Date('2026-09-07T04:00:00')), removeFile },
            parameterService: { getParameterByKey: jest.fn().mockResolvedValue({ value: '4' }) },
            connection: { transaction }
        });
    });

    it('creates the topic and links the subject in the same transaction', async () => {
        const classTopic = await service.addClassTopic(input);

        expect(classTopic.id).toBe('class-topic-1');
        expect(transaction).toHaveBeenCalledTimes(1);
        // Committed with the row now, rather than before the transaction opened, so a failed create no
        // longer leaves the class holding a subject with nothing scheduled in it.
        expect(addRelation).toHaveBeenCalledWith([subject.id]);
    });

    it('rejects an unpublished or unknown topic before opening a transaction', async () => {
        topicGetOne.mockResolvedValue(null);

        await expect(service.addClassTopic(input)).rejects.toThrow('Topic does not exist');
        expect(transaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown class before opening a transaction', async () => {
        classFindOne.mockResolvedValue(null);

        await expect(service.addClassTopic(input)).rejects.toThrow('Class does not exist');
        expect(transaction).not.toHaveBeenCalled();
    });
});

/** updateClassTopic writes one row; its media is covered with the single-class route above. */
describe('ClassTopicService#updateClassTopic', () => {
    let service: ClassTopicService;
    let removeFile: jest.Mock;
    let managerSave: jest.Mock;

    const classTopic = { id: 'class-topic-1', released: false, class: { id: 'class-1' } };

    const input = {
        id: 'class-topic-1',
        releaseDate: new Date('2026-09-07T00:00:00'),
        dueDate: null,
        teacherMessage: 'Updated'
    } as unknown as UpdateClassTopicInput;

    beforeEach(() => {
        removeFile = jest.fn().mockResolvedValue(undefined);
        managerSave = jest.fn().mockResolvedValue(classTopic);

        const manager = {
            save: managerSave,
            findOne: jest.fn().mockResolvedValue({ ...classTopic }),
            getRepository: jest.fn(() => ({ save: jest.fn() }))
        } as unknown as EntityManager;

        service = createService({
            classTopicRepository: { findOne: jest.fn().mockResolvedValue({ ...classTopic }) },
            helperService: { getDateTimeFormat: jest.fn().mockReturnValue(new Date('2026-09-07T04:00:00')), removeFile },
            parameterService: { getParameterByKey: jest.fn().mockResolvedValue({ value: '4' }) },
            connection: {
                transaction: jest.fn(async (runInTransaction: (m: EntityManager) => Promise<unknown>) => runInTransaction(manager))
            }
        });
    });

    it('saves the row and deletes nothing when there is no media to supersede', async () => {
        await service.updateClassTopic(input, [], 'user-1');

        expect(managerSave).toHaveBeenCalledTimes(1);
        expect(removeFile).not.toHaveBeenCalled();
    });
});

/**
 * Bulk removal from the class schedule page. The rules matter more here than on the single-topic
 * path: the ids arrive from the browser as a set, so one topic the caller may not touch has to stop
 * the whole call rather than let the rest through.
 */
describe('ClassTopicService#deleteClassTopics', () => {
    const shallowUser = { id: 'user-1' } as LwpUser;

    let service: ClassTopicService;
    let update: jest.Mock;
    let getMany: jest.Mock;

    /** A class topic as the service loads it: the row, plus the topic it joins for the reading flag. */
    const classTopicRow = (
        id: string,
        overrides: { released?: boolean; isReading?: boolean } = {}
    ): { id: string; released: boolean; topic: { id: string; isReading: boolean } } => ({
        id,
        released: overrides.released ?? false,
        topic: { id: `topic-${id}`, isReading: overrides.isReading ?? false }
    });

    const givenStoredTopics = (rows: unknown[]): void => {
        getMany.mockResolvedValue(rows);
    };

    beforeEach(() => {
        update = jest.fn().mockResolvedValue({ affected: 2 });
        getMany = jest.fn().mockResolvedValue([]);

        const queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: (): Promise<unknown[]> => getMany()
        };

        service = createService({
            classTopicRepository: { createQueryBuilder: () => queryBuilder, update },
            shallowUserService: { newShallowUser: jest.fn().mockReturnValue(shallowUser) }
        });
    });

    it('marks every selected topic deleted in a single write', async () => {
        givenStoredTopics([classTopicRow('1'), classTopicRow('2')]);

        const result = await service.deleteClassTopics(['1', '2'], 'user-1');

        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith(['1', '2'], { deletedBy: shallowUser });
        expect(result.status).toBe('ok');
    });

    it('refuses the whole selection when one topic is already released, and writes nothing', async () => {
        givenStoredTopics([classTopicRow('1'), classTopicRow('2', { released: true })]);

        await expect(service.deleteClassTopics(['1', '2'], 'user-1')).rejects.toThrow('already released');

        expect(update).not.toHaveBeenCalled();
    });

    it('refuses the whole selection when one topic is a reading week, and writes nothing', async () => {
        givenStoredTopics([classTopicRow('1'), classTopicRow('2', { isReading: true })]);

        await expect(service.deleteClassTopics(['1', '2'], 'user-1')).rejects.toThrow('Reading weeks cannot be removed');

        expect(update).not.toHaveBeenCalled();
    });

    it('refuses when an id does not match a class topic, rather than silently removing the rest', async () => {
        givenStoredTopics([classTopicRow('1')]);

        await expect(service.deleteClassTopics(['1', 'missing'], 'user-1')).rejects.toThrow('Class Topic does not exist');

        expect(update).not.toHaveBeenCalled();
    });

    it('refuses an empty selection', async () => {
        await expect(service.deleteClassTopics([], 'user-1')).rejects.toThrow('No topics were selected');

        expect(update).not.toHaveBeenCalled();
    });

    /* A repeated id would otherwise make the loaded count disagree with the requested count and be
       read as a missing topic. */
    it('treats a repeated id as one topic', async () => {
        givenStoredTopics([classTopicRow('1')]);

        await service.deleteClassTopics(['1', '1'], 'user-1');

        expect(update).toHaveBeenCalledWith(['1'], { deletedBy: shallowUser });
    });
});
