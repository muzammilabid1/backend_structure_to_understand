import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';
import { OpType } from '../types/OpType';

/**
 * AdminWriteAllRead is an {@link ObjectAuthorizer} function that allows
 * admins to both read and write a resource, and all other user types
 * only to read.
 */
export const AdminWriteAllRead: ObjectAuthorizer<unknown> = ({ opType, token }) => {
    if (opType === OpType.Read) return '*'; // any user of any class can read an Activity

    if (token.userType === UserType.ADMIN) return '*'; // only admins can edit

    return false;
};
