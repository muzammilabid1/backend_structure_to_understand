import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class PresignedUrlOutput {
    @Field(() => String)
    @AuthorizeField(UnrestrictedField)
    url: string;

    @Field(() => String)
    @AuthorizeField(UnrestrictedField)
    token: string;
}
