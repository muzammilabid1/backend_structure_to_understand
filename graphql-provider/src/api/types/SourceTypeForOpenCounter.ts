import { registerEnumType } from '@nestjs/graphql';
import { SourceTypeForOpenCounter } from 'lwp-shared';

export { SourceTypeForOpenCounter };

registerEnumType(SourceTypeForOpenCounter, {
    name: 'SourceTypeForOpenCounter'
});
