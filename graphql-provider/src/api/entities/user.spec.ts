import { LwpPupil } from 'src/api/entities/pupil';
import { LwpSchool } from 'src/api/entities/school';
import { LwpUser } from 'src/api/entities/user';
import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LwpPupilParent } from './pupil_parent';

describe('LwpUser', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpUser, LwpPupilParent, LwpSchool);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('authorize', () => {
        let school: LwpSchool;
        let child: LwpPupil;
        let parent: LwpUser;

        beforeEach(() => {
            school = dbMocks.mockSchool();
            child = dbMocks.mockPupil(school);
            parent = dbMocks.mockParent({ pupils: [child] });
        });

        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(parent.id + 5, { userType: UserType.ADMIN });

            expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Read })).toEqual('*');
            expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Write })).toEqual('*');
        });

        describe('for teachers', () => {
            let token: AuthTokenJWT;

            beforeEach(() => {
                token = mockJwtAuthToken(parent.id + 5, { userType: UserType.TEACHER, schoolId: school.id });
            });

            describe('accessing parents', () => {
                describe('where parents have children in only that school', () => {
                    it("allows read access for teachers in a school with a parent's child in", async () => {
                        expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Read })).toEqual('*');
                    });
                    it('allows access for teachers in a school to edit iff that parent has children in only that school', async () => {
                        expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Write })).toEqual('*');
                    });
                });

                describe('where parents have children in multiple schools', () => {
                    beforeEach(() => {
                        const school2 = dbMocks.mockSchool();
                        const pupil2 = dbMocks.mockPupil(school2);

                        dbMocks.mockPupilParent(pupil2, parent);
                    });

                    it('allows read access for teachers in any of the schools', async () => {
                        expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Read })).toEqual('*');
                    });

                    it('denies write access for teachers', async () => {
                        expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Write })).toBe(false);
                    });
                });

                it('denies access for teachers in other schools', async () => {
                    const token = mockJwtAuthToken(parent.id + 5, { userType: UserType.TEACHER, schoolId: school.id + 1 });

                    expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Read })).toBe(false);
                    expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Write })).toBe(false);
                });
            });

            describe('accessing teachers', () => {
                let teacher: LwpUser;

                beforeEach(() => {
                    teacher = dbMocks.mockTeacher();
                });

                it('denies access to teachers in other schools', async () => {
                    const token = mockJwtAuthToken(parent.id + 5, { userType: UserType.TEACHER, schoolId: teacher.school.id + 1 });

                    expect(await LwpUser.authorize({ id: teacher.id, token, opType: OpType.Read })).toBe(false);
                    expect(await LwpUser.authorize({ id: teacher.id, token, opType: OpType.Write })).toBe(false);
                });

                it('allows access to teachers in the same school to read', async () => {
                    const token = mockJwtAuthToken(parent.id + 5, { userType: UserType.TEACHER, schoolId: teacher.school.id });

                    expect(await LwpUser.authorize({ id: teacher.id, token, opType: OpType.Read })).toEqual('*');
                });

                it('denies access to non-leader teachers in the same school to write', async () => {
                    const token = mockJwtAuthToken(parent.id + 5, { userType: UserType.TEACHER, schoolId: teacher.school.id });

                    expect(await LwpUser.authorize({ id: teacher.id, token, opType: OpType.Write })).toBe(false);
                });

                it('allows access to leaders in the same school to write', async () => {
                    const token = mockJwtAuthToken(parent.id + 5, {
                        userType: UserType.TEACHER,
                        schoolId: teacher.school.id,
                        isSchoolLeader: true
                    });

                    expect(await LwpUser.authorize({ id: teacher.id, token, opType: OpType.Write })).toEqual('*');
                });
            });
        });

        it('allows access for the parent themselves', async () => {
            const token = mockJwtAuthToken(parent.id, { userType: UserType.PARENT });

            expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Read })).toEqual('*');
            expect(await LwpUser.authorize({ id: parent.id, token, opType: OpType.Write })).toEqual('*');
        });

        it('denies access for other parents', async () => {
            const token = mockJwtAuthToken(parent.id, { userType: UserType.PARENT });

            expect(await LwpUser.authorize({ id: parent.id + parent.id + 5, token, opType: OpType.Read })).toBe(false);
            expect(await LwpUser.authorize({ id: parent.id + parent.id + 5, token, opType: OpType.Write })).toBe(false);
        });

        it.each(Object.entries(UserType).filter(([, type]) => ![UserType.ADMIN, UserType.TEACHER, UserType.PARENT].includes(type)))(
            'denies access for %s',
            async (_, userType) => {
                const token = mockJwtAuthToken(parent.id + 5, { userType });

                expect(await LwpUser.authorize({ id: '7', token, opType: OpType.Read })).toBe(false);
                expect(await LwpUser.authorize({ id: '7', token, opType: OpType.Write })).toBe(false);
            }
        );
    });
});
