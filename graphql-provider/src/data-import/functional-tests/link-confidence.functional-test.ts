import 'tsconfig-paths/register';

import type { Schema } from '@lwp/postgres-client';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Kysely, sql } from 'kysely';
import { WondeService } from 'src/api/service/wonde.service';
import { DataImportModule } from 'src/data-import/data-import.module';
import {
    addImportedPupilToImportedClass,
    addPupilToPlatformClass,
    cleanUpSchool,
    createTestImportedClasses,
    createTestImportedContact,
    createTestImportedPupils,
    createTestImportedSchool,
    createTestParent,
    createTestPlatformClass,
    createTestPupils,
    createTestSchool,
    getLinks,
    setImportedSchoolPeriod,
    setSchoolPeriod
} from 'src/data-import/functional-tests/seeds';
import { createDb } from 'src/data-import/functional-tests/utils';
import { ClassLinkService } from 'src/data-import/service/class-link.service';
import { EntityLinkService } from 'src/data-import/service/entity-link.service';
import { PupilLinkService } from 'src/data-import/service/pupil-link.service';
import { Connection } from 'typeorm';

const PERIOD = 2026;

/**
 * These cover the confidence rules only: given some platform and MIS data, does the review decide
 * for itself or hand the decision to a school leader? Each test seeds its own school so they can be
 * read and changed one at a time, which is what the previous suite's shared permutation fixtures
 * made impossible.
 */
