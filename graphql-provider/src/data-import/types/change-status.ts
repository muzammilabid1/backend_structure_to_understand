import { registerEnumType } from '@nestjs/graphql';
import { ChangeStatus } from 'lwp-shared';

export { ChangeStatus };

registerEnumType(ChangeStatus, {
    name: 'ChangeStatus'
});
