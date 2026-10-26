import * as dotenv from 'dotenv';
import request, { gql } from 'graphql-request';

dotenv.config({ path: '../.env' });

export async function getTokenFromLogin(
    emailOrPhone: string,
    password: string,
    remember: boolean = true
): Promise<{ accessToken: string }> {
    const document = gql`
        mutation login($emailOrPhone: String!, $token: String!, $remember: Boolean!, $provider: AuthMethod!) {
            login(emailOrPhone: $emailOrPhone, authToken: $token, provider: $provider, remember: $remember) {
                accessToken
                refreshToken
            }
        }
    `;
    const response = await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            emailOrPhone: emailOrPhone,
            token: password,
            remember: remember,
            provider: 'Password'
        },
        {
            'recaptcha-token': 'none'
        }
    );

    return response.login;
}

export async function changeSchoolPeriod(accessToken: string, schoolId: string, index: number): Promise<void> {
    const document = gql`
        mutation changeSchoolPeriod($schoolId: String!, $index: Float!) {
            changeSchoolPeriod(schoolId: $schoolId, index: $index) {
                id
            }
        }
    `;

    await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            schoolId: schoolId,
            index: index
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );
}

export async function reimportCachedData(accessToken: string, wondeSchoolId: string, lwpSchoolId: string): Promise<void> {
    const document = gql`
        mutation reimportCachedData($wondeSchoolId: String!, $lwpSchoolId: String!) {
            reimportCachedData(wondeSchoolId: $wondeSchoolId, lwpSchoolId: $lwpSchoolId)
        }
    `;

    await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            wondeSchoolId: wondeSchoolId,
            lwpSchoolId: lwpSchoolId
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );
}

export async function updatePupilLinkRequests(
    accessToken: string,
    importedSchoolId: string,
    input: Array<{ importedStudentId: string; platformPupilId?: string; action: 'LINK' | 'CREATE' | 'IGNORE' }>
): Promise<{ importStatus: string }> {
    const document = gql`
        mutation updatePupilLinkRequests($input: [UpdatePupilLinkRequestsInput!]!, $importedSchoolId: String!) {
            updatePupilLinkRequests(input: $input, importedSchoolId: $importedSchoolId) {
                importStatus
            }
        }
    `;

    const response = await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        { input, importedSchoolId },
        { Authorization: `Bearer ${accessToken}` }
    );

    return response.updatePupilLinkRequests;
}

export async function updateClassLinkRequests(
    accessToken: string,
    importedSchoolId: string,
    input: Array<{ importedSchoolClassId: string; platformSchoolClassId?: string; action: 'LINK' | 'CREATE' | 'IGNORE' }>
): Promise<{ importStatus: string }> {
    const document = gql`
        mutation updateClassLinkRequests($input: [UpdateClassLinkRequestsInput!]!, $importedSchoolId: String!) {
            updateClassLinkRequests(input: $input, importedSchoolId: $importedSchoolId) {
                importStatus
            }
        }
    `;

    const response = await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        { input, importedSchoolId },
        { Authorization: `Bearer ${accessToken}` }
    );

    return response.updateClassLinkRequests;
}

export async function sendPupilParentInvitationImmediate(accessToken: string, pupilParentIds: string[]): Promise<void> {
    const document = gql`
        mutation sendPupilParentInvitationImmediate($pupilParentIds: [String!]!) {
            sendPupilParentInvitationImmediate(pupilParentIds: $pupilParentIds)
        }
    `;

    await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            pupilParentIds: pupilParentIds
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );
}

export async function getUserNotificationHistory(
    accessToken: string,
    userId: string,
    limit: number = 5
): Promise<{ id: string; emailTemplateType: string; context: { mailData: string } }[]> {
    const document = gql`
        query getUserNotificationHistory($userId: String!, $limit: Float) {
            getUserNotificationHistory(userId: $userId, limit: $limit) {
                results {
                    id
                    emailTemplateType
                    context {
                        mailData
                    }
                }
            }
        }
    `;

    const response = await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            userId: userId,
            limit: limit
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );

    return response.getUserNotificationHistory.results;
}

