import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { PupilSourceType } from './../types/pupil-source-type';

@ObjectType()
export class PupilClassInfo {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    yearGroup?: string;
}

@ObjectType()
export class PupilSummary {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    firstname: string;

    @Field()
    @AuthorizeField(TeacherField)
    lastname: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    dateOfBirth?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    UPN?: string;

    @Field(() => PupilSourceType)
    @AuthorizeField(TeacherField)
    sourceType: PupilSourceType;

    @Field(() => PupilClassInfo, { nullable: true })
    @AuthorizeField(TeacherField)
    pupilClass?: PupilClassInfo;

    /** Platform candidates only: true when this pupil was linked to the imported student before. */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isPreviouslyLinked?: boolean;
}
