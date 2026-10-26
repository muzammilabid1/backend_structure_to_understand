import type { LinkStatus } from 'src/data-import/types/link-status';

export type ClassLink = {
    id: string;
    status: LinkStatus;
    importedEntityId: string;
    platformEntityId: string;
    isHighConfidence: boolean;
};
