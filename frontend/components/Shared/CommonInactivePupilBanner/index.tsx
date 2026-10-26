/* eslint-disable @next/next/no-img-element */
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonCard from '../Cards/CommonCard';
import CommonPopOver from '../CommonPopOver';

type CommonInactivePupilBannerProps = {
    pupil: {
        pupil: {
            firstname?: string;
        };
    };
};

const CommonInactivePupilBanner = ({ pupil }: CommonInactivePupilBannerProps) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Grid container my={'36px'} mb={smbp && 1}>
            <CommonCard background="#F5F5F5" cardClassName="inactive_pupil_banner_container">
                <Grid container justifyContent={'center'} alignItems={'center'} gap={1}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/show_inactive_pupil.svg`}
                        alt={`Sticker`}
                    />
                    {smbp ? (
                        <Grid maxWidth={220}>This pupil is not assigned to a class in the current academic year.</Grid>
                    ) : (
                        <>
                            {pupil?.pupil?.firstname} is not currently in a class
                            <CommonPopOver hover element={<InfoOutlinedIcon sx={{ color: '#0083CB' }} />}>
                                <Grid maxWidth={509}>
                                    {pupil?.pupil?.firstname} has not been assigned to any class or group in the current academic year, so
                                    will not be set any activities. You can still access their previous work on the platform. If this is a
                                    mistake, please talk to your school or setting.
                                </Grid>
                            </CommonPopOver>
                        </>
                    )}
                </Grid>
            </CommonCard>
        </Grid>
    );
};

export default CommonInactivePupilBanner;
