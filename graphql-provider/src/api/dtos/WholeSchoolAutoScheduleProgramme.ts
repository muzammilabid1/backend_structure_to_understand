import { Field, ObjectType } from '@nestjs/graphql';
import { SubjectProgrammeType } from 'lwp-shared/enums';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { WholeSchoolAssignmentRecord } from './WholeSchoolSequencePreview';

/**
 * One programme on the Set a topic page's Auto schedule tab (LEA-6687): a banner when the school has
 * not scheduled it this year, and a summary row with Review once it has.
 */
@ObjectType()
export class WholeSchoolAutoScheduleProgramme {
    @Field()
    @AuthorizeField(TeacherField)
    subjectId: string;

    @Field()
    @AuthorizeField(TeacherField)
    subjectName: string;

    /** What the page picks each banner's colour and mascot by, so it never has to match on a name. */
    @Field(() => SubjectProgrammeType)
    @AuthorizeField(TeacherField)
    programmeType: SubjectProgrammeType;

    /**
     * Whether a published whole-school sequence exists for this subject and this school's academic
     * year, which is what the banner's button is enabled by. False renders the banner as coming soon.
     */
    @Field()
    @AuthorizeField(TeacherField)
    isAvailable: boolean;

    /** What this school was given this year, absent until it has scheduled. */
    @Field(() => WholeSchoolAssignmentRecord, { nullable: true })
    @AuthorizeField(TeacherField)
    assignment?: WholeSchoolAssignmentRecord;
}
