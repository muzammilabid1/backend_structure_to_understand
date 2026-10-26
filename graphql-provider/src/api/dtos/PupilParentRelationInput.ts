import { Field, InputType } from '@nestjs/graphql';
import { PupilParentStatus } from 'lwp-shared';

import { LwpPupil } from '../entities/pupil';
import { LwpUser } from '../entities/user';

@InputType()
export class PupilParentRelationInput {
    @Field()
    parent: LwpUser;

    @Field({ nullable: true })
    invitedBy: LwpUser;

    @Field()
    pupil: LwpPupil;

    @Field({ nullable: true })
    importedStudentContactID: string;

    @Field()
    status: PupilParentStatus;
}
