/* eslint-disable @next/next/no-img-element */

import { IStaticLwpPageAnnouncement } from '../../../types/entities/IStaticLwpPageAnnouncement';
import CommonIconButton from '../Button/CommonIconButton';
import RenderHtml from '../CommonRenderHtml';

interface AnnouncementCardProps {
    announcement: IStaticLwpPageAnnouncement;
    handleClick?: () => void;
    icon?: string;
    toolTipTitle?: string;
    isDismissable?: boolean;
    isSeen?: boolean;
    isInDrawer?: boolean;
}

const AnnouncementCard = ({
    announcement,
    handleClick = () => {},
    toolTipTitle,
    isDismissable = true,
    isInDrawer = false
}: AnnouncementCardProps) => {
    return (
        <div className={`announcement-card ${announcement?.isSeenByUser ? 'seen-announcement' : ''}`}>
            <div>
                {announcement?.imageUrl ? <img src={announcement.imageUrl} alt="announcement-image" /> : null}
                <RenderHtml
                    className={`announcement-message ${announcement?.isSeenByUser ? 'announcementSeen' : 'announcementUnseen'}`}
                    dataTest={isInDrawer ? 'page-announcement-card-drawer-message' : 'page-announcement-card-message'}
                    text={announcement?.message}
                />
            </div>
            {isDismissable ? (
                <CommonIconButton
                    icon={'close'}
                    dataTest="page-announcement-card-close-button"
                    onClick={handleClick}
                    toolTipTitle={toolTipTitle}
                />
            ) : null}
        </div>
    );
};

export default AnnouncementCard;
