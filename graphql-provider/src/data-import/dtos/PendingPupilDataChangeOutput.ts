import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ChangeOperation } from '../types/change-operation';
import { ChangeStatus } from '../types/change-status';
import { PupilSummary } from './PupilSummary';

@ObjectType()
export class ProposedChange {
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    id?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    fieldName?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    proposedValue?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    registrationClassName?: string;

    @Field(() => ChangeStatus, { nullable: true })
    @AuthorizeField(TeacherField)
    status?: ChangeStatus;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    rejectedImportedAt?: Date | null;
}

@ObjectType()
export class PendingPupilDataChangeOutput {
    @Field(() => ChangeOperation)
    @AuthorizeField(TeacherField)
    operation: ChangeOperation;

    @Field()
    @AuthorizeField(TeacherField)
    changeCount: string;

    @Field(() => PupilSummary, { nullable: true })
    @AuthorizeField(TeacherField)
    pupil?: PupilSummary;

    @Field(() => [ProposedChange])
    @AuthorizeField(TeacherField)
    proposedChange: ProposedChange[];
}
