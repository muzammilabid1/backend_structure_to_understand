import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { AdminWriteAllRead } from './AdminWriteAllRead';

describe('AdminWriteAllRead', () => {
    it.each(Object.entries(UserType))('allows reads from %s', (_, userType) => {
        expect(AdminWriteAllRead({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toEqual('*');
    });

    it('allows writes from admins', () => {
        expect(AdminWriteAllRead({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual(
            '*'
        );
    });

    it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies writes from %s', (_, userType) => {
        expect(AdminWriteAllRead({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
    });
});
