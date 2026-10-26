import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LwpSchoolHoliday } from '../entities/lwp_school_holiday';
import { LwpSchool } from '../entities/school';
import { StaticLwpPeriod } from '../entities/static_period';
import { LwpUser } from '../entities/user';
import { AddSchoolHolidayInput, ErrorStatusCodeEnum, OperationStatus, UpdateSchoolHolidayInput } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class LwpSchoolHolidayService {
    constructor(
        private helperService: HelperService,
        @InjectRepository(LwpSchoolHoliday)
        private schoolHolidayRepository: Repository<LwpSchoolHoliday>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(StaticLwpPeriod)
        private periodRepository: Repository<StaticLwpPeriod>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addSchoolHoliday(input: AddSchoolHolidayInput, user: string | LwpUser): Promise<LwpSchoolHoliday> {
        const schoolHoliday = new LwpSchoolHoliday();
        const { holidayName, endDate, startDate, periodIndex, schoolId } = input;

        const setStartDateTime = this.helperService.setStartTimeOfDayForHoliday(startDate);
        const setEndDateTime = this.helperService.setStartTimeOfDayForHoliday(endDate);

        schoolHoliday.holidayName = holidayName;
        schoolHoliday.startDate = setStartDateTime;
        schoolHoliday.endDate = setEndDateTime;

        const shallowUser = this.shallowUserService.newShallowUser(user);

        schoolHoliday.logCreatedBy = shallowUser;
        schoolHoliday.logUpdatedBy = shallowUser;
        schoolHoliday.schools = [];

        if (schoolId) {
            const school = await this.schoolRepository.findOne({ where: { id: schoolId } });

            if (school?.id) schoolHoliday.schools.push(school);
        }

        if (periodIndex) {
            const period = await this.periodRepository.findOne({ where: { index: periodIndex } });

            if (period?.index) schoolHoliday.period = period;
        }

        return this.schoolHolidayRepository.save(schoolHoliday);
    }

    public async updateSchoolHoliday(input: UpdateSchoolHolidayInput, user: string | LwpUser): Promise<LwpSchoolHoliday> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id: input?.id }, relations: ['logCreatedBy'] });

        if (!schoolHoliday) throw new HttpException('School holiday does not exist', ErrorStatusCodeEnum._535);

        const { holidayName, startDate, endDate } = input;
        const setStartDateTime = this.helperService.setStartTimeOfDayForHoliday(startDate);
        const setEndDateTime = this.helperService.setStartTimeOfDayForHoliday(endDate);

        schoolHoliday.holidayName = holidayName;
        schoolHoliday.startDate = setStartDateTime;
        schoolHoliday.endDate = setEndDateTime;

        schoolHoliday.logUpdatedBy = this.shallowUserService.newShallowUser(user);

        return this.schoolHolidayRepository.save(schoolHoliday);
    }

    public async allSchoolHolidays(): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayRepository
            .createQueryBuilder('schoolHoliday')
            .leftJoinAndSelect('schoolHoliday.schools', 'school')
            .where('school.id IS NULL')
            .orderBy('schoolHoliday.endDate', 'DESC')
            .getMany();
    }

    public async getHolidaysForAdmin(): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayRepository
            .createQueryBuilder('schoolHoliday')
            .leftJoinAndSelect('schoolHoliday.schools', 'school')
            .where('school.id IS NULL')
            .orderBy('schoolHoliday.endDate', 'DESC')
            .getMany();
    }

    public async allReleasedSchoolHolidays(): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayRepository
            .createQueryBuilder('schoolHoliday')
            .leftJoinAndSelect('schoolHoliday.period', 'period')
            .where('schoolHoliday.released = true')
            .andWhere('period.isPreviousPeriod = :isPreviousPeriod', { isPreviousPeriod: false })
            .orderBy('schoolHoliday.endDate', 'DESC')
            .getMany();
    }

    public async allSchoolHolidaysOfSchool(schoolId: string): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayRepository
            .createQueryBuilder('schoolHoliday')
            .leftJoin('schoolHoliday.schools', 'school')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('schoolHoliday.period.index = school.curentPeriod.index')
            .orderBy('schoolHoliday.endDate', 'DESC')
            .getMany();
    }

    public async allSchoolHolidaysOfSchoolForAdmin(schoolId: string): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayRepository
            .createQueryBuilder('schoolHoliday')
            .leftJoinAndSelect('schoolHoliday.schools', 'school')
            .where('school.id = :schoolId', { schoolId })
            .orderBy('schoolHoliday.endDate', 'DESC')
            .getMany();
    }

    public async getSchoolHoliday(id: string): Promise<LwpSchoolHoliday> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id } });

        if (!schoolHoliday) throw new HttpException('School holiday does not exist', ErrorStatusCodeEnum._535);

        return schoolHoliday;
    }

    public async getPeriodOfSchoolHoliday(id: string): Promise<StaticLwpPeriod> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id }, relations: ['period'] });

        if (!schoolHoliday) throw new HttpException('School holiday does not exist', ErrorStatusCodeEnum._535);

        return schoolHoliday?.period?.index ? schoolHoliday.period : null;
    }

    public async getSchoolsOfSchoolHoliday(id: string): Promise<LwpSchool[]> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id }, relations: ['schools'] });

        if (!schoolHoliday) throw new HttpException('School holiday does not exist', ErrorStatusCodeEnum._535);

        return schoolHoliday?.schools?.length > 0 ? schoolHoliday.schools : [];
    }

    public async hasSchoolsLinkedToSchoolHoliday(id: string): Promise<boolean> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id }, relations: ['schools'] });

        return schoolHoliday?.schools?.length > 0 ? true : false;
    }

    public async releaseHolidayToAllSchools(id: string, user: string | LwpUser): Promise<boolean> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id }, relations: ['schools', 'period'] });

        if (!schoolHoliday) throw new HttpException('School holiday does not exist', ErrorStatusCodeEnum._535);

        if (schoolHoliday?.schools?.length > 0)
            throw new HttpException('School holiday already released to schools', ErrorStatusCodeEnum._535);

        const schools = await this.schoolRepository.find();

        if (schools?.length > 0) {
            schoolHoliday.released = true;
            await this.schoolHolidayRepository.save(schoolHoliday);

            for (const school of schools) {
                await this.addSchoolHoliday(
                    {
                        holidayName: schoolHoliday?.holidayName,
                        startDate: schoolHoliday?.startDate,
                        endDate: schoolHoliday?.endDate,
                        periodIndex: schoolHoliday?.period?.index?.toString(),
                        schoolId: school?.id
                    },
                    user
                );
            }
        }

        return true;
    }

    public async deleteSchoolHoliday(id: string, deletedBy: string | LwpUser): Promise<OperationStatus> {
        const schoolHoliday = await this.schoolHolidayRepository.findOne({ where: { id } });

        if (!schoolHoliday) throw new HttpException('School holiday not exist', ErrorStatusCodeEnum._535);

        const res = await this.schoolHolidayRepository.update(id, { deletedBy: this.shallowUserService.newShallowUser(deletedBy) });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
