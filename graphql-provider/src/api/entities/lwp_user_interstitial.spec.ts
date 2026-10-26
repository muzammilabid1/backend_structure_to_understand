import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LwpUserInterstitial } from './lwp_user_interstitial';
import { LwpSchool } from './school';
import { LwpUser } from './user';

describe('LwpUserInterstitial', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpUser, LwpUserInterstitial);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('authorize', () => {
        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpSchool.authorize({ id: null, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpSchool.authorize({ id: null, opType: OpType.Write, token })).toEqual('*');
        });

        it('allows access for own user', async () => {
            const user = dbMocks.mockParent();
            const interstitial = dbMocks.mockUserInterstitial(user);

            const token = mockJwtAuthToken(user.id, { userType: UserType.PARENT });

            expect(await LwpUserInterstitial.authorize({ id: interstitial.id, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpUserInterstitial.authorize({ id: interstitial.id, opType: OpType.Write, token })).toEqual('*');
        });

        it('denies access for other user', async () => {
            const user = dbMocks.mockParent();
            const interstitial = dbMocks.mockUserInterstitial(user);

            const token = mockJwtAuthToken(user.id + 1, { userType: UserType.PARENT });

            expect(await LwpUserInterstitial.authorize({ id: interstitial.id, opType: OpType.Read, token })).toBe(false);
            expect(await LwpUserInterstitial.authorize({ id: interstitial.id, opType: OpType.Write, token })).toBe(false);
        });
    });
});
