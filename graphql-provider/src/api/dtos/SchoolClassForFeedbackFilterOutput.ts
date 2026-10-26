import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class SchoolClassForFeedbackFilterOutput {
    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    id: string;

    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    name: string;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    isMyClass: boolean;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    isGroupAcrossClasses: boolean;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    hasReadingTopics: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    topicCount: number;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    hasCurrentTopic: boolean;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    isReadyTeddyEnabled: boolean;

    @Field(() => [ClassGroupForFeedbackFilterOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    classGroups: ClassGroupForFeedbackFilterOutput[];

    @Field(() => [SubjectForFeedbackFilterOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    subjects: SubjectForFeedbackFilterOutput[];
}

@ObjectType()
export class ClassGroupForFeedbackFilterOutput {
    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    id: string;

    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    name: string;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    hasReadingTopics: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    topicCount: number;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    hasCurrentTopic: boolean;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    isReadyTeddyEnabled: boolean;

    @Field(() => [SubjectForFeedbackFilterOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    subjects: SubjectForFeedbackFilterOutput[];
}

@ObjectType()
export class SubjectForFeedbackFilterOutput {
    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    id: string;

    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    name: string;

    @Field(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    programmeType: string;
}