describe('Import review link confidence', () => {
    let db: Kysely<Schema.DB>;
    let app: INestApplication;
    let connection: Connection;
    let pupilLinks: PupilLinkService;
    let classLinks: ClassLinkService;
    let entityLinks: EntityLinkService;
    let wonde: WondeService;

    let school: Schema.LwpSchool;
    let importedSchool: Schema.ImportedSchool;
    let schoolId: string;
    let importedSchoolId: string;

    beforeAll(async () => {
        db = createDb();
        app = await NestFactory.create(DataImportModule, { logger: false });
        connection = app.get(Connection);
        pupilLinks = app.get(PupilLinkService);
        classLinks = app.get(ClassLinkService);
        entityLinks = app.get(EntityLinkService);
        wonde = app.get(WondeService);
    }, 60000);

    afterAll(async () => {
        await app?.close();
        await connection?.close().catch(() => undefined);
        await db?.destroy();
    });

    beforeEach(async () => {
        school = await createTestSchool(db);
        schoolId = String(school.id);
        importedSchool = await createTestImportedSchool(db, schoolId);
        importedSchoolId = String(importedSchool.id);
        await setSchoolPeriod(db, schoolId, PERIOD);
        await setImportedSchoolPeriod(db, importedSchoolId, PERIOD);
    });

    afterEach(async () => {
        await cleanUpSchool(db, schoolId, importedSchoolId);
    });

    const refreshPupilLinks = (): Promise<void> => pupilLinks.refreshLinks(connection.manager, importedSchoolId);
    const refreshClassLinks = (): Promise<void> => classLinks.refreshLinks(connection.manager, importedSchoolId);

    /** One MIS pupil and one platform pupil, with an engaged parent so the pupil can be offered. */
    const seedOnePupilEach = async (
        platform: { UPN?: string; firstname: string; lastname: string; dateOfBirth: string | null; importedStudentId?: string },
        mis: { UPN?: string; forename: string; surname: string; dateOfBirth: string | null }
    ): Promise<{ pupilId: string; importedPupilId: string }> => {
        const [pupil] = await createTestPupils(db, schoolId, [platform]);

        await createTestParent(db, String(pupil.id));
        const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [mis]);

        return { pupilId: String(pupil.id), importedPupilId: String(importedPupil.id) };
    };

    const pupilLinkFor = async (importedPupilId: string): Promise<{ status: string; isHighConfidence: boolean } | undefined> => {
        const links = await getLinks(db, schoolId, 'PUPIL');

        return links.find((l) => l.importedEntityId === importedPupilId);
    };

    const pupilLinkBetween = async (
        importedPupilId: string,
        platformPupilId: string
    ): Promise<{ status: string; isHighConfidence: boolean } | undefined> => {
        const links = await getLinks(db, schoolId, 'PUPIL');

        return links.find((l) => l.importedEntityId === importedPupilId && l.platformEntityId === platformPupilId);
    };

    /** A pupil the review has already linked: the MIS id is stamped on the platform record. */
    const seedStandingLink = async (
        platform: { UPN?: string; firstname: string; lastname: string; dateOfBirth: string | null },
        mis: { UPN?: string; forename: string; surname: string; dateOfBirth: string | null }
    ): Promise<{ pupilId: string; importedPupilId: string }> => {
        const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [mis]);
        const [pupil] = await createTestPupils(db, schoolId, [{ ...platform, importedStudentId: String(importedPupil.id) }]);

        await createTestParent(db, String(pupil.id));

        return { pupilId: String(pupil.id), importedPupilId: String(importedPupil.id) };
    };

    describe('a pupil the MIS and the platform agree on', () => {
        it('links automatically when the parent contact details have since changed', async () => {
            const [pupil] = await createTestPupils(db, schoolId, [
                { UPN: 'C123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'C123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            const contact = await createTestImportedContact(db, importedSchoolId, String(importedPupil.id), {
                email: 'old.address@example.com',
                phoneNumber: '+447000000001'
            });

            // the same parent, but both details have drifted since the platform record was made
            await createTestParent(db, String(pupil.id), {
                email: 'new.address@example.com',
                phoneNumber: '+447000000002',
                importedContactId: String(contact.id)
            });

            await refreshPupilLinks();

            expect(await pupilLinkFor(String(importedPupil.id))).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('links automatically when the MIS holds no contact details for the parent', async () => {
            const [pupil] = await createTestPupils(db, schoolId, [
                { UPN: 'V123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'V123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            // the MIS knows of a parent but has neither an email nor a phone number for them, so
            // there is nothing to compare the platform parent against either way
            await createTestImportedContact(db, importedSchoolId, String(importedPupil.id), {
                email: null,
                phoneNumber: null
            });
            await createTestParent(db, String(pupil.id), { email: 'cleos.parent@example.com', phoneNumber: '+447000000003' });

            await refreshPupilLinks();

            expect(await pupilLinkFor(String(importedPupil.id))).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('asks the leader when a second MIS contact has details that match no parent', async () => {
            const [pupil] = await createTestPupils(db, schoolId, [
                { UPN: 'W123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'W123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            await createTestImportedContact(db, importedSchoolId, String(importedPupil.id), { email: null, phoneNumber: null });
            // this one does carry details, and they belong to nobody on the platform record
            await createTestImportedContact(db, importedSchoolId, String(importedPupil.id), {
                email: 'someone.else@example.com',
                phoneNumber: '+447000000004'
            });
            await createTestParent(db, String(pupil.id), { email: 'cleos.parent@example.com', phoneNumber: '+447000000003' });

            await refreshPupilLinks();

            expect(await pupilLinkFor(String(importedPupil.id))).toMatchObject({ status: 'PENDING', isHighConfidence: false });
        });

        it('links automatically when the MIS has reissued the pupil id', async () => {
            const { importedPupilId } = await seedOnePupilEach(
                {
                    UPN: 'D123456789012',
                    firstname: 'Cleo',
                    lastname: 'Jones',
                    dateOfBirth: '2017-08-30',
                    // a stamp left over from a MIS id that no longer exists
                    importedStudentId: 'GONE-FROM-THE-MIS'
                },
                { UPN: 'D123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });
    });

    describe('a pupil the review has not linked before', () => {
        it('asks the leader when the dates of birth differ', async () => {
            const { importedPupilId } = await seedOnePupilEach(
                { UPN: 'E123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-29' },
                { UPN: 'E123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'PENDING', isHighConfidence: false });
        });

        it('asks the leader when the platform has no date of birth recorded', async () => {
            // Three signals agree and none contradict, but a blank date of birth still leaves the
            // score one short. The leader answers once; the sync then writes the MIS date onto the
            // pupil, and the standing link carries it from then on.
            const { importedPupilId } = await seedOnePupilEach(
                { UPN: 'M123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: null },
                { UPN: 'M123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'PENDING', isHighConfidence: false });
        });
    });

    describe('a pupil the review has already linked', () => {
        it('carries the link forward when the MIS has since renamed the pupil', async () => {
            const { importedPupilId } = await seedStandingLink(
                { UPN: 'N123456789012', firstname: 'Fardosa', lastname: 'Mohamed', dateOfBirth: '2016-01-25' },
                { UPN: 'N123456789012', forename: 'Firdosa', surname: 'Abda', dateOfBirth: '2016-01-25' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('carries the link forward when the platform has no UPN to compare', async () => {
            const { importedPupilId } = await seedStandingLink(
                { UPN: '[Unknown]', firstname: 'Fardosa', lastname: 'Mohamed', dateOfBirth: '2016-01-25' },
                { UPN: 'P123456789012', forename: 'Firdosa', surname: 'Abda', dateOfBirth: '2016-01-25' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('asks the leader when the two UPNs contradict each other', async () => {
            const { importedPupilId } = await seedStandingLink(
                { UPN: 'Q123456789012', firstname: 'Fardosa', lastname: 'Mohamed', dateOfBirth: '2016-01-25' },
                { UPN: 'R999999999999', forename: 'Firdosa', surname: 'Abda', dateOfBirth: '2016-01-25' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'PENDING', isHighConfidence: false });
        });

        it('asks the leader when the dates of birth no longer agree', async () => {
            const { importedPupilId } = await seedStandingLink(
                { UPN: 'S123456789012', firstname: 'Fardosa', lastname: 'Mohamed', dateOfBirth: '2016-01-24' },
                { UPN: 'S123456789012', forename: 'Firdosa', surname: 'Abda', dateOfBirth: '2016-01-25' }
            );

            await refreshPupilLinks();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'PENDING', isHighConfidence: false });
        });
    });

    describe('more than one high-confidence candidate', () => {
        it('links the candidate that agrees on everything a rival does and more', async () => {
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'E123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            // the same name and date of birth on both, but only one of them carries the MIS's UPN;
            // the other's is a temporary one, which is silence rather than a contradiction
            const [weaker, better] = await createTestPupils(db, schoolId, [
                { UPN: 'E12345678901A', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' },
                { UPN: 'E123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            await createTestParent(db, String(weaker.id));
            await createTestParent(db, String(better.id));

            await refreshPupilLinks();

            expect(await pupilLinkBetween(String(importedPupil.id), String(better.id))).toMatchObject({
                status: 'AUTO_SELECTED',
                isHighConfidence: true
            });
            expect(await pupilLinkBetween(String(importedPupil.id), String(weaker.id))).toMatchObject({
                status: 'AUTO_REJECTED',
                isHighConfidence: true
            });
        });

        it('asks the leader when the two candidates are equally good', async () => {
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'H123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            // nothing to choose between them: same name, same date of birth, and a temporary UPN
            // each, so neither has anything the other does not
            const [first, second] = await createTestPupils(db, schoolId, [
                { UPN: 'H12345678901A', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' },
                { UPN: 'H22345678901B', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            await createTestParent(db, String(first.id));
            await createTestParent(db, String(second.id));

            await refreshPupilLinks();

            expect(await pupilLinkBetween(String(importedPupil.id), String(first.id))).toMatchObject({
                status: 'PENDING',
                isHighConfidence: true
            });
            expect(await pupilLinkBetween(String(importedPupil.id), String(second.id))).toMatchObject({
                status: 'PENDING',
                isHighConfidence: true
            });
        });

        it('asks the leader when each candidate has evidence the other lacks', async () => {
            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'F123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            // one agrees on the date of birth, the other on the MIS id and the UPN: more evidence
            // on one side is not the same as better evidence, so this is the leader's call
            const [byDateOfBirth] = await createTestPupils(db, schoolId, [
                { UPN: 'F12345678901A', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);
            const [byIdAndUpn] = await createTestPupils(db, schoolId, [
                {
                    UPN: 'F123456789012',
                    firstname: 'Cleo',
                    lastname: 'Jones',
                    dateOfBirth: '2016-01-02',
                    importedStudentId: String(importedPupil.id)
                }
            ]);

            await createTestParent(db, String(byDateOfBirth.id));
            await createTestParent(db, String(byIdAndUpn.id));

            await refreshPupilLinks();

            expect(await pupilLinkBetween(String(importedPupil.id), String(byDateOfBirth.id))).toMatchObject({
                status: 'PENDING',
                isHighConfidence: true
            });
            expect(await pupilLinkBetween(String(importedPupil.id), String(byIdAndUpn.id))).toMatchObject({
                status: 'PENDING',
                isHighConfidence: true
            });
        });

        it('links the MIS pupil whose parent the platform already knows', async () => {
            const [pupil] = await createTestPupils(db, schoolId, [
                { UPN: 'G12345678901A', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            await createTestParent(db, String(pupil.id), { email: 'cleos.parent@example.com' });

            // two children the MIS reports under the same name and date of birth, both of them a
            // high-confidence match for the one platform pupil
            const [better, weaker] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'G123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' },
                { UPN: 'G223456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            // only one of them is the child of the parent the platform holds
            await createTestImportedContact(db, importedSchoolId, String(better.id), { email: 'cleos.parent@example.com' });

            await refreshPupilLinks();

            expect(await pupilLinkBetween(String(better.id), String(pupil.id))).toMatchObject({
                status: 'AUTO_SELECTED',
                isHighConfidence: true
            });
            expect(await pupilLinkBetween(String(weaker.id), String(pupil.id))).toMatchObject({
                status: 'AUTO_REJECTED',
                isHighConfidence: true
            });
        });
    });

    describe('the pupil the leader is shown', () => {
        it('offers a pupil with earlier academic years once, not once per year', async () => {
            const { pupilId, importedPupilId } = await seedOnePupilEach(
                { UPN: 'G123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-29' },
                { UPN: 'G123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            );

            for (const periodIndex of [PERIOD - 3, PERIOD - 2, PERIOD - 1, PERIOD]) {
                const platformClass = await createTestPlatformClass(db, schoolId, { name: `Class ${periodIndex}`, periodIndex });

                await addPupilToPlatformClass(db, String(platformClass.id), pupilId);
            }

            await refreshPupilLinks();

            const [row] = await entityLinks.pendingPupilLinksQueryBuilder(connection.manager, importedSchoolId).getRawMany();

            expect(row.id).toBe(importedPupilId);
            expect(row.proposedPlatformPupilLinks).toHaveLength(1);
            expect(row.proposedPlatformPupilLinks[0]).toMatchObject({ id: Number(pupilId), pupilClass: { name: `Class ${PERIOD}` } });
        });
    });

    describe("a leader's decision, across the next sync", () => {
        /** What a nightly sync does before regenerating: everything but rejections is discarded. */
        const nextSync = async (): Promise<void> => {
            await entityLinks.deleteStaleLinks(connection.manager, importedSchoolId);
            await refreshPupilLinks();
        };

        it('carries a chosen pupil forward without asking again', async () => {
            // both names differ, so this is offered rather than decided
            const { pupilId, importedPupilId } = await seedOnePupilEach(
                { UPN: 'T123456789012', firstname: 'Sindal', lastname: 'Idris', dateOfBirth: '2020-01-13' },
                { UPN: 'T123456789012', forename: 'Ryan', surname: 'Alisaed', dateOfBirth: '2020-01-13' }
            );

            await refreshPupilLinks();
            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'PENDING' });

            await pupilLinks.selectLink(connection.manager, importedSchoolId, importedPupilId, pupilId);
            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'SELECTED' });

            await nextSync();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('does not offer a rejected pupil again', async () => {
            const { importedPupilId } = await seedOnePupilEach(
                { UPN: 'U123456789012', firstname: 'Sindal', lastname: 'Idris', dateOfBirth: '2020-01-13' },
                { UPN: 'U123456789012', forename: 'Ryan', surname: 'Alisaed', dateOfBirth: '2020-01-13' }
            );

            await refreshPupilLinks();
            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'PENDING' });

            await pupilLinks.rejectLinks(connection.manager, importedSchoolId, importedPupilId);
            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'REJECTED' });

            await nextSync();

            expect(await pupilLinkFor(importedPupilId)).toMatchObject({ status: 'REJECTED' });
        });
    });

    describe('the MIS as the source of truth', () => {
        it('rewrites a stale UPN and date of birth onto a linked pupil', async () => {
            // Both are load-bearing for carrying a standing link forward, so a wrong value on the
            // platform reopens a decision already taken. The date here is a day early, which is
            // what manual pupil creation produces for a birthday inside BST.
            const { pupilId } = await seedStandingLink(
                { UPN: 'Y999999999999', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2016-06-11' },
                { UPN: 'Z123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2016-06-12' }
            );

            await wonde.reLinkingLwpWithWonde(importedSchoolId, schoolId);

            const pupil = await db
                .selectFrom('lwp_pupil')
                .select('UPN')
                .select(sql<string>`"dateOfBirth"::text`.as('dateOfBirth'))
                .where('id', '=', pupilId)
                .executeTakeFirst();

            expect(pupil.UPN).toBe('Z123456789012');
            expect(pupil.dateOfBirth).toBe('2016-06-12');
        }, 60000);
    });

    describe('a class the review cannot find a shared pupil for', () => {
        it('links a class whose pupils all lack an engaged parent', async () => {
            const [importedClass] = await createTestImportedClasses(db, importedSchoolId, [{ name: 'Owls' }]);

            await db.updateTable('imported_school_class').set({ periodIndex: PERIOD }).where('id', '=', String(importedClass.id)).execute();

            const platformClass = await createTestPlatformClass(db, schoolId, { name: 'Owls', periodIndex: PERIOD });
            const [pupil] = await createTestPupils(db, schoolId, [
                { UPN: 'I123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            // an imported parent only: this pupil is the kind the completion relink recreates,
            // so it never carries a pupil link for the class comparison to find
            await createTestParent(db, String(pupil.id), { status: 'IMPORTED' });
            await addPupilToPlatformClass(db, String(platformClass.id), String(pupil.id));

            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'I123456789012', forename: 'Cleo', surname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            await addImportedPupilToImportedClass(db, String(importedClass.id), String(importedPupil.id));

            await refreshClassLinks();

            const links = await getLinks(db, schoolId, 'CLASS');

            expect(links).toHaveLength(1);
            expect(links[0]).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('links a class that is empty on both sides', async () => {
            const [importedClass] = await createTestImportedClasses(db, importedSchoolId, [{ name: 'Oak' }]);

            await db.updateTable('imported_school_class').set({ periodIndex: PERIOD }).where('id', '=', String(importedClass.id)).execute();
            await createTestPlatformClass(db, schoolId, { name: 'Oak', periodIndex: PERIOD });

            await refreshClassLinks();

            const links = await getLinks(db, schoolId, 'CLASS');

            expect(links).toHaveLength(1);
            expect(links[0]).toMatchObject({ status: 'AUTO_SELECTED', isHighConfidence: true });
        });

        it('asks the leader when the names differ and the pupils cannot vouch for the class', async () => {
            const [importedClass] = await createTestImportedClasses(db, importedSchoolId, [{ name: 'REC' }]);

            await db.updateTable('imported_school_class').set({ periodIndex: PERIOD }).where('id', '=', String(importedClass.id)).execute();

            const platformClass = await createTestPlatformClass(db, schoolId, { name: 'Ready Teddy', periodIndex: PERIOD });
            const [pupil] = await createTestPupils(db, schoolId, [
                { UPN: 'J123456789012', firstname: 'Cleo', lastname: 'Jones', dateOfBirth: '2017-08-30' }
            ]);

            await createTestParent(db, String(pupil.id));
            await addPupilToPlatformClass(db, String(platformClass.id), String(pupil.id));

            const [importedPupil] = await createTestImportedPupils(db, importedSchoolId, [
                { UPN: 'K123456789012', forename: 'Someone', surname: 'Different', dateOfBirth: '2016-02-02' }
            ]);

            await addImportedPupilToImportedClass(db, String(importedClass.id), String(importedPupil.id));

            await refreshClassLinks();

            const links = await getLinks(db, schoolId, 'CLASS');

            expect(links.every((l) => l.status === 'PENDING' && !l.isHighConfidence)).toBe(true);
        });
    });
});
