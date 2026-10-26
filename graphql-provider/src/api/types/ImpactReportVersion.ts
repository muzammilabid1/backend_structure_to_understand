import { registerEnumType } from '@nestjs/graphql';
import { ImpactReportVersion } from 'lwp-shared';

export { ImpactReportVersion };

registerEnumType(ImpactReportVersion, {
    name: 'ImpactReportVersion'
});
