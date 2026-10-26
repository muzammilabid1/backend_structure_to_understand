import { gql, useQuery } from '@apollo/client';
import { Divider, Drawer, Grid } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import { RefetchQueryObject } from '../../../../types/RefetchQueryObject';
import ReadingLog from '../../../Parent/ReadingLog';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonTooltipIcon from '../../../Shared/CommonTooltipIcon';
import Heading2 from '../../../Shared/Typography/Heading2';

const getPupilFeedbackByPupilTopicId = gql`
    query getPupilFeedbackByPupilTopicId($pupilTopicId: String!, $pupilId: String!, $type: FeedbackType!) {
        getPupilFeedbackByPupilTopicId(pupilTopicId: $pupilTopicId, pupilId: $pupilId, type: $type) {
            id
            bookName
            bookReadAt
            isBookFinished
            comment
            privateNote
            sharingAllowed
            logCreatedAt
            type
            school {
                id
            }
            includeInReadingTarget
            readingMode
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
            audios {
                id
                filename
            }
            photos {
                id
                filename
            }
            userId
            userType
            pageNumber
            userName
            logCreatedBy {
                nameForChildren
                firstname
                lastname
                id
                type
            }
            pupilTopic {
                id
                releaseDate
            }
            pupilCount
            pupil {
                id
                fullname
                parents {
                    parent {
                        firstname
                    }
                }
            }
            lastAction {
                updatedAt
            }
            originalFeedbackId
            entryDeletedAt
            reasonToDelete
        }
    }
`;

const isPupilTopicCurrentReadingTopicInClass = gql`
    query isPupilTopicCurrentReadingTopicInClass($id: String!) {
        isPupilTopicCurrentReadingTopicInClass(id: $id)
    }
`;

interface DrawerState {
    pupilFullname: string | null;
    pupilTopicId: string | null;
    pupilId: string | null;
    open: boolean;
}

interface ClassReadingTopic {
    topicId: string;
    id: string;
    title: string;
    description: string;
}

interface ReadingEntriesDrawerProps {
    drawerState: DrawerState;
    setDrawerState: React.Dispatch<React.SetStateAction<DrawerState>>;
    schoolClass: ILwpSchoolClassDetails;
    classReadingTopic: ClassReadingTopic;
    refetchQuery: RefetchQueryObject;
}

const ReadingEntriesDrawer = ({ drawerState, setDrawerState, schoolClass, classReadingTopic, refetchQuery }: ReadingEntriesDrawerProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { loading, error, data } = useQuery(getPupilFeedbackByPupilTopicId, {
        variables: {
            pupilTopicId: drawerState?.pupilTopicId,
            pupilId: drawerState?.pupilId,
            type: 'READING'
        },
        skip: !drawerState?.open
    });

    const {
        loading: isCurrentWeekLoading,
        error: isCurrentWeekError,
        data: isCurrentWeekData
    } = useQuery(isPupilTopicCurrentReadingTopicInClass, {
        variables: {
            id: drawerState?.pupilTopicId
        },
        skip: !drawerState?.pupilTopicId || !drawerState?.open || !schoolClass?.isGroupAcrossClasses
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, isCurrentWeekError);
    }, [error, isCurrentWeekError]);

    const onDrawerClosed = () => {
        setDrawerState({ pupilFullname: null, pupilTopicId: null, pupilId: null, open: false });
    };

    const isCurrentWeek = schoolClass?.isGroupAcrossClasses
        ? isCurrentWeekData?.isPupilTopicCurrentReadingTopicInClass
        : schoolClass?.currentReadingWeek?.id === classReadingTopic?.topicId;

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
                <Grid container justifyContent={'space-between'} alignItems={'center'} data-test="pupil-feedback-entries-drawer-header">
                    <Heading2 text={`${drawerState?.pupilFullname}’s entries`} />
                    <CommonTooltipIcon icon={'closed'} text={null} onClick={onDrawerClosed} />
                </Grid>

                <Divider sx={{ mt: 3 }} />

                {loading || isCurrentWeekLoading ? (
                    <CommonLoading />
                ) : (
                    <>
                        <ReadingLog
                            topic_id={drawerState?.pupilTopicId}
                            pupil_id={drawerState?.pupilId}
                            getPupilFeedbackByPupilTopicId={getPupilFeedbackByPupilTopicId}
                            pupilFeedback={data?.getPupilFeedbackByPupilTopicId}
                            showOnlySlider={true}
                            isCurrentWeek={isCurrentWeek}
                            refetchQueries={[refetchQuery]}
                        />
                    </>
                )}
            </Grid>
        </Drawer>
    );
};

export default ReadingEntriesDrawer;
