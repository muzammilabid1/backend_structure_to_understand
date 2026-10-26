import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LwpPupilParent } from './pupil_parent';
import { LwpSchool } from './school';
import { LwpUser } from './user';

describe('LwpSchool', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpUser, LwpPupilParent, LwpSchool);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('canAccessSchool', () => {
        const schoolId = '1';

        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpSchool.authorize({ id: schoolId, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpSchool.authorize({ id: schoolId, opType: OpType.Write, token })).toEqual('*');
        });

        it('allows read access for teachers in that school', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId });

            expect(await LwpSchool.authorize({ id: schoolId, opType: OpType.Read, token })).toEqual('*');
        });
        it('denies access for teachers in other schools', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId: schoolId + 1 });

            expect(await LwpSchool.authorize({ id: schoolId, opType: OpType.Read, token })).toBe(false);
        });
        it('allows write access for leaders in that school', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId, isSchoolLeader: true });

            expect(await LwpSchool.authorize({ id: schoolId, opType: OpType.Write, token })).toEqual('*');
        });
        it('denies write access for non-leader teachers in that school', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId });

            expect(await LwpSchool.authorize({ id: schoolId, opType: OpType.Write, token })).toBe(false);
        });

        it('allows read access for relevant parents', async () => {
            const school = dbMocks.mockSchool();
            const pupil = dbMocks.mockPupil(school);
            const parent = dbMocks.mockParent({ pupils: [pupil] });

            const token = mockJwtAuthToken(parent.id, { userType: UserType.PARENT, pupilIds: [pupil.id] });

            expect(await LwpSchool.authorize({ id: school.id, opType: OpType.Read, token })).toEqual('*');
        });

        it('denies write access for irrelevant parents', async () => {
            const school = dbMocks.mockSchool();
            const parent2 = dbMocks.mockParent({ pupils: [] });

            const token = mockJwtAuthToken(parent2.id, { userType: UserType.PARENT, pupilIds: [] });

            expect(await LwpSchool.authorize({ id: school.id, opType: OpType.Read, token })).toBe(false);
        });

        it.each(Object.entries(UserType).filter(([, type]) => ![UserType.ADMIN, UserType.TEACHER].includes(type)))(
            'denies write access for %s',
            async (_, userType) => {
                const token = mockJwtAuthToken(1, { userType });

                expect(await await LwpSchool.authorize({ id: schoolId, opType: OpType.Write, token })).toBe(false);
            }
        );
    });
});
