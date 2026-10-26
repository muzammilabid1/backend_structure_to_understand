import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

/**
 * What one whole-school run actually did (LEA-6698).
 *
 * Returned rather than a bare success, because the leader pressed one button and needs telling what
 * it reached. The counts are of rows that exist, not of rows that were planned: the run is all or
 * nothing, so by the time this is built every one of them has committed.
 */
@ObjectType()
export class WholeSchoolAssignmentResult {
    /** The run. LEA-6700's removal takes this id, and LEA-6700's Review state reads it. */
    @Field()
    @AuthorizeField(TeacherField)
    wholeSchoolAssignmentId: string;

    /** Classes that received something. A class whose plan was empty is not one of them. */
    @Field()
    @AuthorizeField(TeacherField)
    classesScheduled: number;

    /**
     * Class topics created across the whole school.
     *
     * Counted from what was written rather than from the preview's estimate, so this is the true
     * figure even where the preview's upper bound was high. LEA-6699 closed the past-dated part of
     * that gap, and deliberately not the per-class part: a topic a class already holds still counts
     * towards the preview's figure and not towards this one. No later slice owns the rest.
     */
    @Field()
    @AuthorizeField(TeacherField)
    activitiesCreated: number;
}
