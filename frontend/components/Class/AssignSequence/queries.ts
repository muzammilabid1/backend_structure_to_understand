import { gql } from '@apollo/client';

/**
 * GraphQL for the auto-schedule flow, shared by the class schedule page, the generic auto-schedule
 * page and the Money Skills page reached from class activation.
 *
 * The schedule page needs the list too, because the action is only offered when there is something to
 * schedule, so keeping one definition means the callers cannot drift and Apollo serves them from one
 * cache entry per set of variables.
 */

/**
 * The breadcrumb label on both auto-schedule pages, and nothing else.
 *
 * Two fields rather than the shared `getSchoolClass`, which the generic page used to borrow: that one
 * selects around thirty fields and eight nested objects, many of them field resolvers that each run
 * their own query, which is a lot of work to render one label. `schoolClassName` rather than `name`
 * because it is what the rest of the app shows, prefixing a class from a past academic year with its
 * period. The id is here so Apollo can normalise the result into its cache alongside the fuller
 * queries other pages run for the same class, which is also what lets the second page render the
 * label without waiting.
 */
export const getClassNameForAutoSchedule = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            schoolClassName
        }
    }
`;

/**
 * Only sequences this class is entitled to and whose year group matches. The eligibility rule lives
 * in the API, shared with the teacher-facing topic pickers, so this list can never offer topics the
 * class cannot be given. It is deliberately not filtered by date: a set dated last term is still the
 * right one within the same academic year, and the leader re-dates it here.
 *
 * `items` are selected for the fallback table in assignSequencePlan.templatePlanItems, which is the
 * only way a leader can recover from fixed dates that have already passed.
 *
 * `programmeType` is optional and narrows the list to one programme, which only the Money Skills page
 * needs. The API intersects it with the class's entitlement, so it can never widen this list. Omitted
 * by the generic page and the class schedule page, which offer everything the class is entitled to.
 */
export const getAssignableSequencesForClass = gql`
    query getAssignableSequencesForClass($classId: String!, $programmeType: SubjectProgrammeType) {
        getAssignableSequencesForClass(classId: $classId, programmeType: $programmeType) {
            id
            name
            timingMode
            intervalDays
            itemCount
            subject {
                id
                name
            }
            items {
                id
                order
                startDate
                endDate
                topic {
                    id
                    teacherTopicName
                }
            }
        }
    }
`;

/**
 * The classes the viewer may auto-schedule onto, for the Topic library's picker. That page has no
 * class in scope, so it asks which classes are worth offering rather than asking about one.
 *
 * The API decides the scope from the token, so there is no `myClasses` argument to get wrong: a
 * teacher is answered with the classes they are attached to and may write to, a leader with every
 * eligible class in the school.
 *
 * Four fields and no nesting, because the picker renders a label and navigates. In particular it does
 * not select the sequences themselves: whether a class has any is the server's answer, and the page
 * it leads to loads them for the one class that was chosen.
 */
export const getAutoSchedulableClassesForSchool = gql`
    query getAutoSchedulableClassesForSchool($schoolId: String!) {
        getAutoSchedulableClassesForSchool(schoolId: $schoolId) {
            id
            name
            year
            isMyClass
        }
    }
`;

/** Preview and assign return the same shape, so the leader confirms exactly what they were shown. */
const PLAN_FIELDS = `
    startDate
    scheduledCount
    skippedCount
    excludedCount
    sequence {
        id
    }
    items {
        order
        releaseDate
        dueDate
        skipped
        skipReason
        alreadyScheduled
        excluded
        topic {
            id
            teacherTopicName
        }
    }
`;

export const previewSequenceForClass = gql`
    query previewSequenceForClass($input: AssignSequenceToClassInput!) {
        previewSequenceForClass(input: $input) {
            ${PLAN_FIELDS}
        }
    }
`;

export const assignSequenceToClass = gql`
    mutation assignSequenceToClass($input: AssignSequenceToClassInput!) {
        assignSequenceToClass(input: $input) {
            ${PLAN_FIELDS}
        }
    }
`;
