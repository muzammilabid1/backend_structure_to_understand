import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { LogSchoolClassLicense } from '../entities/log_school_class_license';
import { LwpUser } from '../entities/user';
import { LogSchoolClassLicenseService } from '../service/log_class_license.service';

@Resolver(() => LogSchoolClassLicense)
export class LogSchoolClassLicenseResolver {
    constructor(private schoolClassLicenceService: LogSchoolClassLicenseService) {}

    @ResolveField()
    async logCreatedBy(@Parent() log: LogSchoolClassLicense): Promise<LwpUser> {
        return await this.schoolClassLicenceService.logCreatedBy(log.id);
    }
}
