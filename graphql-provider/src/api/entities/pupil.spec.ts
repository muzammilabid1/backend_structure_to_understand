import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LwpPupil } from './pupil';
import { LwpPupilParent } from './pupil_parent';
import { LwpSchool } from './school';
import { LwpUser } from './user';

describe('LwpPupil', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpUser, LwpPupil, LwpSchool, LwpPupilParent);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('authorize', () => {
        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpPupil.authorize({ id: null, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpPupil.authorize({ id: null, opType: OpType.Write, token })).toEqual('*');
        });

        it('allows access for teacher in the same school', async () => {
            const school = dbMocks.mockSchool();
            const pupil = dbMocks.mockPupil(school);
            const teacher = dbMocks.mockTeacher({ school });

            const token = mockJwtAuthToken(teacher.id, { userType: UserType.TEACHER, schoolId: school.id });

            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Write, token })).toEqual('*');
        });

        it('denies access for teacher in a different school', async () => {
            const school = dbMocks.mockSchool();
            const pupil = dbMocks.mockPupil(school);
            const teacher = dbMocks.mockTeacher();

            const token = mockJwtAuthToken(teacher.id, { userType: UserType.TEACHER, schoolId: teacher.school.id });

            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Read, token })).toBe(false);
            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Write, token })).toBe(false);
        });

        it('allows access for parent of the child', async () => {
            const school = dbMocks.mockSchool();
            const pupil = dbMocks.mockPupil(school);
            const parent = dbMocks.mockParent({ pupils: [pupil] });

            const token = mockJwtAuthToken(parent.id, { userType: UserType.PARENT });

            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Write, token })).toEqual('*');
        });

        it('denies access for different parent', async () => {
            const school = dbMocks.mockSchool();
            const pupil = dbMocks.mockPupil(school);
            const parent = dbMocks.mockParent();

            const token = mockJwtAuthToken(parent.id, { userType: UserType.PARENT });

            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Read, token })).toBe(false);
            expect(await LwpPupil.authorize({ id: pupil.id, opType: OpType.Write, token })).toBe(false);
        });
    });
});
