import { ContentStatus, UserType } from 'lwp-shared';

export interface IStaticLwpFeatureTooltip {
    id: string;
    name: string;
    targetId: string;
    order: number;
    userTypes: UserType[];
    message: string;
    imageUrl?: string;
    status: ContentStatus;
}
