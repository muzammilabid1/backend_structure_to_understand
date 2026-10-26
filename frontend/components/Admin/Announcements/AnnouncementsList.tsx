/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { Box, Grid } from '@mui/material';
import { constants, PageAnnouncementUserOption } from 'lwp-shared';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import { convertEnumIntoMUISelectOptions } from '../../../shared/Services/handler';
import { IStaticLwpPageAnnouncement } from '../../../types/entities/IStaticLwpPageAnnouncement';
import { useLwpAppContext } from '../../AuthProvider';
import AnnouncementTargetPages from '../../Shared/Announcements/AnnouncementTargetPages';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonTag from '../../Shared/CommonTag';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import { getAllPageAnnouncements } from '.';
import { PAGE_GROUP_LABELS } from './AnnouncementForm';
import AnnouncementPreviewModal from './AnnouncementPreviewModal';

interface AnnouncementsListProps {
    title: string;
    announcements: Array<IStaticLwpPageAnnouncement>;
}
const initialActionState = {
    announcementId: null,
    isDeleteOpen: false,
    announcementPreviewOpen: false,
    announcement: null
};

const deletePageAnnouncement = gql`
    mutation deletePageAnnouncement($id: String!) {
        deletePageAnnouncement(id: $id) {
            status
            msg
        }
    }
`;

const USER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    convertEnumIntoMUISelectOptions(PageAnnouncementUserOption).map(({ key, value }) => [key, value])
);

/** "All pages", or a count of the pages that lists them on hover, grouped by who can open them. */
const AnnouncementPages = ({ targetPages }: { targetPages?: string[] }) => {
    const pages = constants.ANNOUNCEMENT_TARGET_PAGES.filter((page) => targetPages?.includes(page.route));

    if (!pages.length) return <AnnouncementTargetPages targetPages={targetPages} />;

    return (
        <CommonPopOver
            hover
            dataTest="announcement-target-page-count"
            childrenClass="announcement-pages-popover"
            element={<Paragraph customClass="ul" text={`${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`} />}>
            {Object.entries(PAGE_GROUP_LABELS).map(([audience, label]) => {
                const routes = pages.filter((page) => page.audience === audience).map((page) => page.route);

                return routes.length ? (
                    <Box key={audience}>
                        <Heading3 text={label} />
                        <AnnouncementTargetPages targetPages={routes} />
                    </Box>
                ) : null;
            })}
        </CommonPopOver>
    );
};

const AnnouncementsList = ({ title, announcements }: AnnouncementsListProps) => {
    const { callSnackbar } = useLwpAppContext();
    const [actionState, setActionState] = useState<{
        announcementId: string | null;
        isDeleteOpen: boolean;
        announcementPreviewOpen: boolean;
        announcement: IStaticLwpPageAnnouncement | null;
    }>(initialActionState);

    const [deletePageAnnouncementMutation, { loading: deleting }] = useMutation(deletePageAnnouncement);
    const router = useRouter();

    const handleDeleteAnnouncement = async () => {
        try {
            await deletePageAnnouncementMutation({
                variables: { id: actionState.announcementId },
                refetchQueries: [
                    {
                        query: getAllPageAnnouncements
                    }
                ],
                awaitRefetchQueries: true
            });
            callSnackbar('Announcement deleted successfully', 'success');
            setActionState(initialActionState);
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    const header = [
        {
            Header: 'Message title',
            accessor: 'col1'
        },
        {
            Header: 'User Types',
            accessor: 'col2'
        },
        {
            Header: 'Appearing on',
            accessor: 'col3'
        },
        {
            Header: '',
            accessor: 'col4'
        }
    ];

    const announcementRows = announcements.map((announcement) => ({
        col1: (
            <div className="announcement-message">
                {announcement?.imageUrl ? <img src={announcement?.imageUrl} alt="announcement" /> : null}
                <Paragraph customClass="page-announcement-title" text={announcement?.title} />
            </div>
        ),
        // An announcement with no user types is aimed at the chosen school tags only, and every user type there sees it.
        col2: announcement?.userOptions?.length ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }} data-test="announcement-user-types">
                {announcement.userOptions.map((userOption) => (
                    <CommonTag
                        key={userOption}
                        name={USER_TYPE_LABELS[userOption]}
                        dataTest="announcement-user-type"
                        sx={{ fontSize: '12px' }}
                    />
                ))}
            </Box>
        ) : (
            <Paragraph text="Any user type" dataTest="announcement-user-types" />
        ),
        col3: <AnnouncementPages targetPages={announcement?.targetPages} />,
        col4: (
            <CommonPopOver
                icon="more_horiz"
                className="announcement-menu"
                iconClassName="page-announcement-menu-icon"
                childrenClass="announcement-menu-popover">
                <CommonListWithIcon
                    list={[
                        {
                            text: 'Preview',
                            icon: 'visibility',
                            onClick: () => {
                                setActionState({
                                    ...initialActionState,
                                    announcementPreviewOpen: true,
                                    announcement
                                });
                            }
                        },
                        {
                            text: 'Edit',
                            icon: 'edit',
                            dataTest: `page-announcement-edit-button`,
                            onClick: () => router.push(`/admin/announcements/edit/${announcement?.id}`)
                        },
                        {
                            text: 'Delete',
                            icon: 'delete',
                            dataTest: `page-announcement-delete-button`,
                            onClick: () => {
                                setActionState({
                                    ...initialActionState,
                                    announcementId: announcement?.id,
                                    isDeleteOpen: true
                                });
                            }
                        }
                    ]}
                />
            </CommonPopOver>
        )
    }));

    return (
        <React.Fragment>
            <Grid container rowGap={2} className="admin-announcements-list">
                <Grid item xs={12}>
                    <Heading1 text={title} />
                </Grid>
                <Grid item xs={12}>
                    <CommonDraggableTable columns={header} rows={announcementRows} customClass="admin-announcements-table" />
                </Grid>
            </Grid>
            {actionState.isDeleteOpen ? (
                <ConfirmationModal
                    open={actionState.isDeleteOpen}
                    onCancel={() => setActionState(initialActionState)}
                    onConfirm={handleDeleteAnnouncement}
                    loading={deleting}
                />
            ) : null}

            {actionState.announcementPreviewOpen ? (
                <AnnouncementPreviewModal
                    announcement={actionState.announcement}
                    open={actionState.announcementPreviewOpen}
                    onClose={() => setActionState(initialActionState)}
                />
            ) : null}
        </React.Fragment>
    );
};

export default AnnouncementsList;
