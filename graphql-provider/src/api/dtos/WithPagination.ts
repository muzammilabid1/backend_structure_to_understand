import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class WithPagination {
    @Field()
    @AuthorizeField(UnrestrictedField)
    total: number;

    @Field()
    @AuthorizeField(UnrestrictedField)
    page_total: number;

    @Field()
    @AuthorizeField(UnrestrictedField)
    limit: number;

    @Field()
    @AuthorizeField(UnrestrictedField)
    offset: number;
}
