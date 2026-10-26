import { gql, useQuery } from '@apollo/client';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CircularProgress, Collapse, Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getChildRoute, handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonStatus from '../../Shared/CommonStatus';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

const getPupils = gql`
    query getPupils($parentId: String!, $isActiveInCurrentAcademic: Boolean!) {
        getPupils(parentId: $parentId, isActiveInCurrentAcademic: $isActiveInCurrentAcademic) {
            id
            fullname
            type
            school {
                schoolName
            }
        }
    }
`;

const InactivePupil = () => {
    const router = useRouter();
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const [open, setOpen] = useState(false);

    const {
        loading,
        error,
        data: pupils
    } = useQuery(getPupils, {
        variables: { parentId: queryParams?.user_id, isActiveInCurrentAcademic: false },
        skip: !(router?.isReady && open)
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    return (
        <CommonCard
            sx={{
                mt: '36px',
                width: '100%'
            }}
            background="#F5F5F5">
            <Grid container py={1}>
                <Grid
                    onClick={() => setOpen(!open)}
                    container
                    justifyContent={'center'}
                    display={'flex'}
                    alignItems={'center'}
                    gap={2}
                    className="cp">
                    {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    <Heading1 text="Not active this year" />
                </Grid>

                <Collapse
                    in={open}
                    unmountOnExit
                    sx={{
                        width: '100%'
                    }}>
                    <Grid mt={3} mb={2} textAlign={'center'}>
                        These children are not assigned to a class in the current academic year
                    </Grid>

                    {loading && !pupils?.getPupils && (
                        <Grid container justifyContent={'center'} my={4}>
                            <CircularProgress />
                        </Grid>
                    )}

                    <Grid container spacing={3}>
                        {pupils?.getPupils?.map((child) => {
                            return (
                                <Grid item lg={6} md={6} sm={12} xs={12} className="cp" onClick={() => router?.push(getChildRoute(child))}>
                                    <CommonCard
                                        sx={{
                                            position: 'relative'
                                        }}>
                                        <Grid
                                            className="inactive_child_border"
                                            display={'flex'}
                                            justifyContent={'space-between'}
                                            alignItems={'center'}
                                            my={1}
                                            px={1}>
                                            <Grid>
                                                <Heading2 text={child?.fullname ?? ''} fontSize="16px" />
                                                <Paragraph>{child?.school?.schoolName ?? ''}</Paragraph>
                                            </Grid>
                                            <Grid>
                                                <ArrowForwardIosIcon />
                                            </Grid>
                                        </Grid>
                                    </CommonCard>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {!loading && pupils?.getPupils.length == 0 && (
                        <Grid container justifyContent={'center'} my={4}>
                            <CommonStatus
                                className="no_feed"
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                                imageAlt={''}
                                heading={'Nothing to show here'}
                            />
                        </Grid>
                    )}
                </Collapse>
            </Grid>
        </CommonCard>
    );
};

export default InactivePupil;
