import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';
import { OpType } from '../types/OpType';

/**
 * TeacherWriteAllRead is an {@link ObjectAuthorizer} function that allows
 * teachers and admins to both read and write a resource, and all other
 * user types only to read.
 */
export const TeacherWriteAllRead: ObjectAuthorizer<unknown> = ({ opType, token }) => {
    if (opType === OpType.Read) return '*';

    if ([UserType.ADMIN, UserType.TEACHER].includes(token.userType)) return '*';

    return false;
};
