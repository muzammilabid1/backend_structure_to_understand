import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { AdminOnly } from './AdminOnly';

describe('AdminOnly', () => {
    it('allows reads and writes from admins', () => {
        expect(AdminOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual('*');
        expect(AdminOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual('*');
    });

    it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies reads and writes from %s', (_, userType) => {
        expect(AdminOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
        expect(AdminOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
    });
});
