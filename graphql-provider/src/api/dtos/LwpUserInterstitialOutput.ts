import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class LwpUserInterstitialOutput {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    optedOut: boolean;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    userInterstitialId: string;
}
