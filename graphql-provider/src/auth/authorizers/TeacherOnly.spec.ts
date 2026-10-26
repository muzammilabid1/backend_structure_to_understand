import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { TeacherOnly } from './TeacherOnly';

const ALLOWED_USER_TYPES = [UserType.ADMIN, UserType.TEACHER];

describe('TeacherOnly', () => {
    it.each(ALLOWED_USER_TYPES)('allows reads and writes from %s', (userType) => {
        expect(TeacherOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toEqual('*');
        expect(TeacherOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toEqual('*');
    });

    it.each(Object.entries(UserType).filter(([, uT]) => !ALLOWED_USER_TYPES.includes(uT)))(
        'denies reads and writes from %s',
        (_, userType) => {
            expect(TeacherOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
            expect(TeacherOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
        }
    );
});
