import { registerEnumType } from '@nestjs/graphql';
import { EntityType } from 'lwp-shared';

export { EntityType };

registerEnumType(EntityType, {
    name: 'EntityType'
});
