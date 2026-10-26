import type { Schema } from '@lwp/postgres-client';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Kysely, type Selectable, sql } from 'kysely';
import { ReadingMode, UserType } from 'lwp-shared';
import { AddReadingLogInput, DeviceType, ReadingType, UpdateReadingLogAsGroupInput, UpdateReadingLogInput } from 'src/api/model';
import { createUtils } from 'src/api/service/functional-tests/utils';
import { LwpPupilFeedbackService } from 'src/api/service/lwp_pupil_feedback.service';
import { BaseModule } from 'src/base.module';
import { createDb } from 'src/data-import/functional-tests/utils';

// Booting the full Nest app and round-tripping the database is well over Jest's 5s default.
jest.setTimeout(120000);

describe('LwpPupilFeedbackService reading mode (LEA-6488)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let app: INestApplication;
    let feedbackService: LwpPupilFeedbackService;

    let parent: Selectable<Schema.LwpUser>;
    let school: Selectable<Schema.LwpSchool>;
    let schoolClass: Selectable<Schema.LwpSchoolClass>;
    let pupil: Selectable<Schema.LwpPupil>;
    let staticTopic: Selectable<Schema.StaticLwpTopic>;
    let classTopic: Selectable<Schema.LwpClassTopic>;
    let pupilTopic: Selectable<Schema.LwpPupilTopic>;

    const feedbackIds: string[] = [];

    const readingModeOf = async (feedbackId: string): Promise<string | null> => {
        const row = await db
            .selectFrom('lwp_pupil_feedback')
            .where('id', '=', feedbackId)
            .select(['readingMode'])
            .executeTakeFirstOrThrow();

        return row.readingMode;
    };

    const bookAnswersOf = async (feedbackId: string) =>
        await db
            .selectFrom('lwp_pupil_feedback')
            .where('id', '=', feedbackId)
            .select(['readingType', 'readingMode', 'isBookFinished', 'pageNumber'])
            .executeTakeFirstOrThrow();

    const editReadingLog = async (id: string, input: Partial<UpdateReadingLogInput>): Promise<void> => {
        await feedbackService.updateReadingLog({ id, ...input } as UpdateReadingLogInput, parent.id, UserType.PARENT, DeviceType.DESKTOP);
    };

    const editReadingLogAsGroup = async (id: string, input: Partial<UpdateReadingLogAsGroupInput>): Promise<void> => {
        await feedbackService.updateReadingLogAsGroup(
            { id, pupilIds: [pupil.id], ...input } as UpdateReadingLogAsGroupInput,
            parent.id,
            DeviceType.DESKTOP
        );
    };

    const addReadingLog = async (input: Partial<AddReadingLogInput>): Promise<string> => {
        const feedback = await feedbackService.addReadingLog(
            {
                pupilId: pupil.id,
                pupilTopicId: pupilTopic.id,
                bookName: 'The Snail and the Whale',
                bookReadAt: new Date(),
                userType: UserType.PARENT,
                ...input
            } as AddReadingLogInput,
            parent.id,
            UserType.PARENT,
            'Reading',
            'Parent',
            DeviceType.DESKTOP
        );

        feedbackIds.push(feedback.id);

        return feedback.id;
    };

    beforeAll(async () => {
        db = await createDb();
        utils = createUtils(db);
        app = await NestFactory.create(BaseModule);
        feedbackService = app.get(LwpPupilFeedbackService);

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        parent = await utils.createParent({ firstname: 'Reading', lastname: 'Parent' });
        school = await utils.createSchool({ schoolName: 'Reading Method School', curentPeriodIndex: currentPeriod.index });
        schoolClass = await utils.createClass(school.id, { name: 'Reading Method Class', isRegistrationClass: true });
        pupil = await utils.createPupil(school.id, {
            UPN: 'R000000000001',
            firstname: 'Reading',
            lastname: 'Pupil',
            dateOfBirth: new Date('2015-01-01')
        });
        await utils.addParentToPupil(pupil.id, parent.id);
        await utils.addPupilToClass(pupil.id, schoolClass.id);

        staticTopic = await utils.createStaticTopic({ isReading: true });
        classTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic.id,
            releaseDate: new Date('2000-01-01')
        });
        pupilTopic = await utils.createPupilTopic(pupil.id, {
            topicId: staticTopic.id,
            classTopicId: classTopic.id,
            releaseDate: new Date('2000-01-01'),
            periodIndex: currentPeriod.index
        });
    });

    afterAll(async () => {
        for (const id of feedbackIds) {
            await utils.deleteFeedbackEntry(id);
        }

        await utils.deletePupilTopic(pupilTopic.id);
        await utils.deleteClassTopic(classTopic.id);
        await utils.deleteStaticTopic(staticTopic.id);
        await utils.removePupilFromClass(pupil.id, schoolClass.id);
        await utils.removeParentFromPupil(pupil.id, parent.id);
        await utils.deletePupil(pupil.id);
        await utils.deleteClass(schoolClass.id);
        await utils.deleteSchool(school.id);
        await utils.deleteUser(parent.id);

        await app.close();
        await sql`vacuum`.execute(db);
        await db.destroy();
    });

    it.each(Object.values(ReadingMode))('stores %s when a parent adds a reading log', async (method) => {
        const feedbackId = await addReadingLog({ readingType: ReadingType.OWN_BOOK, readingMode: method });

        await expect(readingModeOf(feedbackId)).resolves.toBe(method);
    });

    it('keeps the reading mode when the entry is edited without supplying one', async () => {
        const feedbackId = await addReadingLog({ readingType: ReadingType.OWN_BOOK, readingMode: ReadingMode.READ_ALOUD });

        await editReadingLog(feedbackId, { bookName: 'A different book' });

        await expect(readingModeOf(feedbackId)).resolves.toBe(ReadingMode.READ_ALOUD);
    });

    it('replaces the reading mode when the entry is edited with a new one', async () => {
        const feedbackId = await addReadingLog({ readingType: ReadingType.OWN_BOOK, readingMode: ReadingMode.READ_ALOUD });

        await editReadingLog(feedbackId, { readingMode: ReadingMode.LISTENED_TOGETHER });

        await expect(readingModeOf(feedbackId)).resolves.toBe(ReadingMode.LISTENED_TOGETHER);
    });

    it('stores null, and not a placeholder, when no reading mode is supplied', async () => {
        const feedbackId = await addReadingLog({ readingType: ReadingType.OWN_BOOK });

        await expect(readingModeOf(feedbackId)).resolves.toBeNull();
    });

    // The form omits the book source for real-world reading, and group logging never sends one.
    it('falls back to SOMETHING_ELSE when no reading type is supplied', async () => {
        const feedbackId = await addReadingLog({ readingMode: ReadingMode.READ_IN_REAL_WORLD });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({
            readingType: ReadingType.SOMETHING_ELSE,
            readingMode: ReadingMode.READ_IN_REAL_WORLD
        });
    });

    it('drops the book answers when a real-world entry is created carrying them', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_IN_REAL_WORLD,
            isBookFinished: true,
            pageNumber: '17'
        });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({
            readingType: ReadingType.SOMETHING_ELSE,
            isBookFinished: null,
            pageNumber: null
        });
    });

    // Without the rule, an entry switched to real-world stayed recorded as a finished school book
    // and kept counting towards the school-book figures schools use to decide when to replace books.
    it('clears the book answers when an entry is edited to real-world reading', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: true,
            pageNumber: '42'
        });

        // Sends the stored answers rather than nulls, so the rule is the only thing that can clear
        // them. Nulls would clear on their own and the assertions would hold with the rule removed.
        await editReadingLog(feedbackId, { readingMode: ReadingMode.READ_IN_REAL_WORLD, isBookFinished: true, pageNumber: '42' });

        await expect(bookAnswersOf(feedbackId)).resolves.toEqual({
            readingType: ReadingType.SOMETHING_ELSE,
            readingMode: ReadingMode.READ_IN_REAL_WORLD,
            isBookFinished: null,
            pageNumber: null
        });
    });

    it('drops the book answers when a group entry is edited to real-world reading', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: true,
            pageNumber: '9'
        });

        await editReadingLogAsGroup(feedbackId, {
            readingMode: ReadingMode.READ_IN_REAL_WORLD,
            isBookFinished: true,
            pageNumber: '9'
        });

        await expect(bookAnswersOf(feedbackId)).resolves.toEqual({
            readingType: ReadingType.SOMETHING_ELSE,
            readingMode: ReadingMode.READ_IN_REAL_WORLD,
            isBookFinished: null,
            pageNumber: null
        });
    });

    // The real-world tests above cannot cover this: the rule clears those fields whatever arrives.
    // Only a non-real-world group edit shows that an explicit null means "cleared" on this path too.
    it('clears the page reached when a group entry is edited with the field emptied', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: false,
            pageNumber: '77'
        });

        await editReadingLogAsGroup(feedbackId, { readingMode: ReadingMode.READ_ALOUD, isBookFinished: false, pageNumber: null });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({ pageNumber: null, isBookFinished: false });
    });

    // The rule forces SOMETHING_ELSE on the way in, so without a reading type on the group input the
    // change would be one-way and a group entry could never be recorded as a school book again.
    it('restores the book source when a group entry is edited back from real-world reading', async () => {
        const feedbackId = await addReadingLog({ readingType: ReadingType.SCHOOL_BOOK, readingMode: ReadingMode.READ_IN_REAL_WORLD });

        await editReadingLogAsGroup(feedbackId, { readingMode: ReadingMode.READ_ALOUD, readingType: ReadingType.SCHOOL_BOOK });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD
        });
    });

    it('clears the book answers when an entry is edited to a book source that has no ending', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: true,
            pageNumber: '30'
        });

        await editReadingLog(feedbackId, { readingType: ReadingType.SOMETHING_ELSE, isBookFinished: null, pageNumber: null });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({
            readingType: ReadingType.SOMETHING_ELSE,
            isBookFinished: null,
            pageNumber: null
        });
    });

    it('clears the page reached when the parent empties the field', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: false,
            pageNumber: '42'
        });

        await editReadingLog(feedbackId, { isBookFinished: false, pageNumber: null });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({ pageNumber: null });
    });

    it('keeps the page reached when the field is not supplied at all', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: false,
            pageNumber: '42'
        });

        await editReadingLog(feedbackId, { bookName: 'A different book' });

        await expect(bookAnswersOf(feedbackId)).resolves.toMatchObject({ pageNumber: '42', isBookFinished: false });
    });

    // Deleting an entry replaces it with a record that keeps how it was classified and drops what was
    // read. The book source is kept, so the way of reading has to be kept too or the two disagree
    // about deleted entries.
    it('keeps the way of reading on the record a deleted entry leaves behind', async () => {
        const feedbackId = await addReadingLog({
            readingType: ReadingType.OWN_BOOK,
            readingMode: ReadingMode.LISTENED_TOGETHER
        });

        await feedbackService.deleteFeedback(feedbackId, 'Logged twice by mistake', parent.id);

        const deletedEntryRecord = await db
            .selectFrom('lwp_pupil_feedback')
            .where('originalFeedbackId', '=', feedbackId)
            .select(['id', 'readingType', 'readingMode'])
            .executeTakeFirstOrThrow();

        feedbackIds.push(deletedEntryRecord.id);

        expect(deletedEntryRecord).toMatchObject({
            readingType: ReadingType.OWN_BOOK,
            readingMode: ReadingMode.LISTENED_TOGETHER
        });
    });
});
