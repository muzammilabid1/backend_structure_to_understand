import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { ReadingType } from '../model';
import { WithPagination } from './WithPagination';

@ObjectType()
export class PupilBookHistoryOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    bookName: string;

    @Field({ defaultValue: ReadingType.SOMETHING_ELSE })
    @AuthorizeField(UnrestrictedField)
    readingType: ReadingType;

    @Field({ defaultValue: false })
    @AuthorizeField(UnrestrictedField)
    isReadAtHome: boolean;

    @Field({ defaultValue: false })
    @AuthorizeField(UnrestrictedField)
    isReadAtSchool: boolean;

    @Field({ defaultValue: false })
    @AuthorizeField(UnrestrictedField)
    isReadingWithGroup: boolean;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    isBookFinished: boolean;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pageNumber: string;

    @Field({ defaultValue: 0 })
    @AuthorizeField(UnrestrictedField)
    logCount: number;
}

@ObjectType()
export class PupilBookHistorySummaryOutput {
    @Field({ defaultValue: 0 })
    @AuthorizeField(UnrestrictedField)
    distinctBooks: number;
}

@ObjectType()
export class PupilBookHistoryPaginatedOutput extends WithPagination {
    @Field(() => [PupilBookHistoryOutput])
    @AuthorizeField(UnrestrictedField)
    results: PupilBookHistoryOutput[];

    @Field(() => PupilBookHistorySummaryOutput)
    @AuthorizeField(UnrestrictedField)
    currentAcademicYearSummary: PupilBookHistorySummaryOutput;
}

@ObjectType()
export class PupilBookOutput extends PupilBookHistoryOutput {}
