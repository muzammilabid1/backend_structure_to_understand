import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { SelectQueryBuilder } from 'typeorm';

import { LwpSticker } from './lwp_sticker';
import { LwpSchool } from './school';
import { LwpUser } from './user';

describe('LwpSticker', () => {
    let dbMocks: DbMocks;
    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpSticker, LwpSchool, LwpUser);
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

    function mockStickerQueryBuilder(getCountResult: number): void {
        jest.spyOn(LwpSticker, 'createQueryBuilder').mockReturnValue({
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(getCountResult)
        } as unknown as SelectQueryBuilder<LwpSticker>);
    }

    describe('authorize', () => {
        it('allows access for admins', async () => {
            const sticker = dbMocks.mockSticker();
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpSticker.authorize({ id: sticker.id, opType: OpType.Read, token })).toEqual('*');
            expect(await LwpSticker.authorize({ id: sticker.id, opType: OpType.Write, token })).toEqual('*');
        });

        it('allows read access of admin and school stickers for teachers', async () => {
            const school = dbMocks.mockSchool();
            const adminSticker = dbMocks.mockSticker();
            const schoolSticker = dbMocks.mockSticker(school);
            const leader = dbMocks.mockTeacher({ leader: true, school });
            const leaderToken = createLeaderToken(leader);

            mockStickerQueryBuilder(1);

            expect(
                await LwpSticker.authorize({
                    id: schoolSticker.id,
                    opType: OpType.Read,
                    token: leaderToken
                })
            ).toEqual('*');

            expect(
                await LwpSticker.authorize({
                    id: adminSticker.id,
                    opType: OpType.Read,
                    token: leaderToken
                })
            ).toEqual('*');
        });

        it('allows write access of school stickers for teachers (own school)', async () => {
            const school = dbMocks.mockSchool();
            const schoolSticker = dbMocks.mockSticker(school);
            const leader = dbMocks.mockTeacher({ leader: true, school });
            const leaderToken = createLeaderToken(leader);

            mockStickerQueryBuilder(1);

            expect(
                await LwpSticker.authorize({
                    id: schoolSticker.id,
                    opType: OpType.Write,
                    token: leaderToken
                })
            ).toEqual('*');
        });

        it('denies write access of admin stickers for teachers', async () => {
            const school = dbMocks.mockSchool();
            const adminSticker = dbMocks.mockSticker(null);
            const leader = dbMocks.mockTeacher({ leader: true, school });
            const leaderToken = createLeaderToken(leader);

            mockStickerQueryBuilder(0);

            expect(
                await LwpSticker.authorize({
                    id: adminSticker.id,
                    opType: OpType.Write,
                    token: leaderToken
                })
            ).toEqual(false);
        });

        it('denies write access of school stickers for teachers from different schools', async () => {
            const school = dbMocks.mockSchool();
            const differentSchool = dbMocks.mockSchool();
            const schoolSticker = dbMocks.mockSticker(school);
            const leader = dbMocks.mockTeacher({ leader: true, school: differentSchool });
            const leaderToken = createLeaderToken(leader);

            mockStickerQueryBuilder(0);

            expect(
                await LwpSticker.authorize({
                    id: schoolSticker.id,
                    opType: OpType.Write,
                    token: leaderToken
                })
            ).toEqual(false);
        });
    });
});
