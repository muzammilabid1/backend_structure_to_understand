import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { SelectQueryBuilder } from 'typeorm';

import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpPupil } from './pupil';

describe('LwpPupilFeedback', () => {
    describe('authorize', () => {
        const innerJoinSpy = jest.fn().mockReturnThis();
        const leftJoinSpy = jest.fn().mockReturnThis();
        const selectSpy = jest.fn().mockReturnThis();
        const whereSpy = jest.fn().mockReturnThis();
        const andWhereSpy = jest.fn().mockReturnThis();
        const countSpy = jest.fn();

        const qbSpy = jest.spyOn(LwpPupilFeedback, 'createQueryBuilder').mockImplementation(
            () =>
                ({
                    innerJoin: innerJoinSpy,
                    leftJoin: leftJoinSpy,
                    select: selectSpy,
                    where: whereSpy,
                    andWhere: andWhereSpy,
                    getCount: countSpy
                }) as unknown as SelectQueryBuilder<LwpPupilFeedback>
        );

        beforeEach(() => jest.clearAllMocks());

        it('allows reads and writes from admins', async () => {
            expect(
                await LwpPupilFeedback.authorize({
                    id: null,
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.ADMIN })
                })
            ).toEqual('*');
            expect(
                await LwpPupilFeedback.authorize({
                    id: null,
                    opType: OpType.Write,
                    token: mockJwtAuthToken(1, { userType: UserType.ADMIN })
                })
            ).toEqual('*');
            expect(qbSpy).not.toHaveBeenCalled();
        });

        it.each([OpType.Read, OpType.Write])('checks if feedback belongs to teacher school', async (opType) => {
            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId: '100' });

            countSpy.mockReturnValue(0);
            expect(
                await LwpPupilFeedback.authorize({
                    id: '50',
                    opType,
                    token
                })
            ).toBe(false);

            expect(innerJoinSpy).toHaveBeenCalledWith('lpf.pupils', 'lp');
            expect(innerJoinSpy).toHaveBeenCalledWith('lp.school', 'ls');
            expect(whereSpy).toHaveBeenCalledWith('lpf.id = :id', { id: '50' });
            expect(andWhereSpy).toHaveBeenCalledWith('ls.id = :schoolId', { schoolId: '100' });

            countSpy.mockReturnValue(1);
            expect(
                await LwpPupilFeedback.authorize({
                    id: '50',
                    opType,
                    token
                })
            ).toEqual('*');

            expect(whereSpy).toHaveBeenCalledWith('lpf.id = :id', { id: '50' });
            expect(andWhereSpy).toHaveBeenCalledWith('ls.id = :schoolId', { schoolId: '100' });
        });

        it.each(Object.entries(UserType).filter(([, uT]) => ![UserType.ADMIN, UserType.TEACHER].includes(uT)))(
            'denies writes from %s',
            async (_, userType) => {
                countSpy.mockReturnValue(0);
                expect(
                    await LwpPupilFeedback.authorize({
                        id: '5',
                        opType: OpType.Write,
                        token: mockJwtAuthToken(1, { userType })
                    })
                ).toBe(false);
            }
        );

        it('delegates feedback creation to LwpPupil', async () => {
            const pupilSpy = jest.spyOn(LwpPupil, 'authorize').mockReturnValue('*');
            const token = mockJwtAuthToken(1, {});

            expect(await LwpPupilFeedback.authorize({ id: null, opType: OpType.Write, token, parentId: '1' })).toEqual('*');

            expect(pupilSpy).toHaveBeenCalledWith({ id: '1', opType: OpType.Write, token });

            pupilSpy.mockReturnValue(false);

            expect(await LwpPupilFeedback.authorize({ id: null, opType: OpType.Write, token, parentId: '1' })).toBe(false);
        });

        it('allows reads from relevant parents', async () => {
            countSpy.mockReturnValue(1);

            expect(
                await LwpPupilFeedback.authorize({
                    id: '500',
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.PARENT, pupilIds: ['45', '67'] })
                })
            ).toEqual('*');

            expect(whereSpy).toHaveBeenCalledWith('lpf.id = :id', { id: '500' });
            expect(andWhereSpy).toHaveBeenCalledWith('lp.id IN (:...ids)', { ids: ['45', '67'] });
        });

        it('denies reads from irrelevant parents', async () => {
            countSpy.mockReturnValue(0);

            expect(
                await LwpPupilFeedback.authorize({
                    id: '500',
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.PARENT, pupilIds: ['46'] })
                })
            ).toBe(false);

            expect(whereSpy).toHaveBeenCalledWith('lpf.id = :id', { id: '500' });
            expect(andWhereSpy).toHaveBeenCalledWith('lp.id IN (:...ids)', { ids: ['46'] });
        });
    });
});
