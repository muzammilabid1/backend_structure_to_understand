import { gql, useMutation, useQuery } from '@apollo/client';
import { behaviour } from 'lwp-shared';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getAllPageAnnouncementsForUser, getPageAnnouncementsForAllUsers } from '../../../graphQl/queries';
import { getCookie, setCookie } from '../../../lib/manageCookies';
import { isViewAsMode } from '../../../shared/Services/handler';
import { IStaticLwpPageAnnouncement } from '../../../types/entities/IStaticLwpPageAnnouncement';
import { useLwpAppContext } from '../../AuthProvider';
import AnnouncementCard from '../Cards/AnnouncementCard';

const seenPageAnnouncement = gql`
    mutation seenPageAnnouncement($id: String!, $seenById: String!) {
        seenPageAnnouncement(id: $id, seenById: $seenById)
    }
`;

const getUserForPageAnnouncement = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            userAnnouncementContext {
                hasAnnouncements
            }
            unSeenPageAnnouncements {
                id
                message
                imageUrl
                targetPages
            }
        }
    }
`;

let lastFetchedAt: moment.Moment = null;

interface AnnouncementsProps {
    /** The route to match target pages against, for screens shown in place of the page (the login screen). */
    route?: string;
}

const Announcements = ({ route }: AnnouncementsProps) => {
    const [unSeenAnnouncement, setUnseenAnnouncement] = useState<IStaticLwpPageAnnouncement[]>([]);
    const { token, callSnackbar, setUserAnnouncementContext } = useLwpAppContext();
    const [seenPageAnnouncementMutation, { loading }] = useMutation(seenPageAnnouncement);
    const pathname = usePathname();
    const router = useRouter();
    // Target pages are route templates (`/school/[school_id]/feed`), which `router.pathname` reports and `usePathname()` does not.
    const currentRoute = route ?? router?.pathname;
    const shouldUseCache = lastFetchedAt && moment().diff(lastFetchedAt, 'minutes') < 5;
    const seenAnnouncementIds: Array<string> = JSON.parse(getCookie('seenAnnouncementIds') || null) || [];

    const viewer = behaviour.announcementPages.getAnnouncementViewer(token);

    const announcementsForPage = unSeenAnnouncement.filter((announcement) =>
        behaviour.announcementPages.isAnnouncementShownOnRoute(announcement?.targetPages, currentRoute, viewer)
    );

    const shouldAnnouncementBeShown = () => {
        if (pathname?.startsWith('/welcome')) return false;

        if (isViewAsMode(token?.userType, pathname)) return false; // when teacher view as parent then teacher announcement should not be shown to the parent side

        return true;
    };

    // The bell counts only what the banner can show here, so it never shows a number the user cannot clear on this page.
    const unreadCount = shouldAnnouncementBeShown() ? announcementsForPage.length : 0;

    useEffect(() => {
        setUserAnnouncementContext((prev) => ({ ...prev, unreadCount }));
    }, [unreadCount]);

    // Pages the user may not open render without the banner but still show the bell, so it must not keep the last page's count.
    useEffect(() => () => setUserAnnouncementContext((prev) => ({ ...prev, unreadCount: 0 })), []);

    // This is for authenticated user
    const { data: userData } = useQuery(getUserForPageAnnouncement, {
        variables: { id: token?.sub },
        fetchPolicy: shouldUseCache ? 'cache-first' : 'network-only',
        nextFetchPolicy: 'cache-first',
        skip: !token?.sub
    });

    useEffect(() => {
        if (userData?.getUser) {
            const user = userData.getUser;

            lastFetchedAt = moment();
            setUnseenAnnouncement(user?.unSeenPageAnnouncements || []);
            setUserAnnouncementContext((prev) => ({ ...prev, hasAnnouncements: user?.userAnnouncementContext?.hasAnnouncements }));
        }
    }, [userData]);

    // This is for non-authenticated user
    const { data: allUsersData } = useQuery(getPageAnnouncementsForAllUsers, {
        fetchPolicy: shouldUseCache ? 'cache-first' : 'network-only',
        nextFetchPolicy: 'cache-first',
        skip: token?.sub
    });

    useEffect(() => {
        if (allUsersData) {
            lastFetchedAt = moment();
            const announcements: IStaticLwpPageAnnouncement[] = allUsersData?.getPageAnnouncementsForAllUsers || [];

            const filteredAnnouncements = announcements?.filter((announcement) => !seenAnnouncementIds.includes(announcement?.id));

            setUnseenAnnouncement(filteredAnnouncements);
            setUserAnnouncementContext((prev) => ({ ...prev, hasAnnouncements: announcements?.length > 0 }));
        }
    }, [allUsersData]);

    const handleRead = () => {
        if (loading) return;

        // The banner shows the first announcement for this page, so that is the one to mark seen.
        const announcementToBeRead = announcementsForPage[0];

        setTimeout(async () => {
            if (token) {
                try {
                    setUnseenAnnouncement((prev) => prev.filter((a) => a.id !== announcementToBeRead?.id));

                    await seenPageAnnouncementMutation({
                        variables: { id: announcementToBeRead?.id, seenById: token?.sub },
                        refetchQueries: [
                            {
                                query: getUserForPageAnnouncement,
                                variables: { id: token?.sub }
                            },
                            {
                                query: getAllPageAnnouncementsForUser,
                                variables: { id: token?.sub }
                            }
                        ],
                        awaitRefetchQueries: true
                    });
                } catch (e) {
                    callSnackbar(e, 'error');
                    setUnseenAnnouncement((prev) => [announcementToBeRead, ...prev]);
                }
            } else {
                const updatedSeenAnnouncementIds = [...seenAnnouncementIds, announcementToBeRead?.id];

                setCookie('seenAnnouncementIds', JSON.stringify(updatedSeenAnnouncementIds));
                setUnseenAnnouncement((prev) => prev.filter((a) => a?.id !== announcementToBeRead?.id));
            }
        }, 300);
    };

    if (!announcementsForPage.length || !shouldAnnouncementBeShown()) return null;

    return (
        <div className="mt3 mb8">
            <AnnouncementCard
                announcement={announcementsForPage[0]}
                handleClick={handleRead}
                toolTipTitle={loading ? 'Loading...' : null}
            />
        </div>
    );
};

export default Announcements;
