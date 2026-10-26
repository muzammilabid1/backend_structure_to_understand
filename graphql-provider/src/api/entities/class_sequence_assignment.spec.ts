import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { SelectQueryBuilder } from 'typeorm';
import * as TypeORM from 'typeorm';

import { LwpClassSequenceAssignment } from './class_sequence_assignment';
import { LwpSchoolClass } from './school_class';

describe('LwpClassSequenceAssignment', () => {
    describe('authorizer', () => {
        it('allows reads and writes from admins', async () => {
            expect(
                await LwpClassSequenceAssignment.authorize({
                    id: null,
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.ADMIN })
                })
            ).toEqual('*');
            expect(
                await LwpClassSequenceAssignment.authorize({
                    id: null,
                    opType: OpType.Write,
                    token: mockJwtAuthToken(1, { userType: UserType.ADMIN })
                })
            ).toEqual('*');
        });

        describe('as a teacher', () => {
            const innerJoinSpy = jest.fn().mockReturnThis();
            const whereSpy = jest.fn().mockReturnThis();
            const countSpy = jest.fn();

            const bracketsMock = {
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis()
            };

            jest.spyOn(TypeORM, 'Brackets').mockImplementation((cb) => {
                return cb(bracketsMock as unknown as TypeORM.WhereExpressionBuilder);
            });

            jest.spyOn(LwpClassSequenceAssignment, 'createQueryBuilder').mockImplementation(
                () =>
                    ({
                        innerJoin: innerJoinSpy,
                        where: whereSpy,
                        andWhere: whereSpy,
                        getCount: countSpy
                    }) as unknown as SelectQueryBuilder<LwpClassSequenceAssignment>
            );

            beforeEach(() => jest.clearAllMocks());

            it.each([OpType.Read, OpType.Write])('allows %ss from teachers of the class', async (opType) => {
                countSpy.mockReturnValue(1);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: ['50'] })
                    })
                ).toEqual('*');

                expect(whereSpy).toHaveBeenCalledWith('csa.id = :id', { id: '500' });
                expect(bracketsMock.where).toHaveBeenCalledWith('class.id IN (:...classIds)', { classIds: ['50'] });
                expect(bracketsMock.where).toHaveBeenCalledTimes(1);
                expect(bracketsMock.orWhere).not.toHaveBeenCalled();
            });

            it.each([OpType.Read, OpType.Write])('denies %ss from teachers of other classes', async (opType) => {
                countSpy.mockReturnValue(0);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: ['40'] })
                    })
                ).toBe(false);

                expect(whereSpy).toHaveBeenCalledWith('csa.id = :id', { id: '500' });
                expect(bracketsMock.where).toHaveBeenCalledWith('class.id IN (:...classIds)', { classIds: ['40'] });
                expect(bracketsMock.where).toHaveBeenCalledTimes(1);
                expect(bracketsMock.orWhere).not.toHaveBeenCalled();
            });

            it.each([OpType.Read, OpType.Write])('allows %ss from leaders of the school', async (opType) => {
                countSpy.mockReturnValue(1);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], schoolId: '20', isSchoolLeader: true })
                    })
                ).toEqual('*');

                expect(whereSpy).toHaveBeenCalledWith('csa.id = :id', { id: '500' });
                expect(bracketsMock.where).not.toHaveBeenCalled();
                expect(bracketsMock.orWhere).toHaveBeenCalledWith('school.id = :schoolId', { schoolId: '20' });
                expect(bracketsMock.orWhere).toHaveBeenCalledTimes(1);
            });

            it.each([OpType.Read, OpType.Write])('denies %ss from leaders of other schools', async (opType) => {
                countSpy.mockReturnValue(0);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], schoolId: '30', isSchoolLeader: true })
                    })
                ).toBe(false);

                expect(whereSpy).toHaveBeenCalledWith('csa.id = :id', { id: '500' });
                expect(bracketsMock.orWhere).toHaveBeenCalledWith('school.id = :schoolId', { schoolId: '30' });
                expect(bracketsMock.orWhere).toHaveBeenCalledTimes(1);
            });

            /**
             * A teacher with no classes who is not a school leader has no scope to match on. The
             * conditions are built inside Brackets, and TypeORM renders an empty bracket as "1=1",
             * so without an explicit guard the query collapses to "csa.id = :id" and every
             * assignment in the platform matches. These cases assert that a row existing is not on
             * its own grounds to grant access, which is why the count is stubbed as if it matched.
             */
            it.each([OpType.Read, OpType.Write])('denies %ss from a teacher with no classes who is not a leader', async (opType) => {
                countSpy.mockReturnValue(1);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], isSchoolLeader: false })
                    })
                ).toBe(false);
            });

            it.each([OpType.Read, OpType.Write])('denies %ss when classIds is absent entirely', async (opType) => {
                countSpy.mockReturnValue(1);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: '500',
                        opType,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, isSchoolLeader: false })
                    })
                ).toBe(false);
            });

            it('does not even run the query when the teacher has no scope', async () => {
                countSpy.mockReturnValue(1);

                await LwpClassSequenceAssignment.authorize({
                    id: '500',
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], isSchoolLeader: false })
                });

                expect(countSpy).not.toHaveBeenCalled();
            });

            it('delegates assignment creation to LwpSchoolClass', async () => {
                const classAuthSpy = jest.spyOn(LwpSchoolClass, 'authorize').mockReturnValue('*');
                const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: [], schoolId: '30', isSchoolLeader: true });

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: null,
                        opType: OpType.Write,
                        token,
                        parentId: '50'
                    })
                ).toEqual('*');
                expect(classAuthSpy).toHaveBeenCalledWith({ id: '50', opType: OpType.Write, token });
                expect(classAuthSpy).toHaveBeenCalledTimes(1);

                classAuthSpy.mockReturnValue(false);

                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: null,
                        opType: OpType.Write,
                        token,
                        parentId: '50'
                    })
                ).toBe(false);
            });

            it('denies creation when no class is given as the parent', async () => {
                expect(
                    await LwpClassSequenceAssignment.authorize({
                        id: null,
                        opType: OpType.Write,
                        token: mockJwtAuthToken(1, { userType: UserType.TEACHER, classIds: ['50'] })
                    })
                ).toBe(false);
            });
        });

        it.each(Object.entries(UserType).filter(([, uT]) => ![UserType.ADMIN, UserType.TEACHER].includes(uT)))(
            'denies reads and writes from %s',
            async (_, userType) => {
                expect(
                    await LwpClassSequenceAssignment.authorize({ id: null, opType: OpType.Read, token: mockJwtAuthToken(1, { userType }) })
                ).toBe(false);
                expect(
                    await LwpClassSequenceAssignment.authorize({ id: null, opType: OpType.Write, token: mockJwtAuthToken(1, { userType }) })
                ).toBe(false);
            }
        );
    });
});
