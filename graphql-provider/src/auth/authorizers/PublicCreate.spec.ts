import { randomInt } from 'crypto';
import { UserType } from 'src/auth/types/UserType';

import { mockJwtAuthToken } from '../__utils__/AuthMocks';
import { OpType } from '../types/OpType';
import { PublicCreate } from './PublicCreate';

describe('PublicCreate', () => {
    it('allows reads and writes by admins', () => {
        expect(PublicCreate({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual('*');
        expect(PublicCreate({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })).toEqual('*');
    });

    it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))(
        'allows writes to create new objects by %s',
        (_, userType) => {
            expect(PublicCreate({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toEqual('*');
        }
    );

    it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies other writes by %s', (_, userType) => {
        expect(PublicCreate({ id: randomInt(10_000).toString(), opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(
            false
        );
    });

    it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies reads by %s', (_, userType) => {
        expect(PublicCreate({ id: randomInt(10_000).toString(), opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })).toBe(
            false
        );
    });
});
