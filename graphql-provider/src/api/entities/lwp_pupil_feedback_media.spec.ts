import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { SelectQueryBuilder } from 'typeorm';

import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpPupilFeedbackMedia } from './lwp_pupil_feedback_media';

describe('LwpPupilFeedbackMedia', () => {
    describe('authorize', () => {
        const mockLPFAuth = jest.spyOn(LwpPupilFeedback, 'authorize');

        const innerJoinSpy = jest.fn().mockReturnThis();
        const selectSpy = jest.fn().mockReturnThis();
        const whereSpy = jest.fn().mockReturnThis();
        const rawOneSpy = jest.fn();

        jest.spyOn(LwpPupilFeedbackMedia, 'createQueryBuilder').mockImplementation(
            () =>
                ({
                    innerJoin: innerJoinSpy,
                    where: whereSpy,
                    select: selectSpy,
                    getRawOne: rawOneSpy
                }) as unknown as SelectQueryBuilder<LwpPupilFeedbackMedia>
        );

        it.each(Object.entries(UserType))('delegates %s permissions to LwpPupilFeedback', async (_, userType) => {
            const token = mockJwtAuthToken(1, { userType });

            rawOneSpy.mockReturnValue({ lpf_id: '20' });

            mockLPFAuth.mockImplementation(() => false);
            expect(await LwpPupilFeedbackMedia.authorize({ id: '5', opType: OpType.Read, token })).toBe(false);
            expect(await LwpPupilFeedbackMedia.authorize({ id: '5', opType: OpType.Write, token })).toBe(false);

            expect(mockLPFAuth).toHaveBeenCalledWith({ id: '20', opType: OpType.Read, token });
            expect(mockLPFAuth).toHaveBeenCalledWith({ id: '20', opType: OpType.Write, token });

            mockLPFAuth.mockImplementation(() => '*');
            expect(await LwpPupilFeedbackMedia.authorize({ id: '5', opType: OpType.Read, token })).toEqual('*');
            expect(await LwpPupilFeedbackMedia.authorize({ id: '5', opType: OpType.Write, token })).toEqual('*');

            // Allow all writes to create an object
            expect(await LwpPupilFeedbackMedia.authorize({ id: null, opType: OpType.Write, token })).toEqual('*');
        });
    });
});
