import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class SchoolTermsForSchoolImpactReportOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    termName: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    hasReadingReport: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    hasTopicAndActivityReport: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    hasVersion2Report: boolean;
}
