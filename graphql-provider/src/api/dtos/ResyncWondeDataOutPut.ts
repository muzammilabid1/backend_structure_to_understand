import { Field, ObjectType } from '@nestjs/graphql';
import { ImportStatus } from 'lwp-shared';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class ResyncWondeDataOutPut {
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    importStatus: ImportStatus | null;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastImportedAt: Date | null;
}
