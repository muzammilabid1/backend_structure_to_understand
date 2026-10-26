import { registerEnumType } from '@nestjs/graphql';
import { ChangeOperation } from 'lwp-shared';

export { ChangeOperation };

registerEnumType(ChangeOperation, {
    name: 'ChangeOperation'
});
