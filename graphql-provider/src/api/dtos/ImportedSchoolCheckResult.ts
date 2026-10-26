import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class ImportedSchoolCheckResult {
    @Field(() => [ParentChangesResult], { nullable: true })
    @AuthorizeField(TeacherField)
    parentChanges?: ParentChangesResult[];

    @Field(() => [[String]], { nullable: true })
    @AuthorizeField(TeacherField)
    missedMatches?: [string, string][];
}

/**
 * The TypeScript definition for this is so much nicer:
 * { [K in `${'imported' | 'lwp'}${'Name' | 'Email' | 'Phone'}s`]: string[] }
 * However, Nest GraphQL doesn't support generating a schema type from that.
 * Sad face :(
 */
@ObjectType()
export class ParentChangesResult {
    @Field()
    pupilId: string;

    @Field()
    pupilName: string;

    @Field(() => [String], { nullable: 'itemsAndList' })
    importedNames: string[];

    @Field(() => [String], { nullable: 'itemsAndList' })
    importedEmails?: string[];

    @Field(() => [String], { nullable: 'itemsAndList' })
    importedPhones?: string[];

    @Field(() => [String], { nullable: 'itemsAndList' })
    lwpNames: string[];

    @Field(() => [String], { nullable: 'itemsAndList' })
    lwpEmails?: string[];

    @Field(() => [String], { nullable: 'itemsAndList' })
    lwpPhones?: string[];
}
