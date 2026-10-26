import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';
import { OpType } from '../types/OpType';

export const PublicCreate: ObjectAuthorizer<unknown> = ({ id, token, opType }) => {
    // Allow access for admins
    if (token.userType === UserType.ADMIN) return '*';

    // Deny access for everyone else except to create new ones
    return id === null && opType === OpType.Write ? '*' : false;
};
