import { Field, InputType } from '@nestjs/graphql';

import { DataImportLinkAction } from '../types/data-import-link-action';

@InputType()
export class UpdatePupilLinkRequestsInput {
    @Field()
    importedStudentId: string;

    @Field({ nullable: true })
    platformPupilId: string;

    @Field(() => DataImportLinkAction)
    action: DataImportLinkAction;
}
