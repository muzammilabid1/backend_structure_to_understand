import { ImageSourceType, PageAnnouncementUserOption } from 'lwp-shared';
import { IStaticLwpSchoolTag } from './IStaticLwpSchoolTag';

export interface IStaticLwpPageAnnouncement {
    id: string;
    message: string;
    title: string;
    priority: number;
    imageUrl: string | null;
    includeImage: boolean;
    imageType: ImageSourceType | null;
    isSeenByUser?: boolean;
    userOptions: PageAnnouncementUserOption[];
    targetPages?: string[];
    schoolTags?: IStaticLwpSchoolTag[];
}
