import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';

import { LogSchoolClassLicense } from '../entities/log_school_class_license';
import { LwpSchool } from '../entities/school';
import { LwpUser } from '../entities/user';
import { LogSchoolClassLicenseInput } from '../model';

@Injectable()
export class LogSchoolClassLicenseService {
    constructor(
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LogSchoolClassLicense)
        private logSchoolClassLicenseRepository: Repository<LogSchoolClassLicense>
    ) {}

    async addLogSchoolClassLicense(
        logClassLicense: LogSchoolClassLicenseInput,
        user?: LwpUser,
        schoolPeriodIndex?: string,
        manager?: EntityManager
    ): Promise<LogSchoolClassLicense> {
        const {
            fullProgrammeClassCount,
            totalClassCount,
            totalPrice,
            schoolId,
            fullProgrammeClassPrice,
            operationType,
            readingOnlyClassPrice,
            requestedFullProgrammeClassCount,
            requestedReadingOnlyClassCount,
            requestedUpgradeClassCount,
            readyTeddyClassPrice,
            requestedReadyTeddyClassCount,
            readyTeddyClassCount
        } = logClassLicense;

        const school = await (manager?.getRepository(LwpSchool) ?? this.schoolRepository).findOne({ where: { id: schoolId } });

        const log = new LogSchoolClassLicense();

        log.school = school;
        log.fullProgrammeClassCount = fullProgrammeClassCount;
        log.readyTeddyClassCount = readyTeddyClassCount;
        log.totalClassCount = totalClassCount;
        log.operationType = operationType;
        log.requestedFullProgrammeClassCount = requestedFullProgrammeClassCount;
        log.requestedReadingOnlyClassCount = requestedReadingOnlyClassCount;
        log.requestedUpgradeClassCount = requestedUpgradeClassCount;
        log.fullProgrammeClassPrice = fullProgrammeClassPrice;
        log.readingOnlyClassPrice = readingOnlyClassPrice;
        log.totalPrice = totalPrice;
        log.schoolPeriod = schoolPeriodIndex ?? school?.periodIndex?.toString() ?? null;
        log.readyTeddyClassPrice = readyTeddyClassPrice;
        log.requestedReadyTeddyClassCount = requestedReadyTeddyClassCount;

        if (user) {
            log.logCreatedBy = user;
            log.logUpdatedBy = user;
        }

        return (manager?.getRepository(LogSchoolClassLicense) ?? this.logSchoolClassLicenseRepository).save(log);
    }

    async logCreatedBy(logId: string): Promise<LwpUser> {
        const log = await this.logSchoolClassLicenseRepository.findOne({ where: { id: logId }, relations: ['logCreatedBy'] });

        return log?.logCreatedBy;
    }
}
