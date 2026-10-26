import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { StaticLwpWholeSchoolSequence } from './static_whole_school_sequence';

/**
 * These pin the entity's wiring rather than the authorizer's own logic, which has its own spec in
 * `AdminWriteAllRead.spec.ts`. What matters here is that a whole-school sequence is admin-write and
 * all-read like the topic sequences it is built from, and would not silently become writable by a
 * school if the decorator were changed.
 */
describe('StaticLwpWholeSchoolSequence', () => {
    describe('authorizer', () => {
        it('allows reads and writes from admins', async () => {
            expect(
                await StaticLwpWholeSchoolSequence.authorize({
                    id: null,
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.ADMIN })
                })
            ).toEqual('*');
            expect(
                await StaticLwpWholeSchoolSequence.authorize({
                    id: null,
                    opType: OpType.Write,
                    token: mockJwtAuthToken(1, { userType: UserType.ADMIN })
                })
            ).toEqual('*');
        });

        /*
         * Readable by everyone, because from slice 4 a school leader is shown what a published one
         * would give their school. Writable by nobody else: it is global static content, so a school
         * editing one would be editing what every other school is offered.
         */
        it.each(Object.entries(UserType).filter(([, userType]) => userType !== UserType.ADMIN))(
            'allows reads but denies writes from %s',
            async (_, userType) => {
                expect(
                    await StaticLwpWholeSchoolSequence.authorize({
                        id: null,
                        opType: OpType.Read,
                        token: mockJwtAuthToken(1, { userType })
                    })
                ).toEqual('*');
                expect(
                    await StaticLwpWholeSchoolSequence.authorize({
                        id: null,
                        opType: OpType.Write,
                        token: mockJwtAuthToken(1, { userType })
                    })
                ).toBe(false);
            }
        );
    });
});
