import { IStaticLwpPageAnnouncement } from '../../../types/entities/IStaticLwpPageAnnouncement';
import AnnouncementTargetPages from '../../Shared/Announcements/AnnouncementTargetPages';
import AnnouncementCard from '../../Shared/Cards/AnnouncementCard';
import DialogWrapper from '../../Shared/DialogWrapper';
import Heading3 from '../../Shared/Typography/Heading3';

interface AnnouncementPreviewModalProps {
    announcement: IStaticLwpPageAnnouncement;
    open: boolean;
    onClose: () => void;
}

const AnnouncementPreviewModal = ({ announcement, open, onClose }: AnnouncementPreviewModalProps) => {
    return (
        <DialogWrapper
            heading={'Message preview'}
            open={open}
            dialogFooter
            primaryBtnHandler={onClose}
            primaryBtnText={'Close'}
            onClose={onClose}
            setOpen={onClose}
            contentWidth="800px">
            <AnnouncementCard announcement={announcement} />
            <div className="mt3">
                <Heading3 text="Appearing on" />
                <AnnouncementTargetPages targetPages={announcement?.targetPages} dataTest="announcement-preview-target-pages" />
            </div>
        </DialogWrapper>
    );
};

export default AnnouncementPreviewModal;
