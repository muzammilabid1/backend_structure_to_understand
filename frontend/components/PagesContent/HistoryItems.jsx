/* eslint-disable @next/next/no-img-element */
import { gql, useApolloClient, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { logout, reInviteParent } from '../../graphQl/mutations';
import { clearCookiesOnly, getCookie } from '../../lib/manageCookies';
import {
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    PARENT,
    READING,
    REFRESH_TOKEN_COOKIE,
    SCRAPBOOK,
    TEACHER,
    TOPICACCESS
} from '../../shared/Constant';
import { enrichFeedbacksWithSameDayFlag, getFeedbackType, getPupilFeedbackTitle, ThemeContext } from '../../shared/Services/handler';
import CommonActivityFeedCard from '../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import LoginOrSignUpModal from '../Shared/Modals/LoginOrSignUpModal';
import Heading1 from '../Shared/Typography/Heading1';
import AudioPlayer from './../Shared/AudioPlayer';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import LoginOrSignUpStatusPrompt from './../Shared/LoginOrSignUpStatusPrompt';

const muiTheme = createTheme({});

const useStyles = makeStyles((theme) => ({
    iconHome: {
        color: '#D13F75',
        backgroundColor: '#ffeef5',
        borderRadius: '26px',
        padding: '7px',
        [theme.breakpoints.down('md')]: {
            backgroundColor: 'transparent'
        }
    },
    iconSchool: {
        color: '#0083CB',
        backgroundColor: '#f1faff',
        borderRadius: '26px',
        padding: '7px',
        [theme.breakpoints.down('md')]: {
            backgroundColor: 'transparent'
        }
    },
    notCountingTowardsTarget: {
        color: '#999591',
        backgroundColor: '#F5F5F5 !important',
        borderRadius: '26px',
        padding: '7px',
        [theme.breakpoints.down('md')]: {
            backgroundColor: 'transparent'
        }
    },
    root: {
        [theme.breakpoints.down('md')]: {
            width: '100%'
        },
        backgroundColor: 'transparent !important',
        border: 'none !important',
        boxShadow: 'none !important'
    },
    playIcon: {
        color: '#00303C !important',
        '&:hover': {
            color: '#00303C !important'
        }
    },
    pauseIcon: {
        color: '#00303C !important'
    },
    volumeIcon: {
        color: '#00303C !important'
    },
    volumeSlider: {
        color: '#00303C !important'
    },
    progressTime: {
        color: 'rgba(0, 0, 0, 0.54)'
    },
    mainSlider: {
        color: '##6F60AE !important',
        '& .MuiSlider-rail': {
            color: '#7986cb'
        },
        '& .MuiSlider-track': {
            color: '#3f51b5'
        },
        '& .MuiSlider-thumb': {
            color: '#303f9f'
        }
    },
    loginPrompt: {
        '& .common_status_img': {
            marginTop: '50px'
        }
    }
}));

const getPupilHistoryQuery = (trusted = false) => gql`
    query getPupilHistory($pupilId: String!) {
        getPupilHistory(pupilId: $pupilId) {
            id
            logCreatedAt
            pupilComment
            parentComment
            scrapbookPrompt
            ${trusted ? `photos { id filename }` : ''}
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
            bookName
            bookReadAt
            pageNumber
            isBookFinished
            comment
            type
            includeInReadingTarget
            readingType
            ${trusted ? `audios { id filename }` : ''}
            userId
            userType
            userName
            logCreatedBy {
                id
                nameForChildren
                firstname
                lastname
                ${trusted ? 'type' : ''}
            }
            pupilTopic {
                id
            }
            pupilCount
            activity {
                id
                earnedStar
                topic {
                    id
                }
                activity {
                    name
                    topic {
                        id
                        parentTopicName
                        teacherTopicName
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

const pupilSchool = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            school {
                id
                parentFeedbackTickFeatureEnabledAt
            }
        }
    }
`;

const HistoryItems = () => {
    const queryParams = useParams();
    const { callSnackbar, token, setToken } = useContext(ThemeContext);
    const { replace, asPath } = useRouter();
    const client = useApolloClient();
    const classes = useStyles();
    const pupilId = queryParams?.child_id || queryParams?.pupil_id;
    const [isSignInModal, setIsSignInModal] = useState({ open: false });
    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const [fetchPupilHistory, { loading, error, data: pupilReadingLog }] = useLazyQuery(getPupilHistoryQuery(token?.userTrustLevel >= 2));

    const { data: pupil } = useQuery(pupilSchool, { variables: { id: pupilId }, skip: !pupilId, fetchPolicy: 'cache-first' });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (pupilId) {
            fetchPupilHistory({ variables: { pupilId } });
        }
    }, []);

    const collapseButtonHandler = () => {
        if (token?.userTrustLevel < 2) {
            setIsSignInModal({ open: true });
            return;
        }
    };

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        client.clearStore();
        replace(asPath);
    };

    const handleInvitedUser = (userId, source_type, source) => {
        reInviteParentMutation({ variables: { parentId: userId } });
        replace({
            pathname: '/check-your-email-or-phone/invited-user',
            query: { source, source_type }
        });
    };

    const handleClickedLoginOrSignUpModal = () => {
        if (token?.status === 'ACTIVE') {
            handleActiveUser();
        } else {
            handleInvitedUser(token?.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber);
        }
    };

    const feedbacks = useMemo(() => enrichFeedbacksWithSameDayFlag(pupilReadingLog?.getPupilHistory ?? []), [pupilReadingLog]);

    if (loading) return <CommonLoading />;

    return (
        <div className={`history_log ${classes.history_container}`}>
            {!feedbacks.length && (
                /* User has no history entries to show at all */
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'Nothing to show here'}
                    subHeading={'Submit comments, audio or photos to add them to your history.'}
                />
            )}

            {feedbacks.map((feedback) => (
                <div className={`${classes.history_container} pupil_history_card`}>
                    <CommonActivityFeedCard
                        classTitle=""
                        customClass={`history_log_feed ${
                            [TOPICACCESS, MAGICPARENT, PARENT].includes(feedback?.userType)
                                ? classes.iconHome
                                : feedback?.userType == TEACHER && feedback?.includeInReadingTarget
                                  ? classes.iconSchool
                                  : !feedback?.includeInReadingTarget
                                    ? classes.notCountingTowardsTarget
                                    : ''
                        }`}
                        user={pupil?.pupil}
                        type={
                            !feedback?.includeInReadingTarget && feedback?.userType === TEACHER
                                ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                                : getFeedbackType(feedback?.type)
                        }
                        thumb_up={false}
                        feedback={feedback}
                        showSideImg={feedback?.type === READING ? true : false}
                        viewActivity={collapseButtonHandler}
                        isParent={true}
                        expandAll={
                            token?.userTrustLevel < 2 && feedback?.userType === TEACHER
                                ? true
                                : token?.userTrustLevel < 2 && !feedback?.feedbackReplies?.length > 0
                                  ? false
                                  : true
                        }
                        activityIcon={
                            feedback?.pupilCount > 1
                                ? 'groups'
                                : feedback?.userType == TEACHER
                                  ? 'school'
                                  : [TOPICACCESS, MAGICPARENT, PARENT].includes(feedback?.userType)
                                    ? 'home'
                                    : ''
                        }
                        classDate={feedback?.logCreatedAt}
                        description={
                            feedback?.photos?.length > 0 || feedback?.audios?.length > 0 ? (
                                <div className={classes.history_log_container}>
                                    {feedback?.photos?.length > 0 && (
                                        <div className="history_log_img">
                                            <FeedbackCommentCard>
                                                <img src={feedback?.photos?.[0]?.filename} />
                                            </FeedbackCommentCard>
                                        </div>
                                    )}
                                    {feedback?.audios?.length > 0 && (
                                        <FeedbackCommentCard>
                                            <Heading1 text="Audio recording" />
                                            <StyledEngineProvider injectFirst>
                                                <ThemeProvider theme={muiTheme}>
                                                    <AudioPlayer src={feedback?.audios?.[0]?.filename} />
                                                </ThemeProvider>
                                            </StyledEngineProvider>
                                        </FeedbackCommentCard>
                                    )}
                                </div>
                            ) : null
                        }
                        refetchQueries={[
                            {
                                query: getPupilHistoryQuery(token?.userTrustLevel >= 2),
                                variables: { pupilId }
                            }
                        ]}>
                        {getFeedbackType(feedback?.type) === READING ? (
                            getPupilFeedbackTitle(feedback)
                        ) : getFeedbackType(feedback?.type) === SCRAPBOOK ? (
                            <div className="activity-feed-title">
                                {feedback?.userId === token?.sub ? 'You' : 'Another parent'} added a scrapbook entry
                            </div>
                        ) : (
                            <div className="activity-feed-title">
                                You completed{' '}
                                <a href={`/activity/${feedback?.activity?.id}`}>
                                    <u>{feedback?.activity?.activity?.name}</u>
                                </a>{' '}
                                in the{' '}
                                <a href={`/topic/${feedback?.activity?.topic?.id}`}>
                                    <u>
                                        {feedback?.activity?.activity?.topic?.parentTopicName ??
                                            feedback?.activity?.activity?.topic?.teacherTopicName}
                                    </u>
                                </a>{' '}
                                topic.
                            </div>
                        )}
                    </CommonActivityFeedCard>
                </div>
            ))}

            {token?.userTrustLevel < 2 && pupilReadingLog?.getPupilHistory?.length > 0 && (
                <LoginOrSignUpStatusPrompt redirectPath={`/child/${pupilId}/history`} className={classes.loginPrompt} />
            )}

            {isSignInModal && (
                <LoginOrSignUpModal
                    open={isSignInModal?.open}
                    setOpen={() => setIsSignInModal({ open: false })}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        token?.status === 'ACTIVE' ? 'log in to your account' : 'set up a user account'
                    } to view the full history`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={handleClickedLoginOrSignUpModal}
                />
            )}
        </div>
    );
};

export default HistoryItems;
