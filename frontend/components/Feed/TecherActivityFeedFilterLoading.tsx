import { Grid, Skeleton } from '@mui/material';
import React from 'react';

import CommonCard from '../Shared/Cards/CommonCard';

type TecherActivityFeedFilterLoadingProps = {
    open: boolean;
};

const TecherActivityFeedFilterLoading = ({ open }: TecherActivityFeedFilterLoadingProps) => {
    return (
        <CommonCard>
            <Grid mb={2}>
                {open && (
                    <Skeleton
                        width={115}
                        height={16}
                        sx={{
                            marginBottom: '16px'
                        }}
                    />
                )}
                <Skeleton height={40} />
            </Grid>

            <Grid mb={2}>
                {open && (
                    <Skeleton
                        width={115}
                        height={16}
                        sx={{
                            marginBottom: '16px'
                        }}
                    />
                )}
                <Skeleton height={40} />
            </Grid>
            {open && (
                <Grid container spacing={1} alignItems={'center'} justifyContent={'space-between'} mb={2}>
                    <Grid item lg={5}>
                        <Skeleton
                            width={115}
                            height={16}
                            sx={{
                                marginBottom: '16px'
                            }}
                        />
                        <Skeleton height={40} />
                    </Grid>
                    <Grid item lg={6}>
                        <Skeleton height={40} />
                    </Grid>
                </Grid>
            )}

            {open && (
                <Grid container spacing={1} mb={2}>
                    <Grid item lg={4}>
                        <Skeleton
                            width={115}
                            height={16}
                            sx={{
                                marginBottom: '16px'
                            }}
                        />
                        <Skeleton height={40} />
                    </Grid>
                    <Grid item lg={8}>
                        <Skeleton
                            width={115}
                            height={16}
                            sx={{
                                marginBottom: '16px'
                            }}
                        />
                        <Skeleton height={40} />
                    </Grid>
                </Grid>
            )}
            <Grid display={'flex'} justifyContent={'space-between'}>
                <Skeleton width={200} height={40} />
                <Skeleton width={200} height={40} />
            </Grid>
        </CommonCard>
    );
};

export default TecherActivityFeedFilterLoading;
