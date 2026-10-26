import type { Schema } from '@lwp/postgres-client';
import { type INestApplication, InternalServerErrorException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Kysely, type Selectable, sql } from 'kysely';
import { behaviour, UserType } from 'lwp-shared';
import { ActivityType, FeedbackType } from 'src/api/model';
import { createUtils, NON_EXISTENT_PUPIL_ID } from 'src/api/service/functional-tests/utils';
import { PupilService } from 'src/api/service/pupil.service';
import { BaseModule } from 'src/base.module';
import { createDb } from 'src/data-import/functional-tests/utils';

describe('PupilService#mergePupils', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let app: INestApplication;
    let pupilService: PupilService;

    let user: Selectable<Schema.LwpUser>;
    let school: Selectable<Schema.LwpSchool>;

    let sourcePupil: Selectable<Schema.LwpPupil>;
    let sourceParent1: Selectable<Schema.LwpUser>;
    let sourceParent2: Selectable<Schema.LwpUser>;
    let sourcePupilParent1Association: Selectable<Schema.LwpPupilParent>;
    let sourcePupilParent2Association: Selectable<Schema.LwpPupilParent>;
    let sourceRegistrationClass: Selectable<Schema.LwpSchoolClass>;
    let sourceAdditionalClass: Selectable<Schema.LwpSchoolClass>;

    let destinationPupil: Selectable<Schema.LwpPupil>;
    let destinationParent1: Selectable<Schema.LwpUser>;
    let destinationParent2: Selectable<Schema.LwpUser>;
    let destinationRegistrationClass: Selectable<Schema.LwpSchoolClass>;
    let destinationAdditionalClass: Selectable<Schema.LwpSchoolClass>;

    beforeAll(async () => {
        db = await createDb();
        utils = createUtils(db);
        app = await NestFactory.create(BaseModule);
        pupilService = app.get(PupilService);

        user = await utils.createUser({ type: UserType.ADMIN, firstname: 'Admin', lastname: 'User' });
        school = await utils.createSchool({ schoolName: 'Test school' });
    });

    afterAll(async () => {
        await utils.deleteSchool(school.id);
        await utils.deleteUser(user.id);

        await app.close();
        await sql`vacuum`.execute(db);
        await db.destroy();
    });

    beforeEach(async () => {
        sourcePupil = await utils.createPupil(school.id, {
            UPN: 'A000000000001',
            firstname: 'Source',
            lastname: 'Pupil',
            dateOfBirth: new Date('2000-01-01')
        });
        sourceParent1 = await utils.createParent({ firstname: 'Source', lastname: 'Parent 1' });
        sourceParent2 = await utils.createParent({ firstname: 'Source', lastname: 'Parent 2' });
        sourcePupilParent1Association = await utils.addParentToPupil(sourcePupil.id, sourceParent1.id);
        sourcePupilParent2Association = await utils.addParentToPupil(sourcePupil.id, sourceParent2.id);
        sourceRegistrationClass = await utils.createClass(school.id, {
            name: 'Source class',
            isRegistrationClass: true
        });
        sourceAdditionalClass = await utils.createClass(school.id, {
            name: 'Source additional class',
            isRegistrationClass: false
        });
        await utils.addPupilToClass(sourcePupil.id, sourceRegistrationClass.id);
        await utils.addPupilToClass(sourcePupil.id, sourceAdditionalClass.id);

        destinationPupil = await utils.createPupil(school.id, {
            UPN: 'A000000000002',
            firstname: 'Destination',
            lastname: 'Pupil',
            dateOfBirth: new Date('2000-01-02')
        });
        destinationParent1 = await utils.createParent({ firstname: 'Destination', lastname: 'Parent 1' });
        destinationParent2 = await utils.createParent({ firstname: 'Destination', lastname: 'Parent 2' });
        await utils.addParentToPupil(destinationPupil.id, destinationParent1.id);
        await utils.addParentToPupil(destinationPupil.id, destinationParent2.id);
        destinationRegistrationClass = await utils.createClass(school.id, {
            name: 'Destination class',
            isRegistrationClass: true
        });
        destinationAdditionalClass = await utils.createClass(school.id, {
            name: 'Destination additional class',
            isRegistrationClass: false
        });
        await utils.addPupilToClass(destinationPupil.id, destinationRegistrationClass.id);
        await utils.addPupilToClass(destinationPupil.id, destinationAdditionalClass.id);
    });

    afterEach(async () => {
        await utils.removePupilFromClass(destinationPupil.id, destinationAdditionalClass.id);
        await utils.removePupilFromClass(destinationPupil.id, destinationRegistrationClass.id);
        await utils.deleteClass(destinationAdditionalClass.id);
        await utils.deleteClass(destinationRegistrationClass.id);
        await utils.removeParentFromPupil(destinationPupil.id, destinationParent2.id);
        await utils.removeParentFromPupil(destinationPupil.id, destinationParent1.id);
        await utils.deleteUser(destinationParent2.id);
        await utils.deleteUser(destinationParent1.id);
        await utils.deletePupil(destinationPupil.id);

        await utils.removePupilFromClass(sourcePupil.id, sourceAdditionalClass.id);
        await utils.removePupilFromClass(sourcePupil.id, sourceRegistrationClass.id);
        await utils.deleteClass(sourceAdditionalClass.id);
        await utils.deleteClass(sourceRegistrationClass.id);
        await utils.removeParentFromPupil(sourcePupil.id, sourceParent2.id);
        await utils.removeParentFromPupil(sourcePupil.id, sourceParent1.id);
        await utils.deleteUser(sourceParent2.id);
        await utils.deleteUser(sourceParent1.id);
        await utils.deletePupil(sourcePupil.id);
    });

    describe(`Given the source pupil doesn't exist`, () => {
        describe('When I call mergePupils', () => {
            let err: Error | undefined;

            beforeEach(async () => {
                try {
                    await pupilService.mergePupils(NON_EXISTENT_PUPIL_ID, destinationPupil.id, user.id);
                } catch (e) {
                    err = e;
                }
            });

            test('Then it throws an error', () => {
                expect(err).toBeInstanceOf(InternalServerErrorException);
                expect(err).toMatchSnapshot();
            });
        });
    });

    describe(`Given the destination pupil doesn't exist`, () => {
        describe('When I call mergePupils', () => {
            let err: Error | undefined;

            beforeEach(async () => {
                try {
                    await pupilService.mergePupils(sourcePupil.id, NON_EXISTENT_PUPIL_ID, user.id);
                } catch (e) {
                    err = e;
                }
            });

            test('Then it throws an error', () => {
                expect(err).toBeInstanceOf(InternalServerErrorException);
                expect(err).toMatchSnapshot();
            });
        });
    });

    describe('Given the source and destination pupils are in different schools', () => {
        let otherSchool: Selectable<Schema.LwpSchool>;
        let otherSchoolPupil: Selectable<Schema.LwpPupil>;

        beforeEach(async () => {
            otherSchool = await utils.createSchool({ schoolName: 'Other school' });
            otherSchoolPupil = await utils.createPupil(otherSchool.id, {
                firstname: 'Other',
                lastname: 'Pupil'
            });
        });

        afterEach(async () => {
            await utils.deletePupil(otherSchoolPupil.id);
            await utils.deleteSchool(otherSchool.id);
        });

        describe('When I call mergePupils', () => {
            let err: Error | undefined;

            beforeEach(async () => {
                try {
                    await pupilService.mergePupils(sourcePupil.id, otherSchoolPupil.id, user.id);
                } catch (e) {
                    err = e;
                }
            });

            test('Then it throws an error', () => {
                expect(err).toBeInstanceOf(InternalServerErrorException);
                expect(err).toMatchSnapshot();
            });
        });
    });

    describe('Given the source and destination pupils are the same', () => {
        describe('When I call mergePupils', () => {
            let err: Error | undefined;

            beforeEach(async () => {
                try {
                    await pupilService.mergePupils(sourcePupil.id, sourcePupil.id, user.id);
                } catch (e) {
                    err = e;
                }
            });

            test('Then it throws an error', () => {
                expect(err).toBeInstanceOf(InternalServerErrorException);
                expect(err).toMatchSnapshot();
            });
        });
    });

    describe('Given the source and destination pupils are distinct and in the same school', () => {
        let staticActivityTopic: Selectable<Schema.StaticLwpTopic>;
        let staticActivity1: Selectable<Schema.StaticLwpActivity>;
        let staticActivity2: Selectable<Schema.StaticLwpActivity>;

        let staticReadingTopic: Selectable<Schema.StaticLwpTopic>;
        let staticReadingActivity: Selectable<Schema.StaticLwpActivity>;

        beforeAll(async () => {
            staticActivityTopic = await utils.createStaticTopic({ isReading: false });
            staticActivity1 = await utils.createStaticActivity({
                name: 'Test activity 1',
                activityType: ActivityType.LEGACY,
                topicId: staticActivityTopic.id
            });
            staticActivity2 = await utils.createStaticActivity({
                name: 'Test activity 2',
                activityType: ActivityType.LEGACY,
                topicId: staticActivityTopic.id
            });

            staticReadingTopic = await utils.getStaticReadingTopic();
            staticReadingActivity = await utils.createStaticActivity({
                name: 'Test reading activity',
                activityType: ActivityType.LEGACY,
                topicId: staticReadingTopic.id
            });
        });

        afterAll(async () => {
            await utils.deleteStaticActivity(staticReadingActivity.id);
            await utils.deleteStaticActivity(staticActivity2.id);
            await utils.deleteStaticActivity(staticActivity1.id);
            await utils.deleteStaticTopic(staticActivityTopic.id);
        });

        describe('When I call mergePupils', () => {
            beforeEach(async () => {
                await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
            });

            test(`Then the source pupil's parents are detached`, async () => {
                const pupilParents = await utils.getPupilParents(sourcePupil.id);

                expect(pupilParents).toEqual([]);
            });

            test(`Then the destination pupil's parents remain unchanged`, async () => {
                const pupilParents = await utils.getPupilParents(destinationPupil.id);

                expect(pupilParents).toEqual([destinationParent1, destinationParent2]);
            });

            if (behaviour.mergePupils.removeSourcePupilFromClasses) {
                test('Then the source pupil is removed from all of their classes', async () => {
                    const classes = await utils.getPupilClassIds(sourcePupil.id);

                    expect(classes).toEqual([]);
                });
            } else {
                test('Then the source pupil is not removed from any of their classes', async () => {
                    const classIds = await utils.getPupilClassIds(sourcePupil.id);

                    expect(classIds).toEqual([sourceRegistrationClass.id]);
                });
            }

            test('Then the destination pupil remains in all of their classes', async () => {
                const classIds = await utils.getPupilClassIds(destinationPupil.id);

                expect(classIds).toEqual([destinationRegistrationClass.id, destinationAdditionalClass.id]);
            });

            if (behaviour.mergePupils.removeSourcePupilFromSchool) {
                test('Then the source pupil is deleted from their school', async () => {
                    await expect(async () => {
                        await utils.getPupil(sourcePupil.id);
                    }).rejects.toThrowErrorMatchingSnapshot();
                });
            } else {
                test('Then the source pupil is not removed from their school', async () => {
                    const pupil = await utils.getPupil(sourcePupil.id);

                    expect(pupil.schoolId).toBe(school.id);
                });
            }

            test('Then the destination pupil remains in their school', async () => {
                const pupil = await utils.getPupil(destinationPupil.id);

                expect(pupil.schoolId).toBe(school.id);
            });
        });

        describe('Given the source pupil has been assigned activities that the destination pupil has not', () => {
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let sourcePupilActivity: Selectable<Schema.LwpPupilActivity>;
            let destinationClassTopic: Selectable<Schema.LwpClassTopic>;
            let destinationPupilTopic: Selectable<Schema.LwpPupilTopic>;
            let destinationPupilActivity: Selectable<Schema.LwpPupilActivity>;

            beforeEach(async () => {
                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    topicId: staticActivityTopic.id
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: sourceClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                sourcePupilActivity = await utils.createPupilActivity(sourcePupil.id, {
                    topicId: sourcePupilTopic.id,
                    activityId: staticActivity1.id
                });

                destinationClassTopic = await utils.createClassTopic(destinationRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    topicId: staticActivityTopic.id
                });

                destinationPupilTopic = await utils.createPupilTopic(destinationPupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: destinationClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                destinationPupilActivity = await utils.createPupilActivity(destinationPupil.id, {
                    topicId: destinationPupilTopic.id,
                    activityId: staticActivity2.id
                });
            });

            afterEach(async () => {
                await utils.deletePupilActivity(destinationPupilActivity.id);
                await utils.deletePupilTopic(destinationPupilTopic.id);
                await utils.deleteClassTopic(destinationClassTopic.id);
                await utils.deletePupilActivity(sourcePupilActivity.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then those activities are reassigned to the destination pupil', async () => {
                    const sourcePupilActivityIds = await utils.getPupilActivityIds(sourcePupil.id);

                    expect(sourcePupilActivityIds).toEqual([]);

                    const destinationPupilActivityIds = await utils.getPupilActivityIds(destinationPupil.id);

                    expect(destinationPupilActivityIds).toContain(sourcePupilActivity.id);
                });

                test('Then the corresponding pupil topics are reassigned to the destination pupil', async () => {
                    const reassignedPupilTopic = await db
                        .selectFrom('lwp_pupil_topic')
                        .where('id', '=', sourcePupilTopic.id)
                        .selectAll()
                        .executeTakeFirstOrThrow();

                    expect(reassignedPupilTopic.pupilId).toBe(destinationPupil.id);
                });

                test('Then the classId and classTopicId are cleared from the reassigned pupil topics', async () => {
                    const reassignedPupilTopic = await db
                        .selectFrom('lwp_pupil_topic')
                        .where('id', '=', sourcePupilTopic.id)
                        .selectAll()
                        .executeTakeFirstOrThrow();

                    expect(reassignedPupilTopic.classTopicId).toBeNull();
                });

                test(`Then the destination pupil's existing activities remain unchanged`, async () => {
                    const destinationPupilActivityIds = await utils.getPupilActivityIds(destinationPupil.id);

                    expect(destinationPupilActivityIds).toContain(destinationPupilActivity.id);
                });
            });
        });

        describe('Given the source pupil has been assigned the same activities as the destination pupil', () => {
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let sourcePupilActivity: Selectable<Schema.LwpPupilActivity>;
            let destinationClassTopic: Selectable<Schema.LwpClassTopic>;
            let destinationPupilTopic: Selectable<Schema.LwpPupilTopic>;
            let destinationPupilActivity: Selectable<Schema.LwpPupilActivity>;

            beforeEach(async () => {
                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    readingTarget: null,
                    topicId: staticActivityTopic.id
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: sourceClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                sourcePupilActivity = await utils.createPupilActivity(sourcePupil.id, {
                    topicId: sourcePupilTopic.id,
                    activityId: staticActivity1.id
                });

                destinationClassTopic = await utils.createClassTopic(destinationRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    readingTarget: null,
                    topicId: staticActivityTopic.id
                });

                destinationPupilTopic = await utils.createPupilTopic(destinationPupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: destinationClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                destinationPupilActivity = await utils.createPupilActivity(destinationPupil.id, {
                    topicId: destinationPupilTopic.id,
                    activityId: staticActivity1.id
                });
            });

            afterEach(async () => {
                await utils.deletePupilActivity(destinationPupilActivity.id);
                await utils.deletePupilTopic(destinationPupilTopic.id);
                await utils.deleteClassTopic(destinationClassTopic.id);
                await utils.deletePupilActivity(sourcePupilActivity.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then those activities are not reassigned to the destination pupil', async () => {
                    const destinationPupilActivityIds = await utils.getPupilActivityIds(destinationPupil.id);

                    expect(destinationPupilActivityIds).not.toContain(sourcePupilActivity.id);
                });

                test(`Then the destination pupil's existing activities remain unchanged`, async () => {
                    const destinationPupilActivityIds = await utils.getPupilActivityIds(destinationPupil.id);

                    expect(destinationPupilActivityIds).toContain(destinationPupilActivity.id);
                });
            });
        });

        describe('Given the source pupil has been assigned reading for weeks that the destination pupil has not', () => {
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let destinationClassTopic: Selectable<Schema.LwpClassTopic>;
            let destinationPupilTopic: Selectable<Schema.LwpPupilTopic>;

            beforeEach(async () => {
                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    topicId: staticReadingTopic.id,
                    readingTarget: 1,
                    releaseDate: new Date('2000-01-01')
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticReadingTopic.id,
                    classTopicId: sourceClassTopic.id,
                    readingTarget: 1,
                    releaseDate: new Date('2000-01-01')
                });

                destinationClassTopic = await utils.createClassTopic(destinationRegistrationClass.id, {
                    topicId: staticReadingTopic.id,
                    readingTarget: 1,
                    releaseDate: new Date('2000-01-08')
                });

                destinationPupilTopic = await utils.createPupilTopic(destinationPupil.id, {
                    topicId: staticReadingTopic.id,
                    classTopicId: destinationClassTopic.id,
                    readingTarget: 1,
                    releaseDate: new Date('2000-01-08')
                });
            });

            afterEach(async () => {
                await utils.deletePupilTopic(destinationPupilTopic.id);
                await utils.deleteClassTopic(destinationClassTopic.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then the corresponding pupil topics are reassigned to the destination pupil', async () => {
                    const reassignedPupilTopic = await db
                        .selectFrom('lwp_pupil_topic')
                        .where('id', '=', sourcePupilTopic.id)
                        .selectAll()
                        .executeTakeFirstOrThrow();

                    expect(reassignedPupilTopic.pupilId).toBe(destinationPupil.id);
                });

                test('Then the classId and classTopicId are cleared from the reassigned pupil topics', async () => {
                    const reassignedPupilTopic = await db
                        .selectFrom('lwp_pupil_topic')
                        .where('id', '=', sourcePupilTopic.id)
                        .selectAll()
                        .executeTakeFirstOrThrow();

                    expect(reassignedPupilTopic.classTopicId).toBeNull();
                });
            });
        });

        describe('Given the source pupil has been assigned reading for the same weeks as the destination pupil', () => {
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let sourcePupilActivity: Selectable<Schema.LwpPupilActivity>;
            let destinationClassTopic: Selectable<Schema.LwpClassTopic>;
            let destinationPupilTopic: Selectable<Schema.LwpPupilTopic>;
            let destinationPupilActivity: Selectable<Schema.LwpPupilActivity>;

            beforeEach(async () => {
                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    readingTarget: 1,
                    topicId: staticReadingTopic.id
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticReadingTopic.id,
                    classTopicId: sourceClassTopic.id,
                    readingTarget: 1,
                    releaseDate: new Date('2000-01-01')
                });

                sourcePupilActivity = await utils.createPupilActivity(sourcePupil.id, {
                    topicId: sourcePupilTopic.id,
                    activityId: staticReadingActivity.id
                });

                destinationClassTopic = await utils.createClassTopic(destinationRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    readingTarget: 1,
                    topicId: staticReadingTopic.id
                });

                destinationPupilTopic = await utils.createPupilTopic(destinationPupil.id, {
                    topicId: staticReadingTopic.id,
                    classTopicId: destinationClassTopic.id,
                    readingTarget: 1,
                    releaseDate: new Date('2000-01-01')
                });

                destinationPupilActivity = await utils.createPupilActivity(destinationPupil.id, {
                    topicId: destinationPupilTopic.id,
                    activityId: staticReadingActivity.id
                });
            });

            afterEach(async () => {
                await utils.deletePupilActivity(destinationPupilActivity.id);
                await utils.deletePupilTopic(destinationPupilTopic.id);
                await utils.deleteClassTopic(destinationClassTopic.id);
                await utils.deletePupilActivity(sourcePupilActivity.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then those activities are not reassigned to the destination pupil', async () => {
                    const destinationPupilActivityIds = await utils.getPupilActivityIds(destinationPupil.id);

                    expect(destinationPupilActivityIds).not.toContain(sourcePupilActivity.id);
                });

                test(`Then the destination pupil's existing activities remain unchanged`, async () => {
                    const destinationPupilActivityIds = await utils.getPupilActivityIds(destinationPupil.id);

                    expect(destinationPupilActivityIds).toContain(destinationPupilActivity.id);
                });
            });
        });

        describe('Given the source pupil is linked to a feedback entry', () => {
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let sourcePupilActivity: Selectable<Schema.LwpPupilActivity>;
            let destinationClassTopic: Selectable<Schema.LwpClassTopic>;
            let destinationPupilTopic: Selectable<Schema.LwpPupilTopic>;
            let destinationPupilActivity: Selectable<Schema.LwpPupilActivity>;
            let feedbackEntry: Selectable<Schema.LwpPupilFeedback>;

            beforeEach(async () => {
                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    topicId: staticActivityTopic.id
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: sourceClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                sourcePupilActivity = await utils.createPupilActivity(sourcePupil.id, {
                    topicId: sourcePupilTopic.id,
                    activityId: staticActivity1.id
                });

                destinationClassTopic = await utils.createClassTopic(destinationRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    topicId: staticActivityTopic.id
                });

                destinationPupilTopic = await utils.createPupilTopic(destinationPupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: destinationClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                destinationPupilActivity = await utils.createPupilActivity(destinationPupil.id, {
                    topicId: destinationPupilTopic.id,
                    activityId: staticActivity1.id
                });

                feedbackEntry = await utils.createFeedbackEntry({
                    logCreatedById: sourceParent1.id,
                    userType: sourceParent1.type,
                    type: FeedbackType.ACTIVITY
                });

                await utils.linkPupilToFeedbackEntry(sourcePupil.id, feedbackEntry.id);
            });

            afterEach(async () => {
                await utils.deleteFeedbackEntry(feedbackEntry.id);
                await utils.deletePupilActivity(destinationPupilActivity.id);
                await utils.deletePupilTopic(destinationPupilTopic.id);
                await utils.deleteClassTopic(destinationClassTopic.id);
                await utils.deletePupilActivity(sourcePupilActivity.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then the feedback entry is reassigned to the destination pupil', async () => {
                    const destinationFeedbackEntries = await utils.getPupilFeedbackEntries(destinationPupil.id);

                    expect(destinationFeedbackEntries).toContainEqual(feedbackEntry);
                });
            });
        });

        describe('Given the source pupil is linked to a scrapbook feedback entry', () => {
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let sourcePupilActivity: Selectable<Schema.LwpPupilActivity>;
            let feedbackEntry: Selectable<Schema.LwpPupilFeedback>;

            beforeEach(async () => {
                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    topicId: staticActivityTopic.id
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticActivityTopic.id,
                    classTopicId: sourceClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                sourcePupilActivity = await utils.createPupilActivity(sourcePupil.id, {
                    topicId: sourcePupilTopic.id,
                    activityId: staticActivity1.id
                });

                feedbackEntry = await utils.createFeedbackEntry({
                    logCreatedById: sourceParent1.id,
                    userType: sourceParent1.type,
                    type: FeedbackType.SCRAPBOOK
                });

                await utils.linkPupilToFeedbackEntry(sourcePupil.id, feedbackEntry.id);
            });

            afterEach(async () => {
                await utils.deleteFeedbackEntry(feedbackEntry.id);
                await utils.deletePupilActivity(sourcePupilActivity.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then the scrapbook feedback entry is reassigned to the destination pupil', async () => {
                    const destinationFeedbackEntries = await utils.getPupilFeedbackEntries(destinationPupil.id);

                    expect(destinationFeedbackEntries).toContainEqual(feedbackEntry);
                });
            });
        });

        describe('Given the source pupil has a scrapbook topic that the destination pupil has not', () => {
            let staticScrapbookTopic: Selectable<Schema.StaticLwpTopic>;
            let sourceClassTopic: Selectable<Schema.LwpClassTopic>;
            let sourcePupilTopic: Selectable<Schema.LwpPupilTopic>;
            let scrapbookFeedbackEntry: Selectable<Schema.LwpPupilFeedback>;

            beforeEach(async () => {
                staticScrapbookTopic = await utils.createStaticTopic({
                    isReading: false,
                    scrapbookPrompt: 'Draw something about this topic'
                });

                sourceClassTopic = await utils.createClassTopic(sourceRegistrationClass.id, {
                    releaseDate: new Date('2000-01-01'),
                    topicId: staticScrapbookTopic.id,
                    scrapbookPrompt: 'Draw something about this topic'
                });

                sourcePupilTopic = await utils.createPupilTopic(sourcePupil.id, {
                    topicId: staticScrapbookTopic.id,
                    classTopicId: sourceClassTopic.id,
                    releaseDate: new Date('2000-01-01')
                });

                scrapbookFeedbackEntry = await utils.createFeedbackEntry({
                    logCreatedById: sourceParent1.id,
                    userType: sourceParent1.type,
                    type: FeedbackType.SCRAPBOOK
                });

                await utils.linkPupilToFeedbackEntry(sourcePupil.id, scrapbookFeedbackEntry.id);
            });

            afterEach(async () => {
                await utils.deleteFeedbackEntry(scrapbookFeedbackEntry.id);
                await utils.deletePupilTopic(sourcePupilTopic.id);
                await utils.deleteClassTopic(sourceClassTopic.id);
                await utils.deleteStaticTopic(staticScrapbookTopic.id);
            });

            describe('When I call mergePupils', () => {
                beforeEach(async () => {
                    await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
                });

                test('Then the scrapbook pupil topic is reassigned to the destination pupil', async () => {
                    const reassignedPupilTopic = await db
                        .selectFrom('lwp_pupil_topic')
                        .where('id', '=', sourcePupilTopic.id)
                        .selectAll()
                        .executeTakeFirstOrThrow();

                    expect(reassignedPupilTopic.pupilId).toBe(destinationPupil.id);
                });

                test('Then the classTopicId is cleared from the reassigned scrapbook pupil topic', async () => {
                    const reassignedPupilTopic = await db
                        .selectFrom('lwp_pupil_topic')
                        .where('id', '=', sourcePupilTopic.id)
                        .selectAll()
                        .executeTakeFirstOrThrow();

                    expect(reassignedPupilTopic.classTopicId).toBeNull();
                });

                test('Then the scrapbook feedback entry is reassigned to the destination pupil', async () => {
                    const destinationFeedbackEntries = await utils.getPupilFeedbackEntries(destinationPupil.id);

                    expect(destinationFeedbackEntries).toContainEqual(scrapbookFeedbackEntry);
                });
            });
        });

        describe('When I call mergePupils', () => {
            beforeEach(async () => {
                await pupilService.mergePupils(sourcePupil.id, destinationPupil.id, user.id);
            });

            test('Then a merge pupil operation log entry is created', async () => {
                const logEntry = await db
                    .selectFrom('log_pupil_merge_operation')
                    .where('sourcePupilId', '=', sourcePupil.id)
                    .selectAll()
                    .executeTakeFirstOrThrow();

                expect(logEntry).toMatchObject({
                    userId: user.id,
                    schoolId: school.id,
                    sourcePupilId: sourcePupil.id,
                    destinationPupilId: destinationPupil.id,
                    detachedParentIds: [sourcePupilParent1Association.id, sourcePupilParent2Association.id]
                });
            });
        });
    });
});
