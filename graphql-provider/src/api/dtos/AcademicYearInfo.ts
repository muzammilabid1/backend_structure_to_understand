import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class AcademicYearInfo {
    @Field()
    @AuthorizeField(UnrestrictedField)
    shortName: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isInCurrentAcademicYear: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isInPreviousAcademicYear: boolean;
}
