import { LwpPupil } from 'src/api/entities/pupil';
import { LwpPupilParent } from 'src/api/entities/pupil_parent';
import { LwpSchool } from 'src/api/entities/school';
import { LwpUser } from 'src/api/entities/user';
import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { ObjectAuthorizer } from '../auth.object.decorators';
import { Delegate } from './Delegate';

describe('Delegated authorization', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpUser, LwpPupilParent);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    let school: LwpSchool;
    let child: LwpPupil;
    let parent: LwpUser;

    beforeEach(() => {
        school = dbMocks.mockSchool();
        child = dbMocks.mockPupil(school);
        parent = dbMocks.mockParent({ pupils: [child] });
    });

    const delegatedAuthorizer: ObjectAuthorizer<unknown> = Delegate(() => LwpUser, 'parent');
    const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

    const userSpy = jest.spyOn(LwpUser, 'authorize').mockReturnValue('*');

    it('delegates with appropriate IDs', async () => {
        expect(
            await (delegatedAuthorizer.bind(LwpPupilParent) as ObjectAuthorizer<unknown>)({
                id: parent.pupils[0].id,
                opType: OpType.Read,
                token
            })
        ).toEqual('*');

        expect(userSpy).toHaveBeenCalledWith({ id: parent.id, opType: OpType.Read, token });
    });

    it('delegates with appropriate IDs for creations', async () => {
        expect(
            await (delegatedAuthorizer.bind(LwpPupilParent) as ObjectAuthorizer<unknown>)({
                id: null,
                opType: OpType.Write,
                token,
                parentId: parent.id
            })
        ).toEqual('*');

        expect(userSpy).toHaveBeenCalledWith({ id: parent.id, opType: OpType.Write, token });
    });
});
