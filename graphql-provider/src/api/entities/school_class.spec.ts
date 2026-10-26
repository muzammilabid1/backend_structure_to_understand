import { LwpSchoolClass } from 'src/api/entities/school_class';
import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { SelectQueryBuilder } from 'typeorm';

describe('LwpSchoolClass', () => {
    describe('authorize', () => {
        const innerJoinSpy = jest.fn().mockReturnThis();
        const whereSpy = jest.fn().mockReturnThis();
        const andWhereSpy = jest.fn().mockReturnThis();
        const countSpy = jest.fn();

        const qbSpy = jest.spyOn(LwpSchoolClass, 'createQueryBuilder').mockImplementation(
            () =>
                ({
                    innerJoin: innerJoinSpy,
                    where: whereSpy,
                    andWhere: andWhereSpy,
                    getCount: countSpy
                }) as unknown as SelectQueryBuilder<LwpSchoolClass>
        );

        beforeEach(() => jest.clearAllMocks());

        it('allows reads and writes from admins', async () => {
            expect(
                await LwpSchoolClass.authorize({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })
            ).toEqual('*');
            expect(
                await LwpSchoolClass.authorize({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType: UserType.ADMIN }) })
            ).toEqual('*');
        });

        describe('as a teacher', () => {
            it.each([OpType.Read, OpType.Write])('allows %ss from relevant teachers', async (opType) => {
                expect(
                    await LwpSchoolClass.authorize({
                        id: '50',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: ['50'] })
                    })
                ).toEqual('*');

                expect(qbSpy).not.toHaveBeenCalled();
            });

            it('allows reads from disconnected teachers', async () => {
                countSpy.mockReturnValue(1);

                expect(
                    await LwpSchoolClass.authorize({
                        id: '50',
                        opType: OpType.Read,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: ['40'], schoolId: '5' })
                    })
                ).toEqual('*');

                expect(whereSpy).toHaveBeenCalledWith('lsc.id = :classId', { classId: '50' });
                expect(andWhereSpy).toHaveBeenCalledWith('ls.id = :schoolId', { schoolId: '5' });
            });

            it('denies writes from irrelevant teachers', async () => {
                expect(
                    await LwpSchoolClass.authorize({
                        id: '50',
                        opType: OpType.Write,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: ['40'] })
                    })
                ).toBe(false);

                expect(qbSpy).not.toHaveBeenCalled();
            });

            it.each([OpType.Read, OpType.Write])('allows %ss from relevant leaders', async (opType) => {
                countSpy.mockReturnValue(1);

                expect(
                    await LwpSchoolClass.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], schoolId: '20', isSchoolLeader: true })
                    })
                ).toEqual('*');

                expect(whereSpy).toHaveBeenCalledWith('lsc.id = :classId', { classId: '500' });
                expect(andWhereSpy).toHaveBeenCalledWith('ls.id = :schoolId', { schoolId: '20' });
            });
            it.each([OpType.Read, OpType.Write])('denies %ss from irrelevant leaders', async (opType) => {
                countSpy.mockReturnValue(0);

                expect(
                    await LwpSchoolClass.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], schoolId: '30', isSchoolLeader: true })
                    })
                ).toBe(false);

                expect(whereSpy).toHaveBeenCalledWith('lsc.id = :classId', { classId: '500' });
                expect(andWhereSpy).toHaveBeenCalledWith('ls.id = :schoolId', { schoolId: '30' });
            });
        });

        it.each(Object.entries(UserType).filter(([, uT]) => ![UserType.ADMIN, UserType.TEACHER].includes(uT)))(
            'denies writes from %s',
            async (_, userType) => {
                expect(await LwpSchoolClass.authorize({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })).toBe(
                    false
                );
            }
        );

        it('allows reads from relevant parents', async () => {
            countSpy.mockReturnValue(1);

            expect(
                await LwpSchoolClass.authorize({
                    id: '500',
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.PARENT, pupilIds: ['45', '67'] })
                })
            ).toEqual('*');

            expect(whereSpy).toHaveBeenCalledWith('lsc.id = :id', { id: '500' });
            expect(andWhereSpy).toHaveBeenCalledWith('lp.id IN (:...ids)', { ids: ['45', '67'] });
        });

        it('denies reads from irrelevant parents', async () => {
            countSpy.mockReturnValue(0);

            expect(
                await LwpSchoolClass.authorize({
                    id: '500',
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.PARENT, pupilIds: ['46'] })
                })
            ).toBe(false);

            expect(whereSpy).toHaveBeenCalledWith('lsc.id = :id', { id: '500' });
            expect(andWhereSpy).toHaveBeenCalledWith('lp.id IN (:...ids)', { ids: ['46'] });
        });
    });
});
