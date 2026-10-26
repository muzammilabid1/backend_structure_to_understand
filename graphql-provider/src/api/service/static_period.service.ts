/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { HttpService } from '@nestjs/axios';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { MINIO_CONNECTION } from 'nestjs-minio';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import media from 'src/config/media';
import { Stream } from 'stream';
import { EntityManager, Repository } from 'typeorm';

import { StaticLwpPeriod } from '../entities/static_period';
import { ErrorStatusCodeEnum, OperationStatus, PeriodInput, SchoolClassStatus, UpdatePeriodInput } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class StaticLwpPeriodService {
    constructor(
        @InjectRepository(StaticLwpPeriod)
        private staticLwpPeriodRepository: Repository<StaticLwpPeriod>,
        @Inject(MINIO_CONNECTION) private readonly minioClient,
        private httpService: HttpService,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService
    ) {}

    public async allStaticPeriods(): Promise<StaticLwpPeriod[]> {
        return await this.staticLwpPeriodRepository.find({ order: { index: 'DESC' } });
    }

    public async getCurrentAndFutureStaticPeriods(): Promise<StaticLwpPeriod[]> {
        return await this.staticLwpPeriodRepository.find({
            where: [{ isCurrentPeriod: true }, { isPreviousPeriod: false }],
            order: { index: 'ASC' }
        });
    }

    public async getStaticPeriod(staticPeriodIndex: number, manager?: EntityManager): Promise<StaticLwpPeriod> {
        const period = await (manager?.getRepository(StaticLwpPeriod) ?? this.staticLwpPeriodRepository).findOne({
            where: { index: staticPeriodIndex }
        });

        if (!period) throw new HttpException('Static period not found.', ErrorStatusCodeEnum._535);

        return period;
    }

    public async getCurrentPeriod(): Promise<StaticLwpPeriod> {
        const period = await this.staticLwpPeriodRepository.findOne({ where: { isCurrentPeriod: true }, order: { index: 'DESC' } });

        if (!period) throw new HttpException('Current period not found.', ErrorStatusCodeEnum._535);

        return period;
    }

    public async getCurrentPeriodIndex(manager?: EntityManager): Promise<number> {
        const staticLwpPeriodRepository: Repository<StaticLwpPeriod> = manager
            ? manager.getRepository(StaticLwpPeriod)
            : this.staticLwpPeriodRepository;

        const period = await staticLwpPeriodRepository.findOne({
            where: { isCurrentPeriod: true },
            order: { index: 'DESC' },
            select: ['index']
        });

        if (!period) throw new HttpException('Current period not found.', ErrorStatusCodeEnum._535);

        return period.index;
    }

    public async addStaticPeriod(input: PeriodInput, userId: string): Promise<StaticLwpPeriod> {
        const { date, isCurrentPeriod, isPreviousPeriod, characters, colours, shortName, longName, startDate, endDate } = input;

        const periodIndex = moment(date).year();

        const period = await this.staticLwpPeriodRepository.findOne({ where: { index: periodIndex } });

        if (period) throw new HttpException('Static period already exist.', ErrorStatusCodeEnum._535);

        const staticPeriod = new StaticLwpPeriod();

        const user = this.shallowUserService.newShallowUser(userId);

        staticPeriod.index = periodIndex;
        staticPeriod.shortName = shortName;
        staticPeriod.longName = longName;
        staticPeriod.startDate = startDate;
        staticPeriod.endDate = endDate;
        staticPeriod.isCurrentPeriod = isCurrentPeriod;
        staticPeriod.isPreviousPeriod = isPreviousPeriod;
        staticPeriod.characters = JSON.parse(characters)?.length > 0 ? JSON.parse(characters) : [];
        staticPeriod.colours = JSON.parse(colours)?.length > 0 ? JSON.parse(colours) : [];
        staticPeriod.logCreatedBy = user;
        staticPeriod.logUpdatedBy = user;

        const previousPeriod = await this.staticLwpPeriodRepository.findOne({ where: { index: staticPeriod.index - 1 } });

        if (!previousPeriod) {
            await this.staticLwpPeriodRepository.save(staticPeriod);

            return staticPeriod;
        }

        staticPeriod.previousPeriod = previousPeriod;

        await this.staticLwpPeriodRepository.save(staticPeriod);
        previousPeriod.nextPeriod = staticPeriod;
        await this.staticLwpPeriodRepository.save(previousPeriod);

        return staticPeriod;
    }

    public async updateStaticPeriod(input: UpdatePeriodInput, userId: string, manager?: EntityManager): Promise<StaticLwpPeriod> {
        const staticLwpPeriodRepository: Repository<StaticLwpPeriod> =
            manager?.getRepository(StaticLwpPeriod) ?? this.staticLwpPeriodRepository;

        const period = await staticLwpPeriodRepository.findOne({
            where: { index: input?.index },
            relations: ['previousPeriod', 'nextPeriod']
        });

        if (!period) throw new HttpException('Current period not found.', ErrorStatusCodeEnum._535);

        if (input?.shortName) period.shortName = input?.shortName;
        if (input?.longName) period.longName = input?.longName;
        if (input?.startDate) period.startDate = input?.startDate;
        if (input?.endDate) period.endDate = input?.endDate;

        if (input?.isCurrentPeriod != null) period.isCurrentPeriod = input?.isCurrentPeriod;
        if (input?.isPreviousPeriod != null) period.isPreviousPeriod = input?.isPreviousPeriod;

        if (JSON.parse(input?.characters ?? null)?.length > 0) period.characters = JSON.parse(input?.characters);
        if (JSON.parse(input?.colours ?? null)?.length > 0) period.colours = JSON.parse(input?.colours);
        period.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return await staticLwpPeriodRepository.save(period);
    }

    public getBufferFromUrl(url: string) {
        return this.httpService.get(url, { responseType: 'arraybuffer' });
    }

    public checkFileExists(url: string) {
        return this.getBufferFromUrl(url)
            .toPromise()
            .then(() => true)
            .catch(() => false);
    }

    public putPublicObject(fileName: string, image: Stream): Promise<string> {
        return new Promise((res, rej) =>
            this.minioClient.putObject(media.bucket_public, fileName, image, (e: any, d: string) => (e ? rej(e) : res(d)))
        );
    }

    public getTShirtName = (shirt: string): string => {
        const word = shirt.toLowerCase();

        return `T${word.charAt(0).toUpperCase() + word.slice(1)}`;
    };

    public async deleteStaticPeriod(index: number): Promise<OperationStatus> {
        const res = await this.staticLwpPeriodRepository.delete({ index });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getSchoolPeriod(schoolId: string): Promise<StaticLwpPeriod> {
        const schoolPeriod = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoinAndSelect('period.schools', 'school')
            .where('school.id = :schoolId', { schoolId })
            .getOne();

        return schoolPeriod ? schoolPeriod : null;
    }

    /**
     * The year before the school's current one, or null if the school had no active registration
     * classes then - the same thing the leader reports count, so there would be nothing to download.
     */
    public async getSchoolPreviousAcademicYearForDataDownload(schoolId: string): Promise<StaticLwpPeriod | null> {
        return await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .innerJoin('period.schoolClasses', 'schoolClass', 'schoolClass.isRegistrationClass = TRUE AND schoolClass.status = :status', {
                status: SchoolClassStatus.ACTIVE
            })
            .innerJoin('schoolClass.school', 'school')
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('period.index = currentPeriod.index - 1')
            .select(['period.index', 'period.shortName'])
            .getOne();
    }

    public async getSchoolPeriodsBySchoolIds(schoolIds: readonly string[]): Promise<StaticLwpPeriod[]> {
        if (!schoolIds.length) return [];

        const results = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoin('period.schools', 'school')
            .where('school.id IN (:...schoolIds)', { schoolIds: schoolIds })
            .addSelect('school.id', 'schoolId')
            .getRawAndEntities();

        const periods = results.entities;
        const rawResults = results.raw;

        const schoolToPeriodMap = new Map<string, StaticLwpPeriod>();

        rawResults.forEach((raw, index) => {
            if (periods[index]) {
                schoolToPeriodMap.set(raw.schoolId, periods[index]);
            }
        });

        // Return periods in same order as input school IDs
        const result: (StaticLwpPeriod | null)[] = [];

        schoolIds.forEach((schoolId) => {
            result.push(schoolToPeriodMap.get(schoolId) || null);
        });

        return result;
    }

    public async getSchoolClassPeriod(schoolClassId: string): Promise<StaticLwpPeriod> {
        const schoolClassPeriod = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoinAndSelect('period.schoolClasses', 'schoolClass')
            .where('schoolClass.id = :schoolClassId', { schoolClassId })
            .getOne();

        return schoolClassPeriod ? schoolClassPeriod : null;
    }

    public async getPupilTopicPeriod(pupilTopicId: string): Promise<StaticLwpPeriod> {
        const pupilTopicPeriod = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoinAndSelect('period.pupilTopics', 'pupilTopic')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId })
            .getOne();

        return pupilTopicPeriod ? pupilTopicPeriod : null;
    }

    public async getNextSchoolPeriodsBySchoolIds(schoolIds: readonly string[]): Promise<(StaticLwpPeriod | null)[]> {
        if (!schoolIds.length) return [];

        const results = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoin('period.schools', 'school')
            .leftJoinAndSelect('period.nextPeriod', 'nextPeriod')
            .where('school.id IN (:...schoolIds)', { schoolIds: schoolIds })
            .addSelect('school.id', 'schoolId')
            .getRawAndEntities();

        const periods = results.entities;
        const rawResults = results.raw;

        const schoolToNextPeriodMap = new Map<string, StaticLwpPeriod | null>();

        rawResults.forEach((raw, index) => {
            if (periods[index]) {
                schoolToNextPeriodMap.set(raw.schoolId, periods[index].nextPeriod ?? null);
            }
        });

        return schoolIds.map((schoolId) => schoolToNextPeriodMap.get(schoolId) ?? null);
    }

    public async getNextPeriod(periodIndex: number): Promise<StaticLwpPeriod> {
        const staticPeriod = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoinAndSelect('period.nextPeriod', 'nextPeriod')
            .where('period.index = :periodIndex', { periodIndex })
            .getOne();

        return staticPeriod?.nextPeriod ? staticPeriod?.nextPeriod : null;
    }

    public async getPrevPeriod(periodIndex: number): Promise<StaticLwpPeriod> {
        const staticPeriod = await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoinAndSelect('period.previousPeriod', 'previousPeriod')
            .where('period.index = :periodIndex', { periodIndex })
            .getOne();

        return staticPeriod?.previousPeriod ? staticPeriod?.previousPeriod : null;
    }

    public async getPupilMathscotPeriod(pupilMathscotId: string): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodRepository
            .createQueryBuilder('period')
            .leftJoin('period.pupilMathscot', 'pupilMathscot')
            .where('pupilMathscot.id = :pupilMathscotId', { pupilMathscotId })
            .getOne();
    }

    public async getStaticPeriodsForFeedbackFilter(
        teacherId: string,
        schoolId: string,
        isAdminOrSchoolLeader: boolean
    ): Promise<StaticLwpPeriod[]> {
        const staticPeriod = this.staticLwpPeriodRepository
            .createQueryBuilder('slp')
            .leftJoin('slp.schoolClasses', 'schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('schoolClass.status = :status', { status: SchoolClassStatus.ACTIVE })
            .select(['slp.index', 'slp.longName', 'slp.shortName']);

        if (!isAdminOrSchoolLeader) {
            staticPeriod.leftJoin('schoolClass.teachers', 'teachers').andWhere('teachers.id = :teacherId', { teacherId });
        }

        return staticPeriod.getMany();
    }
}
