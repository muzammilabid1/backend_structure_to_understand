import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpPupil } from '../entities/pupil';
import { DateOnly } from '../entities/scalar/DateOnly.scalar';
import { ClassTopicStatistics } from '../model';

@ObjectType()
export class ClassTopicForClassDetailPageOutput {
    @Field()
    @AuthorizeField(TeacherField)
    topicId: string;

    @Field()
    @AuthorizeField(TeacherField)
    staticTopicId: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    nextTopicId: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    previousTopicId: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    teacherTopicName: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    teacherMessage: string;

    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(TeacherField)
    releaseDate: Date;

    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(TeacherField)
    dueDate: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isReleased: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    teacherPdf: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isRegisterationClassTopic: boolean;

    @Field(() => [ClassPupilTopicOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    pupilTopics: ClassPupilTopicOutput[];

    @Field(() => ClassTopicStatistics, { nullable: true })
    @AuthorizeField(TeacherField)
    statistics: ClassTopicStatistics;

    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    topicWillReleasedFor: LwpPupil[];

    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    topicNotSetFor: LwpPupil[];

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    schoolClassName: string;

    //* For reading topic fields *//
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingTarget?: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    activeDateString?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingStartDay?: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingNote?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    scrapbookPrompt: string;
}

@ObjectType()
export class ClassPupilTopicOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    watchedVideo: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    totalEarnedStars: number;

    @Field(() => [PupilActivityOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    activities: PupilActivityOutput[];

    @Field(() => LwpPupil, { nullable: true })
    @AuthorizeField(TeacherField)
    pupil: LwpPupil;

    //* For reading topic fields *//
    @Field(() => [PupilTopicFeedbackOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    feedbacks: PupilTopicFeedbackOutput[];

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    silverStars: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    earnedGoldStar: boolean;
}

@ObjectType()
export class PupilActivityOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    earnedStar: boolean;
}

@ObjectType()
export class PupilTopicFeedbackOutput {
    @Field()
    @AuthorizeField(TeacherField)
    bookReadAt: string;

    @Field()
    @AuthorizeField(TeacherField)
    isReadAtHome: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    isReadAtSchool: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    isReadingWithGroup: boolean;
}
