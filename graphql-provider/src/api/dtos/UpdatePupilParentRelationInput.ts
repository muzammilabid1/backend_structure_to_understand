import { Field, InputType } from '@nestjs/graphql';
import { PupilParentStatus } from 'lwp-shared';

import { LwpUser } from '../entities/user';

@InputType()
export class UpdatePupilParentRelationInput {
    @Field()
    parentId: string;

    @Field()
    pupilId: string;

    @Field()
    status: PupilParentStatus;

    @Field({ nullable: true })
    importedStudentContactID: string;

    @Field({ nullable: true })
    logUpdatedBy: LwpUser;

    @Field({ nullable: true })
    invitedBy: LwpUser;
}
