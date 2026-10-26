import { Field, InputType } from '@nestjs/graphql';

import { DataImportLinkAction } from '../types/data-import-link-action';

@InputType()
export class UpdateClassLinkRequestsInput {
    @Field()
    importedSchoolClassId: string;

    @Field({ nullable: true })
    platformSchoolClassId: string;

    @Field(() => DataImportLinkAction)
    action: DataImportLinkAction;
}
