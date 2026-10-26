/**
 * Decides which activity steps a viewer should actually see.
 *
 * Every step-level visibility rule lives here, so there is one place to read when you are
 * wondering why a step did not render, and one place to change when a new rule is needed.
 *
 * ---------------------------------------------------------------------------------------
 * Rule 1: school tag rules (`step.visibilityRules.hideForSchoolTagIds`)
 * ---------------------------------------------------------------------------------------
 * A step is hidden when the viewer's school carries any of the school tag ids listed on
 * that step. Admins choose the tags per step in the activity editor.
 *
 * This rule is deliberately step-type agnostic, and the admin editor offers the control on
 * every step type. Nothing here reads the step type, so a step type added to the enum in
 * future is covered by this rule automatically, with no change needed in this file.
 *
 * Note this applies to activity steps only. Modal steps live in the same table and carry
 * the same column, but they are fetched by a separate query and rendered by
 * StaticLwpModalPreview, which never calls this filter. The modal editors therefore do not
 * offer the control at all, rather than letting an admin save a rule that does nothing.
 *
 * Tag ids that no longer match a live tag (because the tag was deleted) simply never
 * match any school, so the affected steps quietly go back to being visible rather than
 * breaking. Ids are compared as strings because they are bigints in the database and
 * arrive as strings over GraphQL; normalising here means a stray number cannot cause a
 * silent mismatch that would make the rule look like it is not working at all.
 *
 * ---------------------------------------------------------------------------------------
 * Rule 2: set-by-teacher steps
 * ---------------------------------------------------------------------------------------
 * A SET_BY_TEACHER step only renders once the teacher has actually uploaded its media.
 * Until then there is nothing to show.
 *
 * ---------------------------------------------------------------------------------------
 * Where this runs, and the limit that comes with it
 * ---------------------------------------------------------------------------------------
 * This filter runs in the browser. A hidden step's content has already been sent to the
 * browser by the time it is dropped here. That is fine for hiding a video, which is not
 * secret, and it keeps the shared `steps` GraphQL resolver untouched. That resolver is read
 * by every user type, so it could not tell whose school to match against even if it wanted
 * to; each caller passes the school it has in view instead.
 *
 * It does mean you must not extend these rules to hide anything genuinely sensitive. That
 * would need filtering on the server instead.
 */

type StepVisibilityRules = {
    hideForSchoolTagIds?: string[] | null;
};

type FilterableStep = {
    id?: string;
    stepType?: string;
    visibilityRules?: StepVisibilityRules | null;
};

type SetByTeacherMediaByStepId = Record<string, { filename?: string | null } | undefined>;

type FilterStepsOptions = {
    /** School tag ids of the school the viewer is looking at, from `school.tagIds`. */
    schoolTagIds?: string[] | null;
    /** Uploaded set-by-teacher media, keyed by step id. */
    sbtMediaByStepId?: SetByTeacherMediaByStepId | null;
};

const SET_BY_TEACHER = 'SET_BY_TEACHER';

/** Rule 1. Exported so it can be unit tested and reused on its own. */
export const isStepHiddenForSchoolTags = (step: FilterableStep, schoolTagIds?: string[] | null): boolean => {
    const hideForSchoolTagIds = step?.visibilityRules?.hideForSchoolTagIds;

    if (!hideForSchoolTagIds?.length || !schoolTagIds?.length) return false;

    const schoolTagIdSet = new Set(schoolTagIds.map((tagId) => String(tagId)));

    return hideForSchoolTagIds.some((tagId) => schoolTagIdSet.has(String(tagId)));
};

/** Rule 2. Exported so it can be unit tested and reused on its own. */
export const isSetByTeacherStepReady = (step: FilterableStep, sbtMediaByStepId?: SetByTeacherMediaByStepId | null): boolean =>
    step?.stepType !== SET_BY_TEACHER || !!sbtMediaByStepId?.[step?.id]?.filename;

/**
 * Filters an activity's `legacySteps` down to the ones this viewer should see.
 *
 * Pass `schoolTagIds` wherever a specific school is in view: the pupil's school on the parent
 * activity page, and the teacher's own school on the activity preview, so that a teacher sees
 * exactly what their pupils will (LEA-6559).
 *
 * Leaving it out means no step is ever hidden by a tag rule. That is what the admin editor
 * preview wants, since an admin has no school and must always see every step.
 */
export const filterStepsForViewer = <T extends FilterableStep>(
    legacySteps: T[] | null | undefined,
    { schoolTagIds, sbtMediaByStepId }: FilterStepsOptions = {}
): T[] =>
    (legacySteps ?? []).filter((step) => !isStepHiddenForSchoolTags(step, schoolTagIds) && isSetByTeacherStepReady(step, sbtMediaByStepId));
