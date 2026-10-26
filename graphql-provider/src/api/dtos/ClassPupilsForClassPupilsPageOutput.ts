import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpPupilTag } from '../entities/lwp_pupil_tag';
import { PupilStatus } from '../model';

@ObjectType()
export class ClassPupilsForClassPupilsPageOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    fullname: string;

    @Field()
    @AuthorizeField(TeacherField)
    allParentsRejected: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    allParentsRejectedOrImported: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    allParentsNotActiveAndAtLeastOneInvited: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    noParents: boolean;

    @Field(() => PupilStatus)
    @AuthorizeField(TeacherField)
    pupilStatus: PupilStatus;

    @Field()
    @AuthorizeField(TeacherField)
    activeParentsCount: number;

    @Field()
    @AuthorizeField(TeacherField)
    invitedParentsCount: number;

    @Field()
    @AuthorizeField(TeacherField)
    importedParentsCount: number;

    @Field()
    @AuthorizeField(TeacherField)
    rejectedParentsCount: number;

    @Field(() => [LwpPupilTag], { nullable: true })
    @AuthorizeField(TeacherField)
    tags: LwpPupilTag[];
}
