import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class ScrapbookReadyTeddyTopicOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string; // pupil topic id

    @Field()
    @AuthorizeField(UnrestrictedField)
    scrapbookPrompt: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    haveScrapbookEntry: boolean;
}
