import { Field, InputType } from '@nestjs/graphql';

import { LwpPupil } from '../entities/pupil';
import { LwpUser } from '../entities/user';

@InputType()
export class PupilInvitationForParentEmailInput {
    @Field()
    user: LwpUser;

    @Field()
    pupil: LwpPupil;

    @Field({ nullable: true })
    schoolId: string;

    @Field({ nullable: true, defaultValue: false })
    isBulkProcess: boolean;

    @Field({ nullable: true })
    invitedBy: LwpUser;
}
