import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { ImportedSchool } from './imported_school';
import { LwpSchool } from './school';

describe('ImportedSchool', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, ImportedSchool);

        dbMocks = new DbMocks(mockedRepos);
    });

    let is: ImportedSchool;
    let ls: LwpSchool;
    const lsAuthSpy = jest.spyOn(LwpSchool, 'authorize');

    beforeEach(() => {
        mockedRepos.clearAll();
        dbMocks.mockSchool(); // to make sure the IDs in the two repos are different
        ls = dbMocks.mockSchool();
        is = dbMocks.mockImportedSchool(ls);
    });

    describe('authorize', () => {
        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await ImportedSchool.authorize({ id: is.id, opType: OpType.Read, token })).toEqual('*');
            expect(await ImportedSchool.authorize({ id: is.id, opType: OpType.Write, token })).toEqual('*');

            expect(lsAuthSpy).not.toHaveBeenCalled();
        });

        it('delegates auth decisions for teachers to the relevant school', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId: ls.id });

            lsAuthSpy.mockReturnValue('*');
            expect(await ImportedSchool.authorize({ id: is.id, opType: OpType.Read, token })).toEqual('*');

            expect(lsAuthSpy).toHaveBeenCalledWith({ id: ls.id, opType: OpType.Read, token });

            lsAuthSpy.mockReturnValue(false);
            expect(await ImportedSchool.authorize({ id: is.id, opType: OpType.Read, token })).toBe(false);
        });

        it.each(Object.entries(UserType).filter(([, type]) => ![UserType.ADMIN, UserType.TEACHER].includes(type)))(
            'denies access for %s',
            async (_, userType) => {
                const token = mockJwtAuthToken(1, { userType });

                expect(await ImportedSchool.authorize({ id: is.id, opType: OpType.Read, token })).toBe(false);
                expect(await ImportedSchool.authorize({ id: is.id, opType: OpType.Write, token })).toBe(false);
            }
        );
    });
});
