import { gql, useQuery } from '@apollo/client';
import { Divider, Drawer, Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS, TEACHER } from '../../../../shared/Constant';
import { getFeedbackType, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import CommonActivityFeedCard from '../../../Shared/Cards/CommonActivityFeedCard';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import CommonTooltipIcon from '../../../Shared/CommonTooltipIcon';
import Heading2 from '../../../Shared/Typography/Heading2';
import Paragraph from '../../../Shared/Typography/Paragraph';

const getPupilFeedbackByPupilTopicId = gql`
    query getPupilFeedbackByPupilTopicId($pupilTopicId: String!, $pupilId: String!, $type: FeedbackType!) {
        getPupilFeedbackByPupilTopicId(pupilTopicId: $pupilTopicId, pupilId: $pupilId, type: $type) {
            id
            pupilComment
            parentComment
            logCreatedAt
            className
            feedbackReplies {
                id
                reply
                logCreatedAt
                logUpdatedAt
                originalFeedbackReplyId
                originalFeedbackReplyDeletedAt
                type
                sticker {
                    id
                    alt
                    imageUrl
                }
                logCreatedBy {
                    id
                    nameForChildren
                }
            }
            tickedAt
            tickedBy {
                nameForChildren
            }
            photos {
                id
                filename
            }
            bookName
            type
            userId
            userType
            logCreatedBy {
                id
                firstname
                lastname
                nameForChildren
                type
            }
            pupilTopic {
                id
                class {
                    id
                    name
                }
            }
            type
            sharingAllowed
            pupil {
                id
                fullname
                parents {
                    parent {
                        firstname
                    }
                }
            }
            activity {
                topic {
                    id
                    classTopic {
                        id
                        topic {
                            id
                            teacherTopicName
                        }
                        class {
                            id
                            name
                        }
                    }
                }
                activity {
                    name
                    topic {
                        teacherTopicName
                    }
                }
            }
            lastAction {
                updatedAt
            }
            entryDeletedAt
            originalFeedbackId
        }
    }
`;

interface DrawerState {
    pupilFullname: string | null;
    pupilTopicId: string | null;
    pupilId: string | null;
    open: boolean;
}

interface TopicEntriesDrawerProps {
    drawerState: DrawerState;
    setDrawerState: React.Dispatch<React.SetStateAction<DrawerState>>;
    schoolClass: ILwpSchoolClassDetails;
}

const TopicEntriesDrawer = ({ drawerState, setDrawerState, schoolClass }: TopicEntriesDrawerProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [feeds, setFeeds] = useState([]);

    const { loading, error, data } = useQuery(getPupilFeedbackByPupilTopicId, {
        variables: {
            pupilTopicId: drawerState?.pupilTopicId,
            pupilId: drawerState?.pupilId,
            type: 'ACTIVITY'
        },
        skip: !drawerState?.open
    });

    useEffect(() => {
        setFeeds(data?.getPupilFeedbackByPupilTopicId);
    }, [data]);

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    const onDrawerClosed = () => {
        setDrawerState({ pupilFullname: null, pupilTopicId: null, pupilId: null, open: false });
    };

    return (
        <Drawer
            variant="temporary"
            className="common_list pupil-feedback-entries-drawer"
            ModalProps={{
                keepMounted: false
            }}
            anchor={'right'}
            open={drawerState?.open}
            onClose={onDrawerClosed}>
            <Grid p={4} width={{ md: 706, xs: 375 }}>
                <Grid container justifyContent={'space-between'} alignItems={'center'}>
                    <Heading2 text={`${drawerState?.pupilFullname}’s entries`} />
                    <CommonTooltipIcon icon={'closed'} text={null} onClick={onDrawerClosed} />
                </Grid>

                <Divider sx={{ my: 3 }} />

                {loading ? (
                    <CommonLoading />
                ) : (
                    <>
                        {(feeds || []).map((feedback) => {
                            return (
                                <CommonActivityFeedCard
                                    key={feedback?.id}
                                    customClass={`history_log_feed home-icon`}
                                    setFeeds={setFeeds}
                                    previousDataLength={feeds.length}
                                    feedback={feedback}
                                    activityContentImg={feedback?.photos?.[0]?.filename}
                                    user={schoolClass}
                                    type={
                                        !feedback?.includeInReadingTarget && feedback?.userType === TEACHER
                                            ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                                            : getFeedbackType(feedback?.type)
                                    }
                                    classTitle={feedback?.className ?? null}
                                    classDate={feedback?.logCreatedAt}>
                                    <div className="activity-feed-title">
                                        <Paragraph>
                                            <a href={`/pupil/${feedback?.pupil?.id}`}>
                                                <u>{feedback?.pupil?.fullname}</u>
                                            </a>
                                            {feedback?.description ? (
                                                ' did their own activity'
                                            ) : (
                                                <>
                                                    {' '}
                                                    added comments to the <b>{feedback?.activity?.activity?.name}</b> activity in the{' '}
                                                    {feedback?.activity?.topic?.classTopic ? (
                                                        <a
                                                            href={`/class/${feedback?.activity?.topic?.classTopic?.class?.id}/topic/${feedback?.activity?.topic?.classTopic?.id}`}>
                                                            <u>{feedback?.activity?.activity?.topic?.teacherTopicName}</u>
                                                        </a>
                                                    ) : (
                                                        <strong>{feedback?.activity?.activity?.topic?.teacherTopicName}</strong>
                                                    )}{' '}
                                                    topic
                                                </>
                                            )}
                                        </Paragraph>
                                    </div>
                                </CommonActivityFeedCard>
                            );
                        })}

                        {data?.getPupilFeedbackByPupilTopicId?.length == 0 && (
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

export default TopicEntriesDrawer;
