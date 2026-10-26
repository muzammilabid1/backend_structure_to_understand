import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { SelectQueryBuilder } from 'typeorm';

import { LwpPupilTag } from './lwp_pupil_tag';
import { LwpSchool } from './school';
import { LwpUser } from './user';

describe('LwpPupilTag', () => {
    let dbMocks: DbMocks;
    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpPupilTag, LwpSchool, LwpUser);
        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => {
        mockedRepos.clearAll();
        jest.restoreAllMocks();
    });

    function createLeaderToken(leader: LwpUser): AuthTokenJWT {
        return mockJwtAuthToken(leader.id, {
            userType: UserType.TEACHER,
            isSchoolLeader: leader.isSchoolLeader,
            schoolId: leader.school.id
        });
    }

    function mockPupilTagsQueryBuilder(getCountResult: number): void {
        jest.spyOn(LwpPupilTag, 'createQueryBuilder').mockReturnValue({
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(getCountResult)
        } as unknown as SelectQueryBuilder<LwpPupilTag>);
    }

    describe('authorize', () => {
        it('allows access for admins', async () => {
            const pupilTag = dbMocks.mockPupilTag();
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpPupilTag.authorize({ id: pupilTag.id, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpPupilTag.authorize({ id: pupilTag.id, opType: OpType.Write, token })).toEqual('*');
        });

        it('allows read and write access of pupil tags for teachers of same school', async () => {
            const school = dbMocks.mockSchool();
            const pupilTag = dbMocks.mockPupilTag(school);
            const leader = dbMocks.mockTeacher({ leader: true, school });
            const leaderToken = createLeaderToken(leader);

            mockPupilTagsQueryBuilder(1);

            expect(
                await LwpPupilTag.authorize({
                    id: pupilTag.id,
                    opType: OpType.Read,
                    token: leaderToken
                })
            ).toEqual('*');

            expect(
                await LwpPupilTag.authorize({
                    id: pupilTag.id,
                    opType: OpType.Write,
                    token: leaderToken
                })
            ).toEqual('*');
        });

        it('denies read and write access of pupil tags for teachers of different school', async () => {
            const school = dbMocks.mockSchool();
            const school2 = dbMocks.mockSchool();
            const pupilTag = dbMocks.mockPupilTag(school2);
            const leader = dbMocks.mockTeacher({ leader: true, school });
            const leaderToken = createLeaderToken(leader);

            mockPupilTagsQueryBuilder(0);

            expect(
                await LwpPupilTag.authorize({
                    id: pupilTag.id,
                    opType: OpType.Read,
                    token: leaderToken
                })
            ).toEqual(false);

            expect(
                await LwpPupilTag.authorize({
                    id: pupilTag.id,
                    opType: OpType.Write,
                    token: leaderToken
                })
            ).toEqual(false);
        });

        it('denies read and write access of pupil tags for parents', async () => {
            const parent = dbMocks.mockParent();
            const pupilTag = dbMocks.mockPupilTag();

            const token = mockJwtAuthToken(parent.id, { userType: UserType.PARENT });

            expect(
                await LwpPupilTag.authorize({
                    id: pupilTag.id,
                    opType: OpType.Read,
                    token: token
                })
            ).toEqual(false);

            expect(
                await LwpPupilTag.authorize({
                    id: pupilTag.id,
                    opType: OpType.Write,
                    token: token
                })
            ).toEqual(false);
        });
    });
});
