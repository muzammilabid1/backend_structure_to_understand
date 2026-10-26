import { BaseEntity } from 'typeorm';

import { ObjectAuthorizer } from '../auth.object.decorators';

/**
 * A BaseAuthorizerEntity is a TypeORM {@link BaseEntity} that implements an {@link ObjectAuthorizer}.
 */
export abstract class BaseAuthorizerEntity extends BaseEntity {
    static authorize: ObjectAuthorizer<InstanceType<never>> = function <T extends typeof BaseAuthorizerEntity>(this: T) {
        throw new Error('Authorizer entities must have a defined `authorize` method. Define this method to continue.');
    };
}
