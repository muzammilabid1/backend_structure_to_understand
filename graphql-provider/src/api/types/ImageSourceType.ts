import { registerEnumType } from '@nestjs/graphql';
import { ImageSourceType } from 'lwp-shared';

export { ImageSourceType };

registerEnumType(ImageSourceType, {
    name: 'ImageSourceType'
});
