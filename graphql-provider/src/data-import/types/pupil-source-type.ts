import { registerEnumType } from '@nestjs/graphql';
import { PupilSourceType } from 'lwp-shared';

export { PupilSourceType };

registerEnumType(PupilSourceType, {
    name: 'PupilSourceType'
});
