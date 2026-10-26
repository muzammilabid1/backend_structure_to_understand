import { registerEnumType } from '@nestjs/graphql';
import { DataImportLinkAction } from 'lwp-shared';

export { DataImportLinkAction };

registerEnumType(DataImportLinkAction, {
    name: 'DataImportLinkAction'
});
