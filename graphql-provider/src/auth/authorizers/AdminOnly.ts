import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';

/**
 * AdminOnly is an {@link ObjectAuthorizer} that allows
 * admins to both read and write a resource, and denies access to
 * all other user types.
 */
export const AdminOnly: ObjectAuthorizer<unknown> = ({ token }) => {
    return token.userType === UserType.ADMIN ? '*' : false;
};
