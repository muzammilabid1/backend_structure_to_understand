import { gql } from '@apollo/client';

/**
 * What this school would be given for one subject, computed and never written (LEA-6697).
 *
 * **Addressed by subject, not by whole-school sequence id.** A whole-school sequence belongs to no
 * school, so an id from the browser would carry no authorization signal and the server would have to
 * prove three separate things about it. Sending the subject lets the server resolve it from this
 * school's own academic year instead, which is also why this page needs no second query to find out
 * what to preview.
 *
 * Every field here is rendered. The subject name and academic year come back on this query rather
 * than from a school or subject query, so the breadcrumb costs nothing extra.
 */
export const previewWholeSchoolSequence = gql`
    query previewWholeSchoolSequence($schoolId: String!, $subjectId: String!) {
        previewWholeSchoolSequence(schoolId: $schoolId, subjectId: $subjectId) {
            wholeSchoolSequenceId
            subjectId
            subjectName
            academicYear
            rows {
                yearGroupId
                yearGroup
                sequenceName
                startDate
                endDate
                classCount
                topicsSkipped
                skipped
                skipReason
            }
            activitiesToCreate
            topicsSkipped
            classesCovered
            classesSkipped
            # What this school was already given, absent until it has scheduled (LEA-6700). Its
            # presence is what the page branches on, before it looks at anything else here.
            assignment {
                assignmentId
                scheduledOn
                rows {
                    yearGroupId
                    yearGroup
                    sequenceName
                    startDate
                    endDate
                    classCount
                    activityCount
                    classesReceiving
                    topicsSkipped
                    skipped
                    skipReason
                }
                activitiesCreated
                classesScheduled
            }
        }
    }
`;

/**
 * Schedules every eligible class in the school, in one transaction (LEA-6698).
 *
 * **Takes the whole-school sequence id, unlike the preview above, which takes a subject.** The id is
 * the one the preview returned, so the leader commits to exactly the thing they were shown rather
 * than to whatever the server would resolve a second time. The server re-checks that it is published,
 * for this school's academic year, and for a subject the school is entitled to, because an id that
 * arrived from a browser is evidence of nothing.
 *
 * All or nothing: either every eligible class is scheduled or none is.
 */
export const assignWholeSchoolSequence = gql`
    mutation assignWholeSchoolSequence($schoolId: String!, $wholeSchoolSequenceId: String!) {
        assignWholeSchoolSequence(schoolId: $schoolId, wholeSchoolSequenceId: $wholeSchoolSequenceId) {
            wholeSchoolAssignmentId
            classesScheduled
            activitiesCreated
        }
    }
`;

/**
 * The programmes on the Auto schedule tab (LEA-6687), with what the school has already scheduled.
 *
 * Only the record's rows are asked for, because the summary row is built from their year groups and
 * dates and nothing else.
 */
export const wholeSchoolAutoScheduleProgrammes = gql`
    query wholeSchoolAutoScheduleProgrammes($schoolId: String!) {
        wholeSchoolAutoScheduleProgrammes(schoolId: $schoolId) {
            subjectId
            subjectName
            programmeType
            isAvailable
            assignment {
                rows {
                    yearGroupId
                    yearGroup
                    startDate
                    endDate
                }
            }
        }
    }
`;

/** Records that this leader has seen the Money Skills welcome modal, so it does not show again this academic year. */
export const markMoneySkillsWelcomeSeen = gql`
    mutation markMoneySkillsWelcomeSeen($schoolId: String!) {
        markMoneySkillsWelcomeSeen(schoolId: $schoolId)
    }
`;

/** The programmes the school overview prompts this school to schedule (LEA-6688). */
export const wholeSchoolAutoSchedulePrompts = gql`
    query wholeSchoolAutoSchedulePrompts($schoolId: String!) {
        wholeSchoolAutoSchedulePrompts(schoolId: $schoolId) {
            subjectId
            subjectName
            programmeType
            isAvailable
        }
    }
`;
