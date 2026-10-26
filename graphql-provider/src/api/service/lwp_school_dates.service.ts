import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ImpactReportVersion, SchoolImpactReportType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { SchoolTermsForSchoolImpactReportOutput } from '../dtos/SchoolTermsForSchoolImpactReportOutput';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { StaticLwpPeriod } from '../entities/static_period';
import { AddSchoolDateInput, ErrorStatusCodeEnum, OperationStatus, UpdateSchoolDateInput } from '../model';

@Injectable()
export class LwpSchoolDatesService {
    constructor(
        @InjectRepository(LwpSchoolDates)
        private schoolDatesRepository: Repository<LwpSchoolDates>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addSchoolDate(input: AddSchoolDateInput, userId: string): Promise<LwpSchoolDates> {
        const user = this.shallowUserService.newShallowUser(userId);
        const schoolDate = new LwpSchoolDates();
        const { termName, endDate, startDate, periodIndex } = input;

        schoolDate.termName = termName;
        schoolDate.endDate = endDate;
        schoolDate.startDate = startDate;
        schoolDate.logCreatedBy = user;
        schoolDate.logUpdatedBy = user;
        schoolDate.period = { index: periodIndex } as StaticLwpPeriod;

        return this.schoolDatesRepository.save(schoolDate);
    }

    public async updateSchoolDate(input: UpdateSchoolDateInput, userId: string): Promise<LwpSchoolDates> {
        const user = this.shallowUserService.newShallowUser(userId);
        const schoolDate = await this.schoolDatesRepository.findOne({ where: { id: input?.id }, relations: ['logCreatedBy'] });

        if (!schoolDate) throw new HttpException('School Date does not exist', ErrorStatusCodeEnum._535);

        const { termName, startDate, endDate, periodIndex } = input;

        schoolDate.termName = termName;
        schoolDate.startDate = startDate;
        schoolDate.endDate = endDate;
        schoolDate.logUpdatedBy = user;
        schoolDate.period = { index: periodIndex } as StaticLwpPeriod;

        return this.schoolDatesRepository.save(schoolDate);
    }

    public async allSchoolDates(): Promise<LwpSchoolDates[]> {
        return await this.schoolDatesRepository.find({ order: { endDate: 'DESC' } });
    }

    public async getSchoolDate(id: string): Promise<LwpSchoolDates> {
        const schoolDate = await this.schoolDatesRepository.findOne({ where: { id } });

        if (!schoolDate) throw new HttpException('School Date does not exist', ErrorStatusCodeEnum._535);

        return schoolDate;
    }

    public async getTermsForSchoolImpactReport(schoolId: string): Promise<SchoolTermsForSchoolImpactReportOutput[]> {
        return await this.schoolDatesRepository
            .createQueryBuilder('d')
            .leftJoin('d.impactReports', 'r')
            .leftJoin('r.school', 's')
            .where('r.isPublished = :isPublished', { isPublished: true })
            .andWhere('s.id = :schoolId', { schoolId })
            .select([
                'd.id as "id"',
                'd."termName" as "termName"',
                'd."endDate" as "endDate"',
                // hasTopicAndActivityReport and hasReadingReport refer to V1 report types
                `bool_or(r."reportType" = '${SchoolImpactReportType.TOPIC_ACTIVITY}' AND r."isPublished" = true) AS "hasTopicAndActivityReport"`,
                `bool_or(r."reportType" = '${SchoolImpactReportType.READING}' AND r."isPublished" = true) AS "hasReadingReport"`,
                `bool_or(r."version" = '${ImpactReportVersion.VERSION_2}' AND r."isPublished" = true) AS "hasVersion2Report"`
            ])
            .orderBy('d."endDate"', 'DESC')
            .groupBy('d.id')
            .getRawMany<{
                id: string;
                termName: string;
                hasTopicAndActivityReport: boolean;
                hasReadingReport: boolean;
                hasVersion2Report: boolean;
            }>();
    }

    public async getAllTermsForSchoolImpactReport(): Promise<LwpSchoolDates[]> {
        return await this.schoolDatesRepository
            .createQueryBuilder('d')
            .where('d.endDate < :date', { date: new Date() })
            .orderBy('d."endDate"', 'DESC')
            .getMany();
    }

    public async getCurrentSchoolTerm(): Promise<LwpSchoolDates> {
        let latestTerm: LwpSchoolDates = null;
        const today: Date = new Date();
        const schoolTerms = await this.schoolDatesRepository.find();

        for (const term of schoolTerms) {
            if (term?.startDate <= today && term?.endDate >= today) {
                return term;
            }

            if (term?.startDate <= today && (latestTerm == null || latestTerm?.startDate < term.startDate)) {
                latestTerm = term;
            }
        }

        return latestTerm;
    }

    public async deleteSchoolDate(id: string): Promise<OperationStatus> {
        const res = await this.schoolDatesRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
