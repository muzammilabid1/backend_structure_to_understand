import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { ReadingBookOptions, ReadingMode, UserStatus, UserType } from 'lwp-shared';

import { generateClassName, generateFirstName, generateLastName, generateSchoolName, generateUPN, generateUserEmail } from './constants';
import { createUtils } from './dbUtils';
import { formatDate } from './utils';

type Utils = ReturnType<typeof createUtils>;

export interface SeededReadingEntry {
    bookName: string;
    readingMode?: ReadingMode | null;
    readingType?: ReadingBookOptions;
    isBookFinished?: boolean | null;
    /** Set to attribute the entry to the parent, which is what puts "with you" in the history tail. */
    loggedByParent?: boolean;
    /**
     * Defaults to today, which is what the history feed needs. Pass null for an undated entry: the
     * day slider opens the "Reading records found" modal over the form when the chosen day already
     * has records, which blocks any test that goes on to fill the form in.
     */
    bookReadAt?: string | null;
}

export interface ReadingLogFixture {
    parentEmail: string;
    parentId: string;
    pupilId: string;
    seedEntry: (entry: SeededReadingEntry) => Promise<void>;
}

/**
 * A parent signed in to a child's reading log, with reading released for today. Every reading-mode
 * spec needs the same school, class, leader, pupil, parent and released reading topic, and seeding
 * it per test is what keeps them independent of each other's saved entries.
 */
export const seedReadingLogParent = async (db: Kysely<Schema.DB>, utils: Utils): Promise<ReadingLogFixture> => {
    const today = new Date();
    const todayDate = formatDate();

    const parentFirstName = generateFirstName();
    const parentLastName = generateLastName();
    const parentEmail = generateUserEmail(parentFirstName, parentLastName);
    const leaderFirstName = generateFirstName();

    // Reuse the seed user's password hash (id=1, the `password` constant) so login works whatever
    // the running database was seeded with.
    const seedUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();

    const school = await utils.createSchool({
        schoolName: `${generateSchoolName()} School`,
        curentPeriodIndex: currentPeriod.index,
        numOfFullProgrammeClassesAllowed: 10,
        numOfTotalClassesAllowed: 30,
        enableAddClasses: true,
        logCreatedById: seedUser.id,
        logUpdatedById: seedUser.id
    });
    const leader = await utils.createUser({
        firstname: leaderFirstName,
        lastname: generateLastName(),
        email: generateUserEmail(leaderFirstName, generateLastName()),
        type: UserType.TEACHER,
        userStatus: UserStatus.ACTIVE,
        isSchoolLeader: true,
        schoolId: school.id,
        password: seedUser.password,
        nameForChildren: `Mr ${leaderFirstName}`
    });
    const schoolClass = await utils.createClass(school.id, {
        name: generateClassName(),
        isRegistrationClass: true,
        isFullProgramme: true,
        mainTeacherId: leader.id,
        yearGroup: 1,
        periodIndex: currentPeriod.index,
        IsReadingLogsEnabled: true,
        readingLaunchDate: todayDate,
        readingStartDay: today.getDay(),
        readingTarget: 1,
        logCreatedById: seedUser.id,
        logUpdatedById: seedUser.id
    });
    const pupil = await utils.createPupil(school.id, {
        firstname: generateFirstName(),
        lastname: generateLastName(),
        dateOfBirth: new Date(),
        startedSchool: '2024',
        isPremium: true,
        gender: 'MALE',
        UPN: generateUPN(),
        logCreatedById: seedUser.id,
        logUpdatedById: seedUser.id
    });
    const parent = await utils.createUser({
        firstname: parentFirstName,
        lastname: parentLastName,
        email: parentEmail,
        type: UserType.PARENT,
        userStatus: UserStatus.ACTIVE,
        password: seedUser.password
    });

    await utils.addParentToPupil(pupil.id, parent.id, false);
    await utils.addPupilToClass(pupil.id, schoolClass.id);

    const staticReadingTopic = await db
        .selectFrom('static_lwp_topic')
        .where('isReading', '=', true)
        .select(['id'])
        .executeTakeFirstOrThrow();
    const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
        topicId: staticReadingTopic.id,
        releaseDate: todayDate,
        released: true,
        readingTarget: 1
    });

    await utils.createPupilTopic({
        releaseDate: todayDate,
        pupilId: pupil.id,
        classTopicId: readingClassTopic.id,
        topicId: staticReadingTopic.id,
        watchedVideo: false,
        periodIndex: currentPeriod.index,
        silverStars: 0,
        earnedGoldStar: false,
        readingTarget: 1
    });

    const seedEntry = async ({
        bookName,
        readingMode = null,
        readingType = ReadingBookOptions.SOMETHING_ELSE,
        isBookFinished = null,
        loggedByParent = false,
        bookReadAt = todayDate
    }: SeededReadingEntry): Promise<void> => {
        const feedback = await db
            .insertInto('lwp_pupil_feedback')
            .values({
                type: 'READING',
                bookName,
                readingType,
                readingMode,
                isBookFinished,
                userType: UserType.PARENT,
                userId: loggedByParent ? parent.id : null,
                periodIndex: currentPeriod.index,
                bookReadAt,
                logOnReadingAsGroupTab: false,
                logCreatedById: seedUser.id
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        await db
            .insertInto('lwp_pupil_feedback_history')
            .values({ lwpPupilId: pupil.id, lwpPupilFeedbackId: feedback.id })
            .executeTakeFirstOrThrow();
    };

    return { parentEmail, parentId: parent.id, pupilId: pupil.id, seedEntry };
};
