import 'tsconfig-paths/register';

import type { Schema } from '@lwp/postgres-client';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Kysely } from 'kysely';
import moment from 'moment';
import { DataImportModule } from 'src/data-import/data-import.module';
import {
    cleanUpSchool,
    createTestImportedPupils,
    createTestImportedSchool,
    createTestParent,
    createTestPupils,
    createTestSchool,
    setImportedSchoolPeriod,
    setSchoolPeriod
} from 'src/data-import/functional-tests/seeds';
import { createDb } from 'src/data-import/functional-tests/utils';
import { EntityLinkService } from 'src/data-import/service/entity-link.service';
import { PupilLinkService } from 'src/data-import/service/pupil-link.service';
import { Connection } from 'typeorm';

const PERIOD = 2026;

/**
 * LEA-6643: the pupil linking comparison preview tells a leader whether the candidate platform
 * pupil is already in use (parents linked, activity recorded) and whether it was linked to this
 * imported student before. These pin what the backend hands the drawer and the candidate list.
 */
describe('Pupil linking comparison preview', () => {
    let db: Kysely<Schema.DB>;
    let app: INestApplication;
    let connection: Connection;
    let entityLinks: EntityLinkService;
    let pupilLinks: PupilLinkService;

    let schoolId: string;
    let importedSchoolId: string;

    beforeAll(async () => {
        db = createDb();
        app = await NestFactory.create(DataImportModule, { logger: false });
        connection = app.get(Connection);
        entityLinks = app.get(EntityLinkService);
        pupilLinks = app.get(PupilLinkService);
    }, 60000);

    afterAll(async () => {
        await app?.close();
        await connection?.close().catch(() => undefined);
        await db?.destroy();
    });

    beforeEach(async () => {
        const school = await createTestSchool(db);
        const importedSchool = await createTestImportedSchool(db, String(school.id));

        schoolId = String(school.id);
        importedSchoolId = String(importedSchool.id);
        await setSchoolPeriod(db, schoolId, PERIOD);
        await setImportedSchoolPeriod(db, importedSchoolId, PERIOD);
    });

    afterEach(async () => {
        // Feedback rows are outside cleanUpSchool's remit, so remove this school's first.
        const pupilIds = (await db.selectFrom('lwp_pupil').select('id').where('schoolId', '=', schoolId).execute()).map((row) =>
            String(row.id)
        );

        for (const pupilId of pupilIds) {
            const feedbackIds = await feedbackIdsOf(pupilId);

            if (feedbackIds.length > 0) {
                await db.deleteFrom('lwp_pupil_feedback_history').where('lwpPupilId', '=', pupilId).execute();
                await db.deleteFrom('lwp_pupil_feedback').where('id', 'in', feedbackIds).execute();
            }
        }

        await cleanUpSchool(db, schoolId, importedSchoolId);
    });

    /** One feedback entry per row, linked to the pupil through the history table as the app does. */
    const leaveFeedback = async (
        pupilId: string,
        authorId: string,
        entries: Array<{
            type?: 'ACTIVITY' | 'READING' | 'SCRAPBOOK';
            userType?: string;
            bookReadAt?: string;
            logCreatedAt: Date | string;
            deleted?: boolean;
        }>
    ): Promise<void> => {
        let previousId: string | null = null;

        for (const entry of entries) {
            const feedback = await db
                .insertInto('lwp_pupil_feedback')
                .values({
                    type: entry.type ?? 'ACTIVITY',
                    userType: entry.userType ?? 'PARENT',
                    // an original entry needs an author (CHK_lpf_logcreatedby_or_user_required_for_original)
                    userId: authorId,
                    // a reading log must name its book (CHK_lpf_bookname_required_for_original_reading)
                    bookName: entry.type === 'READING' ? 'The Gruffalo' : null,
                    readingType: entry.type === 'READING' ? 'HOME' : null,
                    bookReadAt: entry.bookReadAt ?? null,
                    logCreatedAt: entry.logCreatedAt,
                    // a tombstone left by a delete or an edit points at the row it replaced
                    originalFeedbackId: entry.deleted ? previousId : null
                })
                .returning('id')
                .executeTakeFirstOrThrow();

            previousId = String(feedback.id);
            await db.insertInto('lwp_pupil_feedback_history').values({ lwpPupilId: pupilId, lwpPupilFeedbackId: feedback.id }).execute();
        }
    };

    const feedbackIdsOf = async (pupilId: string): Promise<string[]> => {
        const rows = await db
            .selectFrom('lwp_pupil_feedback_history')
            .select('lwpPupilFeedbackId')
            .where('lwpPupilId', '=', pupilId)
            .execute();

        return rows.map((row) => String(row.lwpPupilFeedbackId));
    };

    /** A MIS pupil and a platform pupil that agree on UPN and name but not date of birth, so the
     *  review has to ask the leader: that is the row the comparison preview exists for. */
    const seedPendingPair = async (
        platform: { importedStudentId?: string } = {}
    ): Promise<{ pupilId: string; importedPupilId: string }> => {
        const [pupil] = await createTestPupils(db, schoolId, [
            { UPN: 'X123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-29', ...platform }
        ]);
        const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
            { UPN: 'X123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
        ]);

        return { pupilId: String(pupil.id), importedPupilId: String(importedPupil.id) };
    };

    describe('getPupilDataForComparison', () => {
        it('reports each linked parent with their status, and the feedback count, last activity and pupil status', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            const activeParent = await createTestParent(db, pupilId, { email: 'active.parent@example.com', status: 'ACTIVE' });

            await createTestParent(db, pupilId, { email: 'invited.parent@example.com', status: 'INVITED' });
            // still listed, so the leader can see it; the drawer leaves it out of the linked count
            await createTestParent(db, pupilId, { email: 'rejected.parent@example.com', status: 'REJECTED' });

            // yesterday, so it falls inside the current term for the pupil status
            const newest = moment().subtract(1, 'day').format('YYYY-MM-DD');

            await leaveFeedback(pupilId, String(activeParent.id), [
                { type: 'ACTIVITY', logCreatedAt: new Date('2026-01-10T09:00:00.000Z') },
                // a reading log is feedback too; its book date, not its creation time, places it
                { type: 'READING', bookReadAt: newest, logCreatedAt: new Date('2026-01-01T09:00:00.000Z') },
                { type: 'SCRAPBOOK', logCreatedAt: new Date('2025-12-01T09:00:00.000Z') },
                // deleted afterwards: the tombstone is not feedback
                { type: 'ACTIVITY', logCreatedAt: new Date('2026-05-01T09:00:00.000Z'), deleted: true }
            ]);

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil).toMatchObject({
                id: pupilId,
                feedbackCount: 3,
                lastActivity: newest,
                // an active parent plus parent feedback inside the current term: what the pupil list calls "Active this term"
                pupilStatus: 'ACTIVE',
                isPreviouslyLinked: false
            });
            expect(platformPupil.parents).toHaveLength(3);
            expect(platformPupil.parents.map((parent) => [parent.email, parent.status]).sort()).toEqual([
                ['active.parent@example.com', 'ACTIVE'],
                ['invited.parent@example.com', 'INVITED'],
                ['rejected.parent@example.com', 'REJECTED']
            ]);
        });

        it('counts only feedback the family left, as the pupil status does', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            const parent = await createTestParent(db, pupilId, { status: 'ACTIVE' });

            await leaveFeedback(pupilId, String(parent.id), [
                { userType: 'PARENT', logCreatedAt: '2026-01-10 09:00:00' },
                { userType: 'TOPICACCESS', logCreatedAt: '2026-01-11 09:00:00' },
                { userType: 'MAGICPARENT', logCreatedAt: '2026-01-12 09:00:00' },
                // staff comments on the pupil's feedback are not the family using the platform
                { userType: 'TEACHER', logCreatedAt: '2026-03-01 09:00:00' },
                { userType: 'HELPER', logCreatedAt: '2026-03-02 09:00:00' }
            ]);

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil).toMatchObject({ feedbackCount: 3, lastActivity: '2026-01-12' });
        });

        it('treats a pupil with only teacher feedback as having no activity', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            const parent = await createTestParent(db, pupilId, { status: 'ACTIVE' });

            // the author id only has to exist; userType is what marks the entry as a teacher's
            await leaveFeedback(pupilId, String(parent.id), [
                { userType: 'TEACHER', logCreatedAt: moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss') }
            ]);

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil).toMatchObject({ feedbackCount: 0, lastActivity: null, pupilStatus: 'REGISTERED' });
        });

        it('reports the last activity as the calendar day it happened, whatever the time of day', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            const parent = await createTestParent(db, pupilId, { status: 'ACTIVE' });

            await leaveFeedback(pupilId, String(parent.id), [
                { type: 'ACTIVITY', logCreatedAt: '2026-01-10 23:30:00' },
                { type: 'READING', bookReadAt: '2026-01-09', logCreatedAt: '2026-01-10 23:45:00' }
            ]);

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil.lastActivity).toBe('2026-01-10');
        });

        it('reports a pupil with an active parent but no feedback as registered', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            await createTestParent(db, pupilId, { status: 'ACTIVE' });

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil).toMatchObject({ feedbackCount: 0, lastActivity: null, pupilStatus: 'REGISTERED' });
        });

        it('shows an unused pupil as having no parents, no feedback, no last activity and a missing status', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil).toMatchObject({
                id: pupilId,
                feedbackCount: 0,
                lastActivity: null,
                pupilStatus: 'MISSING',
                isPreviouslyLinked: false,
                parents: []
            });
        });

        it('flags the platform pupil that was linked to this imported student before', async () => {
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'Y123456789012', forename: 'Fardosa', surname: 'Mohamed', dateOfBirth: '2016-01-25' }
            ]);
            const importedPupilId = String(importedPupil.id);
            const [pupil] = await createTestPupils(db, schoolId, [
                {
                    UPN: 'Y123456789012',
                    firstname: 'Fardosa',
                    lastname: 'Mohamed',
                    dateOfBirth: '2016-01-24',
                    importedStudentId: importedPupilId
                }
            ]);

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, String(pupil.id));

            expect(platformPupil.isPreviouslyLinked).toBe(true);
        });

        it('does not flag a pupil whose standing link is to a different imported student', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair({ importedStudentId: 'SOME-OTHER-MIS-ID' });

            const { platformPupil } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(platformPupil.isPreviouslyLinked).toBe(false);
        });

        it('does not flag anything when no imported student is being compared', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            await db.updateTable('lwp_pupil').set({ importedStudentId: importedPupilId }).where('id', '=', pupilId).execute();

            const { platformPupil } = await entityLinks.getPupilDataForComparison(undefined, pupilId);

            expect(platformPupil.isPreviouslyLinked).toBe(false);
        });

        it('never puts the platform-only fields on the imported side', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            const { importedStudent } = await entityLinks.getPupilDataForComparison(importedPupilId, pupilId);

            expect(importedStudent.id).toBe(importedPupilId);
            expect(importedStudent).not.toHaveProperty('feedbackCount');
            expect(importedStudent).not.toHaveProperty('lastActivity');
            expect(importedStudent).not.toHaveProperty('pupilStatus');
            expect(importedStudent).not.toHaveProperty('isPreviouslyLinked');
            expect(importedStudent.parents.every((parent) => !('status' in parent))).toBe(true);
        });
    });

    describe('getPendingPupilLinks', () => {
        it('marks the candidate that was linked to the imported student before', async () => {
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'Z123456789012', forename: 'Fardosa', surname: 'Mohamed', dateOfBirth: '2016-01-25' }
            ]);
            const importedPupilId = String(importedPupil.id);

            /* The standing link and the UPN agree; the name and date of birth have both drifted. The
             * confidence rules hand that to the leader (see link-confidence, "asks the leader when the
             * dates of birth no longer agree"), which is exactly when the leader needs to know the
             * candidate is the pupil this MIS record used to point at. */
            const [pupil] = await createTestPupils(db, schoolId, [
                {
                    UPN: 'Z123456789012',
                    firstname: 'Firdosa',
                    lastname: 'Abda',
                    dateOfBirth: '2016-01-24',
                    importedStudentId: importedPupilId
                }
            ]);

            await createTestParent(db, String(pupil.id));
            await pupilLinks.refreshLinks(connection.manager, importedSchoolId);

            const pending = await entityLinks.getPendingPupilLinks(importedSchoolId);
            const row = pending.find((link) => link.importedStudent.id === importedPupilId);

            expect(row).toBeDefined();
            expect(row.proposedPlatformPupilLinks).toHaveLength(1);
            // The id arrives as a JSON number from the aggregate; GraphQL coerces it to a string later.
            expect(String(row.proposedPlatformPupilLinks[0].id)).toBe(String(pupil.id));
            expect(row.proposedPlatformPupilLinks[0].isPreviouslyLinked).toBe(true);
        });

        it('marks nothing when no candidate has been linked to the imported student before', async () => {
            const { pupilId, importedPupilId } = await seedPendingPair();

            await createTestParent(db, pupilId);
            await pupilLinks.refreshLinks(connection.manager, importedSchoolId);

            const pending = await entityLinks.getPendingPupilLinks(importedSchoolId);
            const row = pending.find((link) => link.importedStudent.id === importedPupilId);

            expect(row).toBeDefined();
            expect(row.proposedPlatformPupilLinks.map((candidate) => candidate.isPreviouslyLinked)).toEqual([false]);
        });
    });
});
