import { registerEnumType } from '@nestjs/graphql';
import { BlankCertificateType } from 'lwp-shared';

export { BlankCertificateType };

registerEnumType(BlankCertificateType, {
    name: 'BlankCertificateType'
});
