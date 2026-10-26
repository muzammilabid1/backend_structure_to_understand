import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ClassTopicStatistics } from '../model';
import { PupilReadingLogFeedbacksOutput } from './PupilReadingLogFeedbacksOutput';

@ObjectType()
export class ReadingTopicOutput {
    @Field()
    @AuthorizeField(TeacherField)
    activeDateString: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isReleased: boolean;

    @Field(() => ClassTopicStatistics)
    @AuthorizeField(TeacherField)
    readingStatistics: ClassTopicStatistics;

    @Field(() => [PupilReadingLogFeedbacksOutput])
    @AuthorizeField(TeacherField)
    pupilReadingLogFeedbacks: PupilReadingLogFeedbacksOutput[];

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    classReadingTarget: number;
}
