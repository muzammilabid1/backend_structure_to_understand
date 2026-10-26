import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ThisWeekAndLastWeekReadingLogOutput } from './ThisWeekAndLastWeekReadingOutput';

@ObjectType()
export class ClassReadingPageWithPupilOutput {
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
    recentPupilTopicId: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastRead: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastReadAtSchool: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastReadAtHome: Date;

    @Field(() => ThisWeekAndLastWeekReadingLogOutput)
    @AuthorizeField(TeacherField)
    pupilReadingLogFeedbacks: ThisWeekAndLastWeekReadingLogOutput;
}
