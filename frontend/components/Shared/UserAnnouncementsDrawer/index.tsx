import { useLazyQuery } from '@apollo/client';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { Badge, Drawer, Grid, Tooltip } from '@mui/material';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { getAllPageAnnouncementsForUser, getPageAnnouncementsForAllUsers } from '../../../graphQl/queries';
import { getCookie } from '../../../lib/manageCookies';
import { isViewAsMode } from '../../../shared/Services/handler';
import { IStaticLwpPageAnnouncement } from '../../../types/entities/IStaticLwpPageAnnouncement';
import { useLwpAppContext } from '../../AuthProvider';
import CommonIconButton from '../Button/CommonIconButton';
import AnnouncementCard from '../Cards/AnnouncementCard';
import CommonLoading from '../CommonLoading';
import Heading2 from '../Typography/Heading2';

const UserAnnouncementsDrawer = () => {
    const pathname = usePathname();
    const { token, userAnnouncementContext } = useLwpAppContext();
    const [announcements, setAnnouncements] = useState<IStaticLwpPageAnnouncement[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [fetchAllPageAnnouncementsForUser, { loading }] = useLazyQuery(getAllPageAnnouncementsForUser, {
        fetchPolicy: 'cache-first'
    });

    const [fetchAnnouncementsForUnAuthenticatedPages, { loading: allAnnouncementLoading }] = useLazyQuery(getPageAnnouncementsForAllUsers, {
        fetchPolicy: 'cache-first'
    });

    // Skip rendering if in view-as mode
    if (isViewAsMode(token?.userType, pathname)) return null;

    const fetchAnnouncements = async () => {
        setIsDrawerOpen(true);
        if (token?.sub) {
            const { data } = await fetchAllPageAnnouncementsForUser({
                variables: { id: token.sub }
            });

            setAnnouncements(data?.getAllPageAnnouncementsForUser || []);
        } else {
            const { data } = await fetchAnnouncementsForUnAuthenticatedPages();
            const seenAnnouncementIds: Array<string> = JSON.parse(getCookie('seenAnnouncementIds') || null) || [];

            const mappedAnnouncements = data?.getPageAnnouncementsForAllUsers?.map((announcement: IStaticLwpPageAnnouncement) => ({
                ...announcement,
                isSeenByUser: seenAnnouncementIds.includes(announcement?.id)
            }));

            setAnnouncements(mappedAnnouncements || []);
        }
    };

    return (
        <>
            <Tooltip title="All notifications">
                <span className="notification-icon" onClick={fetchAnnouncements}>
                    <Badge
                        badgeContent={userAnnouncementContext?.unreadCount > 0 ? userAnnouncementContext?.unreadCount : null}
                        color="primary"
                        data-test={'notification-badge'}>
                        <NotificationsActiveOutlinedIcon />
                    </Badge>
                </span>
            </Tooltip>

            <Drawer
                transitionDuration={300}
                anchor="right"
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                className="all-announcements-drawer">
                <div className="all-announcements-drawer-container">
                    <div className="all-announcements-drawer-header">
                        <Heading2 text="All Notifications" />
                        <CommonIconButton
                            dataTest="all-announcements-drawer-close-button"
                            icon="close"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                    </div>
                    <hr />
                    {loading || allAnnouncementLoading ? (
                        <CommonLoading />
                    ) : (
                        <Grid container rowGap={2}>
                            {announcements?.map((announcement) => (
                                <Grid item xs={12} key={announcement.id} data-test="announcement-drawer-item">
                                    <AnnouncementCard
                                        announcement={announcement}
                                        isDismissable={false}
                                        isSeen={announcement?.isSeenByUser}
                                        isInDrawer
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </div>
            </Drawer>
        </>
    );
};

export default UserAnnouncementsDrawer;
