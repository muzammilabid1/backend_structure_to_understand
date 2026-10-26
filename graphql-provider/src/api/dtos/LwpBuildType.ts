import { registerEnumType } from '@nestjs/graphql';

export enum LwpBuildType {
    PRODUCTION = 'production',
    STAGE = 'stage',
    DEV = 'dev',
    LOCAL = 'local'
}

registerEnumType(LwpBuildType, {
    name: 'LwpBuildType'
});
