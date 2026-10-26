import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

/**
 * One class a user may auto-schedule a sequence onto, for the picker on the Topic library page.
 *
 * Only classes that can actually be scheduled are returned, so every entry here leads somewhere: see
 * ClassSequenceAssignmentService.getAutoSchedulableClassesForSchool for the four conditions. The
 * caller renders these as a list and navigates to the chosen class's auto-schedule page, so it needs
 * nothing beyond a label and an id.
 */
@ObjectType()
export class AutoSchedulableClassOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    /**
     * Prefixed with the period's short name for a class from a finished year, exactly as
     * `schoolClassName` renders it elsewhere. Classes outside the school's current year are excluded
     * here, so the prefix should never appear in practice; it is applied anyway so this label cannot
     * disagree with the same class's name on the page it leads to.
     */
    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    /** The year group's display name, shown beside the class so two same-named classes are told apart. */
    @Field()
    @AuthorizeField(TeacherField)
    year: string;

    /**
     * Whether the user asking is attached to this class. Always true for a teacher, who is only ever
     * offered their own; a school leader is offered every eligible class and uses this to group their
     * own first, as the Set a topic class picker already does.
     */
    @Field()
    @AuthorizeField(TeacherField)
    isMyClass: boolean;
}
