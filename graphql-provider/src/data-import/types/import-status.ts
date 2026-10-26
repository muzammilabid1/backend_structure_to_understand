import { registerEnumType } from '@nestjs/graphql';
import { ImportStatus } from 'lwp-shared';

export { ImportStatus };

registerEnumType(ImportStatus, {
    name: 'ImportStatus'
});
