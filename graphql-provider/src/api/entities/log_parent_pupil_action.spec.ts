import { randomInt } from 'crypto';
import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LogParentPupilAction } from './log_parent_pupil_action';

describe('LogParentPupilAction', () => {
    describe('authorize', () => {
        it('allows reads and writes by admins', () => {
            expect(
                LogParentPupilAction.authorize({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })
            ).toEqual('*');
            expect(
                LogParentPupilAction.authorize({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })
            ).toEqual('*');
        });

        it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))(
            'allows writes to create new objects with matching IDs by %s',
            (_, userType) => {
                expect(
                    LogParentPupilAction.authorize({
                        id: null,
                        opType: OpType.Write,
                        token: mockJwtAuthToken(1, { userType }),
                        parentId: '1'
                    })
                ).toEqual('*');
            }
        );

        it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies other user creates by %s', (_, userType) => {
            expect(
                LogParentPupilAction.authorize({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }), parentId: '7' })
            ).toBe(false);
        });

        it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies other writes by %s', (_, userType) => {
            expect(
                LogParentPupilAction.authorize({
                    id: randomInt(10_000).toString(),
                    opType: OpType.Write,
                    token: mockJwtAuthToken(1, { userType })
                })
            ).toBe(false);
        });

        it.each(Object.entries(UserType).filter(([, uT]) => uT !== UserType.ADMIN))('denies reads by %s', (_, userType) => {
            expect(
                LogParentPupilAction.authorize({
                    id: randomInt(10_000).toString(),
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType })
                })
            ).toBe(false);
        });
    });
});
