import { Injectable } from '@nestjs/common';
import { LwpUser } from 'src/api/entities/user';

@Injectable()
export class ShallowUserService {
    /**
     * Assembles a "shallow user" - a non-hydrated and non-persisted
     * user object containing only an ID - either from an ID or from
     * an existing user object. Useful for TypeORM to be able to
     * save entities without loading whole relations.
     *
     * @param {(LwpUser | string)} userOrId the {@link LwpUser} or ID of the user to shallow-create
     * @return {LwpUser} the shallow User object
     * @memberof ShallowUserService
     */
    newShallowUser(userOrId: LwpUser | string): LwpUser {
        const shallowUser = new LwpUser();

        shallowUser.id = typeof userOrId === 'string' ? userOrId : userOrId.id;

        return shallowUser;
    }
}
