import { mockJwtAuthToken } from 'src/auth/__utils__/AuthMocks';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockActiveRecord } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { LwpFeedbackReply } from './lwp_feedback_reply';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpPupil } from './pupil';
import { LwpSchool } from './school';

describe('LwpFeedbackReply', () => {
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(() => {
        mockActiveRecord(mockedRepos, LwpSchool, LwpPupil, LwpPupilFeedback, LwpFeedbackReply);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('canAccessLwpFeedbackReply', () => {
        const feedbackReplyId = '1';
        const schoolId = '1';

        it('allows access for admins', async () => {
            const token = mockJwtAuthToken(1, { userType: UserType.ADMIN });

            expect(await LwpFeedbackReply.authorize({ id: feedbackReplyId, token, opType: OpType.Read })).toEqual('*');
            expect(await LwpFeedbackReply.authorize({ id: feedbackReplyId, token, opType: OpType.Write })).toEqual('*');
        });

        it('allows access to write for relavant teachers', async () => {
            const teacher = dbMocks.mockTeacher();
            const feedbackReply = dbMocks.mockFeedbackReply(teacher);

            const token = mockJwtAuthToken(teacher.id, { userType: UserType.TEACHER, schoolId });
            const token2 = mockJwtAuthToken(teacher.id + 2, { userType: UserType.TEACHER, schoolId });

            // Read access
            expect(await LwpFeedbackReply.authorize({ id: feedbackReply.id, token, opType: OpType.Read })).toBe('*');
            expect(await LwpFeedbackReply.authorize({ id: feedbackReply.id, token: token2, opType: OpType.Read })).toBe('*');

            // Write access
            expect(await LwpFeedbackReply.authorize({ id: feedbackReply.id, token, opType: OpType.Write })).toBe('*');
            expect(await LwpFeedbackReply.authorize({ id: feedbackReply.id, token: token2, opType: OpType.Write })).toBe(false);
        });

        it('allows only read access for parent users', async () => {
            expect(
                await LwpFeedbackReply.authorize({
                    id: feedbackReplyId,
                    opType: OpType.Read,
                    token: mockJwtAuthToken(1, { userType: UserType.PARENT })
                })
            ).toBe('*');

            expect(
                await LwpFeedbackReply.authorize({
                    id: feedbackReplyId,
                    opType: OpType.Write,
                    token: mockJwtAuthToken(1, { userType: UserType.PARENT })
                })
            ).toBe(false);
        });

        it('denies access for teachers in other schools', async () => {
            const school = dbMocks.mockSchool();
            const pupil = dbMocks.mockPupil(school);
            const pupilFeedback = dbMocks.mockPupilFeedback(UserType.PARENT, pupil);

            const token = mockJwtAuthToken(1, { userType: UserType.TEACHER, schoolId: school.id + 5 });

            expect(await LwpFeedbackReply.authorize({ id: null, token, opType: OpType.Write, parentId: pupilFeedback.id })).toBe(false);
            expect(await LwpFeedbackReply.authorize({ id: null, token, opType: OpType.Read, parentId: pupilFeedback.id })).toBe(false);
        });
    });
});
