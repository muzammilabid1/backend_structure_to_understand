import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class PupilFeedbackHistoryOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    userType: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    pupilCount: number;

    @Field()
    @AuthorizeField(UnrestrictedField)
    bookReadAt: Date;
}
