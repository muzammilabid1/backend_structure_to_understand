import type { LinkStatus } from 'src/data-import/types/link-status';

export type PupilLink = {
    id: string;
    status: LinkStatus;
    importedEntityId: string;
    platformEntityId: string;
    isHighConfidence: boolean;
    matchCriteria: number;
};

export type PupilLinkChoices = {
    importedPupil: {
        id: string;
        upn: string | null;
        firstName: string;
        lastName: string;
        dateOfBirth: Date | null;
    };
    links: Array<{
        status: LinkStatus;
        isHighConfidence: boolean;
        platformPupil: {
            id: string;
            upn: string | null;
            firstName: string;
            lastName: string;
            dateOfBirth: Date | null;
        };
    }>;
};
