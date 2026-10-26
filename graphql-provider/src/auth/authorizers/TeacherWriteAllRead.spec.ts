import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { TeacherWriteAllRead } from './TeacherWriteAllRead';

describe('TeacherWriteAllRead', () => {
    it.each(Object.entries(UserType))('allows reads from %s', (_, userType) => {
        expect(TeacherWriteAllRead({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toEqual('*');
    });

    it('allows writes from admins', () => {
        expect(TeacherWriteAllRead({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual(
            '*'
        );
    });

    it('allows writes from teachers', () => {
        expect(TeacherWriteAllRead({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.TEACHER }) })).toEqual(
            '*'
        );
    });

    it.each(Object.entries(UserType).filter(([, uT]) => ![UserType.ADMIN, UserType.TEACHER].includes(uT)))(
        'denies writes from %s',
        (_, userType) => {
            expect(TeacherWriteAllRead({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
        }
    );
});
