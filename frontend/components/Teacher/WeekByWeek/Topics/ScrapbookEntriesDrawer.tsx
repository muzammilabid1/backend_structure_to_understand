import { gql, useQuery } from '@apollo/client';
import { createTheme, Divider, Drawer, Grid, StyledEngineProvider, ThemeProvider } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS, SCRAPBOOK } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import AudioPlayer from '../../../Shared/AudioPlayer';
import CommonActivityFeedCard from '../../../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../../../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import CommonTooltipIcon from '../../../Shared/CommonTooltipIcon';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading2 from '../../../Shared/Typography/Heading2';

export const getScrapbookFeedbacksQuery = gql`
    query getScrapbookFeedbacks($pupilId: String!) {
        getScrapbookFeedbacks(pupilId: $pupilId) {
            id
            comment
            logCreatedAt
            userId
            userType
            type
            sharingAllowed
            scrapbookPrompt
            pupil {
                id
                fullname
            }
            audios {
                id
                filename
            }
            photos {
                id
                filename
            }
            feedbackReplies {
                id
                reply
                logCreatedAt
                logUpdatedAt
                originalFeedbackReplyId
                originalFeedbackReplyDeletedAt
                type
                sticker {
                    alt
                    imageUrl
                }
                logCreatedBy {
                    nameForChildren
                }
            }
            tickedAt
            tickedBy {
                nameForChildren
            }
            lastAction {
                updatedAt
            }
            entryDeletedAt
            originalFeedbackId
        }
    }
`;

const muiTheme = createTheme({});

interface DrawerState {
    pupilFullname: string | null;
    pupilId: string | null;
    open: boolean;
}

interface ScrapbookEntriesDrawerProps {
    drawerState: DrawerState;
    schoolClass: ILwpSchoolClassDetails;
    handleOnClose: () => void;
}

const ScrapbookEntriesDrawer = ({ drawerState, handleOnClose, schoolClass }: ScrapbookEntriesDrawerProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [feeds, setFeeds] = useState([]);

    const { loading, error, data } = useQuery(getScrapbookFeedbacksQuery, {
        variables: {
            pupilId: drawerState?.pupilId
        }
    });

    useEffect(() => {
        setFeeds(data?.getScrapbookFeedbacks);
    }, [data]);

    useEffect(() => {
        handleErrorSnackbar(error, callSnackbar);
    }, [error]);

    return (
        <Drawer
            variant="temporary"
            className="common_list pupil-feedback-entries-drawer"
            ModalProps={{
                keepMounted: false
            }}
            anchor={'right'}
            open={drawerState?.open}
            onClose={handleOnClose}>
            <Grid p={4} width={{ md: 706, xs: 375 }}>
                <Grid container justifyContent={'space-between'} alignItems={'center'}>
                    <Heading2 text={`${drawerState?.pupilFullname}’s Scrapbook`} />
                    <CommonTooltipIcon icon={'closed'} text={null} onClick={handleOnClose} />
                </Grid>

                <Divider sx={{ my: 3 }} />

                {loading ? (
                    <CommonLoading />
                ) : (
                    <>
                        {(feeds || []).map((feedback) => {
                            return (
                                <CommonActivityFeedCard
                                    key={feedback.id}
                                    customClass={`history_log_feed home-icon`}
                                    type={SCRAPBOOK}
                                    thumb_up={false}
                                    feedback={feedback}
                                    activityContentImg={feedback?.photos?.[0]?.filename}
                                    classDate={feedback.logCreatedAt}
                                    classTitle=""
                                    setFeeds={setFeeds}
                                    previousDataLength={feeds.length}
                                    user={schoolClass}
                                    description={
                                        feedback?.audios?.length > 0 ? (
                                            <div>
                                                <FeedbackCommentCard>
                                                    <Heading1 text="Audio recording" />
                                                    <StyledEngineProvider injectFirst>
                                                        <ThemeProvider theme={muiTheme}>
                                                            <AudioPlayer src={feedback.audios[0].filename} />
                                                        </ThemeProvider>
                                                    </StyledEngineProvider>
                                                </FeedbackCommentCard>
                                            </div>
                                        ) : null
                                    }
                                    refetchQueries={[{ query: getScrapbookFeedbacksQuery, variables: { pupilId: drawerState?.pupilId } }]}>
                                    <div className="activity-feed-title">
                                        <a href={`/pupil/${feedback?.pupil?.id}`}>
                                            <u>{feedback?.pupil?.fullname}</u>
                                        </a>{' '}
                                        added a scrapbook entry
                                    </div>
                                </CommonActivityFeedCard>
                            );
                        })}

                        {data?.getScrapbookFeedbacks?.length == 0 && (
                            <CommonStatus
                                className="no_feed"
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                                imageAlt={''}
                                heading={'Nothing to show here'}
                            />
                        )}
                    </>
                )}
            </Grid>
        </Drawer>
    );
};

export default ScrapbookEntriesDrawer;
