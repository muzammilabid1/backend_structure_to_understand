import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LwpUserPageAnnouncement } from './lwp_user_page_announcement';
import { LwpUser } from './user';

describe('LwpUserPageAnnouncement', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpUser, LwpUserPageAnnouncement);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('authorize', () => {
        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpUserPageAnnouncement.authorize({ id: null, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpUserPageAnnouncement.authorize({ id: null, opType: OpType.Write, token })).toEqual('*');
        });

        it('allows access for own user', async () => {
            const user = dbMocks.mockParent();
            const lwpUserPageAnnouncement = dbMocks.mockUserPageAnnouncement(user);

            const token = mockJwtAuthToken(user.id, { userType: UserType.PARENT });

            expect(await LwpUserPageAnnouncement.authorize({ id: lwpUserPageAnnouncement.id, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpUserPageAnnouncement.authorize({ id: null, opType: OpType.Write, token, parentId: user.id })).toEqual('*');
        });

        it('denies access for other user', async () => {
            const user = dbMocks.mockParent();
            const lwpUserPageAnnouncement = dbMocks.mockUserPageAnnouncement(user);

            const token = mockJwtAuthToken(user.id + 1, { userType: UserType.PARENT });

            expect(await LwpUserPageAnnouncement.authorize({ id: lwpUserPageAnnouncement.id, opType: OpType.Read, token })).toBe(false);
            expect(await LwpUserPageAnnouncement.authorize({ id: null, opType: OpType.Write, token, parentId: user.id })).toBe(false);
        });
    });
});
