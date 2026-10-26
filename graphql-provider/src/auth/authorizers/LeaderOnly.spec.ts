import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LeaderOnly } from './LeaderOnly';

describe('LeaderOnly', () => {
    it('allows reads and writes from admins', () => {
        expect(LeaderOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual('*');
        expect(LeaderOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual('*');
    });

    it('allows reads and writes from leaders', () => {
        expect(
            LeaderOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.TEACHER, isSchoolLeader: true }) })
        ).toEqual('*');
        expect(
            LeaderOnly({
                id: null,
                opType: OpType.Write,
                token: mockJwtAuthToken(1, { userType: UserType.TEACHER, isSchoolLeader: true })
            })
        ).toEqual('*');
    });

    it('denies reads and writes from non-leader teachers', () => {
        expect(LeaderOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.TEACHER }) })).toEqual(false);
        expect(LeaderOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.TEACHER }) })).toEqual(false);
    });

    it.each(Object.entries(UserType).filter(([, uT]) => ![UserType.ADMIN, UserType.TEACHER].includes(uT)))(
        'denies reads and writes from %s',
        (_, userType) => {
            expect(LeaderOnly({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
            expect(LeaderOnly({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(false);
        }
    );
});
