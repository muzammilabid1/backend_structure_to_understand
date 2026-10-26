import type { Schema } from '@lwp/postgres-client';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Kysely, type Selectable, sql } from 'kysely';
import { LwpPupil } from 'src/api/entities/pupil';
import { PupilType } from 'src/api/model';
import { createUtils } from 'src/api/service/functional-tests/utils';
import { PupilService } from 'src/api/service/pupil.service';
import { BaseModule } from 'src/base.module';
import { createDb } from 'src/data-import/functional-tests/utils';

jest.setTimeout(120000);

describe('PupilService pupil type around the school year rollover (LEA-6571)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let app: INestApplication;
    let pupilService: PupilService;

    let school: Selectable<Schema.LwpSchool>;
    let currentClass: Selectable<Schema.LwpSchoolClass>;
    let futureClass: Selectable<Schema.LwpSchoolClass>;
    let pupil: Selectable<Schema.LwpPupil>;

    let currentPeriodIndex: number;
    let futurePeriodIndex: number;
    let createdFuturePeriod = false;

    const pupilType = async (): Promise<PupilType> => await pupilService.getPupilType({ id: pupil.id } as LwpPupil);

    beforeAll(async () => {
        db = await createDb();
        utils = createUtils(db);
        app = await NestFactory.create(BaseModule);
        pupilService = app.get(PupilService);

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        currentPeriodIndex = currentPeriod.index;
        futurePeriodIndex = currentPeriod.index + 1;

        const futurePeriod = await db
            .selectFrom('static_lwp_period')
            .where('index', '=', futurePeriodIndex)
            .select('index')
            .executeTakeFirst();

        if (!futurePeriod) {
            await db
                .insertInto('static_lwp_period')
                .values({
                    index: futurePeriodIndex,
                    shortName: `${futurePeriodIndex}`,
                    longName: `Academic year ${futurePeriodIndex}`,
                    startDate: new Date(`${futurePeriodIndex}-01-01`),
                    endDate: new Date(`${futurePeriodIndex}-12-31`),
                    isCurrentPeriod: false
                })
                .execute();
            createdFuturePeriod = true;
        }

        school = await utils.createSchool({ schoolName: 'Rollover School', curentPeriodIndex: currentPeriodIndex });
        currentClass = await utils.createClass(school.id, {
            name: 'Current Year Class',
            isRegistrationClass: true,
            isFullProgramme: true,
            IsReadingLogsEnabled: true,
            periodIndex: currentPeriodIndex
        });
        futureClass = await utils.createClass(school.id, {
            name: 'Next Year Ready Teddy Class',
            isRegistrationClass: true,
            isFullProgramme: false,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: true,
            periodIndex: futurePeriodIndex
        });
        pupil = await utils.createPupil(school.id, {
            UPN: 'R000000000002',
            firstname: 'Rollover',
            lastname: 'Pupil',
            dateOfBirth: new Date('2015-01-01')
        });
    });

    afterEach(async () => {
        await utils.removePupilFromClass(pupil.id, currentClass.id);
        await utils.removePupilFromClass(pupil.id, futureClass.id);
        await db.updateTable('lwp_school').set({ curentPeriodIndex: currentPeriodIndex }).where('id', '=', school.id).execute();
    });

    afterAll(async () => {
        await utils.deletePupil(pupil.id);
        await utils.deleteClass(currentClass.id);
        await utils.deleteClass(futureClass.id);
        await utils.deleteSchool(school.id);

        if (createdFuturePeriod) {
            await db.deleteFrom('static_lwp_period').where('index', '=', futurePeriodIndex).execute();
        }

        await app.close();
        await sql`vacuum`.execute(db);
        await db.destroy();
    });

    it('follows the current class when it is the only one', async () => {
        await utils.addPupilToClass(pupil.id, currentClass.id);

        await expect(pupilType()).resolves.toBe(PupilType.BOTH);
    });

    it('keeps the current class when a next-year class is set up early', async () => {
        await utils.addPupilToClass(pupil.id, currentClass.id);
        await utils.addPupilToClass(pupil.id, futureClass.id);

        await expect(pupilType()).resolves.toBe(PupilType.BOTH);
    });

    it('follows the next-year class when the pupil has no started class', async () => {
        await utils.addPupilToClass(pupil.id, futureClass.id);

        await expect(pupilType()).resolves.toBe(PupilType.TOPIC);
    });

    it('follows the new class once the school year rolls over', async () => {
        await utils.addPupilToClass(pupil.id, currentClass.id);
        await utils.addPupilToClass(pupil.id, futureClass.id);
        await db.updateTable('lwp_school').set({ curentPeriodIndex: futurePeriodIndex }).where('id', '=', school.id).execute();

        await expect(pupilType()).resolves.toBe(PupilType.TOPIC);
    });
});
