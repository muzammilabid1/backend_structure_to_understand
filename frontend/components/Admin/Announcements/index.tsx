import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';

import { handleErrorSnackbar } from '../../../shared/Services/handler';
import { IStaticLwpPageAnnouncement } from '../../../types/entities/IStaticLwpPageAnnouncement';
import { useLwpAppContext } from '../../AuthProvider';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import Heading1 from '../../Shared/Typography/Heading1';
import AnnouncementsList from './AnnouncementsList';

export const getAllPageAnnouncements = gql`
    query getAllPageAnnouncements {
        getAllPageAnnouncements {
            id
            message
            title
            imageUrl
            targetPages
            userOptions
        }
    }
`;

const Announcements = () => {
    const router = useRouter();

    const { callSnackbar } = useLwpAppContext();
    const { data, loading, error: announcementsError } = useQuery(getAllPageAnnouncements);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, announcementsError);
    }, [announcementsError]);

    const announcements: Array<IStaticLwpPageAnnouncement> = useMemo(() => data?.getAllPageAnnouncements || [], [data]);

    return (
        <div className="admin-announcements" data-test="page-announcements-page">
            <Grid container alignItems="center" justifyContent="space-between" className="admin-announcements-header">
                <Grid item>
                    <Heading1 text="Page announcements" />
                </Grid>
                <Grid item>
                    <LWPButton
                        btnText="Add a message"
                        dataTest="add-page-announcement-button"
                        endIcon="add"
                        onClick={() => router.push('/admin/announcements/create')}
                    />
                </Grid>
            </Grid>
            {loading ? (
                <CommonLoading />
            ) : (
                <div>
                    <AnnouncementsList title="Currently active" announcements={announcements} />
                </div>
            )}
        </div>
    );
};

export default Announcements;
