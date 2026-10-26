import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';

/**
 * LeaderOnly is an {@link ObjectAuthorizer} that allows
 * school leaders to both read and write a resource, and denies access to
 * all other user types (except admins).
 */
export const LeaderOnly: ObjectAuthorizer<unknown> = ({ token }) => {
    return token.userType === UserType.ADMIN || (token.userType === UserType.TEACHER && token.isSchoolLeader === true) ? '*' : false;
};