export async function reInviteParent(accessToken: string, parentId: string) {
    const document = gql`
        mutation reInviteParent($parentId: String!) {
            reInviteParent(parentId: $parentId) {
                id
            }
        }
    `;

    await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            parentId: parentId
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );
}

export async function sendStaffInvites(accessToken: string, userIds: string[]): Promise<boolean> {
    const document = gql`
        mutation sendStaffInvites($userIds: [String!]!) {
            sendStaffInvites(userIds: $userIds)
        }
    `;

    const response = await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            userIds
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );

    return response.sendStaffInvites;
}

export async function createSchoolAndDummyWondeData(
    accessToken: string,
    input: Record<string, string | number | boolean | Record<string, string | number | boolean>>
) {
    const document = gql`
        mutation createSchoolAndDummyWondeData($input: SchoolAndDummyWondeDataInput!) {
            createSchoolAndDummyWondeData(input: $input)
        }
    `;

    await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            input
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );
}

export async function createSchoolDataForTesting(
    accessToken: string,
    input: Record<
        string,
        string | number | boolean | Record<string, string | number | boolean | null> | Array<Record<string, string | number | boolean>>
    >
) {
    const document = gql`
        mutation createSchoolDataForTesting($input: CreateSchoolDataForTestingInput!) {
            createSchoolDataForTesting(input: $input)
        }
    `;

    await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        {
            input
        },
        {
            Authorization: `Bearer ${accessToken}`
        }
    );
}

/**
 * Withdraws a school's whole-school schedule, as the leader (LEA-6700).
 *
 * Called through the API rather than through a button, because there is no Remove control on the
 * page: the mutation is reachable only this way today. Run with the **leader's own token**, so the
 * authorizer is exercised as well as the mutation, which a direct database update would skip
 * entirely.
 */
export async function removeWholeSchoolSequenceAssignment(accessToken: string, schoolId: string, assignmentId: string): Promise<string> {
    const document = gql`
        mutation removeWholeSchoolSequenceAssignment($schoolId: String!, $assignmentId: String!) {
            removeWholeSchoolSequenceAssignment(schoolId: $schoolId, assignmentId: $assignmentId) {
                status
                msg
            }
        }
    `;

    const response = await request(
        `${process.env.GRAPHQL_BASE}/graphql`,
        document,
        { schoolId, assignmentId },
        { Authorization: `Bearer ${accessToken}` }
    );

    return response.removeWholeSchoolSequenceAssignment.msg;
}

/** Marks the Money Skills welcome seen (LEA-6505), as whoever holds the token. */
export async function markMoneySkillsWelcomeSeen(accessToken: string, schoolId: string): Promise<boolean> {
    const document = gql`
        mutation markMoneySkillsWelcomeSeen($schoolId: String!) {
            markMoneySkillsWelcomeSeen(schoolId: $schoolId)
        }
    `;

    const response = await request(`${process.env.GRAPHQL_BASE}/graphql`, document, { schoolId }, { Authorization: `Bearer ${accessToken}` });

    return response.markMoneySkillsWelcomeSeen;
}

/** The subjects the school overview prompts this school to schedule (LEA-6688), as whoever holds the token. */
export async function getWholeSchoolAutoSchedulePrompts(accessToken: string, schoolId: string): Promise<{ subjectId: string }[]> {
    const document = gql`
        query wholeSchoolAutoSchedulePrompts($schoolId: String!) {
            wholeSchoolAutoSchedulePrompts(schoolId: $schoolId) {
                subjectId
            }
        }
    `;

    const response = await request(`${process.env.GRAPHQL_BASE}/graphql`, document, { schoolId }, { Authorization: `Bearer ${accessToken}` });

    return response.wholeSchoolAutoSchedulePrompts;
}
