import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';

/**
 * TeacherOnly is an {@link ObjectAuthorizer} that allows
 * teachers to both read and write a resource, and denies access to
 * all other user types (except admins).
 */
export const TeacherOnly: ObjectAuthorizer<unknown> = ({ token }) => {
    return [UserType.ADMIN, UserType.TEACHER].includes(token.userType) ? '*' : false;
};
