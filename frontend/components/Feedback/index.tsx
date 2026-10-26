import { gql, useMutation, useQuery } from '@apollo/client';
import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { logout, reInviteParent } from '../../graphQl/mutations';
import { clearCookiesOnly } from '../../lib/manageCookies';
import { ADMIN, MAGICPARENT, PARENT, READING, SCRAPBOOK, TEACHER, TOPICACCESS } from '../../shared/Constant';
import { getFeedbackType, getPupilFeedbackTitle, handleErrorSnackbar, ThemeContext } from '../../shared/Services/handler';
import AudioPlayer from '../Shared/AudioPlayer';
import CommonActivityFeedCard from '../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import CommonLoading from '../Shared/CommonLoading';
import LoginOrSignUpModal from '../Shared/Modals/LoginOrSignUpModal';
import Heading1 from '../Shared/Typography/Heading1';
import Paragraph from '../Shared/Typography/Paragraph';

const getFeedBackByIdAdmin = gql`
    query getFeedBackById($feedbackId: String!) {
        getFeedBackById(feedbackId: $feedbackId) {
            id
            parentComment
            bookName
            bookReadAt
            pageNumber
            isBookFinished
            comment
            privateNote
            rating
            type
            className
            isFeedbackForMultipleClasses
            privateNote
            pupilCount
            includeInReadingTarget
            scrapbookPrompt
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
            userId
            userType
            userName
            logCreatedBy {
                id
                firstname
                lastname
                nameForChildren
            }
            pupilTopic {
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
            logCreatedAt
            activity {
                activity {
                    name
                    topic {
                        id
                        teacherTopicName
                    }
                }
                topic {
                    id
                    classTopic {
                        id
                        class {
                            id
                            name
                        }
                    }
                }
            }
            description
            id
            logCreatedAt
            parentComment
            photos {
                id
                filename
            }
            pupil {
                id
                fullname
                mathscotUrl {
                    thumbnailImage
                }
                parents {
                    parent {
                        firstname
                    }
                }
            }
            pupilComment
            sharingAllowed
            lastAction {
                updatedAt
            }
        }
    }
`;
const getFeedBackByIdTeacher = gql`
    query getFeedBackById($feedbackId: String!) {
        getFeedBackById(feedbackId: $feedbackId) {
            id
            pupilComment
            parentComment
            scrapbookPrompt
            logCreatedAt
            className
            isFeedbackForMultipleClasses
            pupilCount
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
            bookReadAt
            pageNumber
            isBookFinished
            comment
            privateNote
            includeInReadingTarget
            audios {
                id
                filename
            }
            userId
            userType
            logCreatedBy {
                id
                firstname
                lastname
                nameForChildren
            }
            pupilTopic {
                id
                class {
                    id
                    name
                }
            }
            type
            description
            sharingAllowed
            pupil {
                id
                fullname
                mathscotUrl {
                    thumbnailImage
                }
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
        }
    }
`;
const getFeedBackByIdParent = gql`
    query getFeedBackById($feedbackId: String!) {
        getFeedBackById(feedbackId: $feedbackId) {
            id
            logCreatedAt
            pupilComment
            parentComment
            scrapbookPrompt
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
            audios {
                id
                filename
            }
            userId
            userType
            userName
            logCreatedBy {
                nameForChildren
                firstname
                lastname
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
        }
    }
`;
const getFeedBackByIdMagicParent = gql`
    query getFeedBackById($feedbackId: String!) {
        getFeedBackById(feedbackId: $feedbackId) {
            id
            logCreatedAt
            pupilComment
            parentComment
            scrapbookPrompt
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
            bookReadAt
            pageNumber
            isBookFinished
            comment
            type
            includeInReadingTarget
            readingType
            audios {
                id
                filename
            }
            userId
            userType
            userName
            logCreatedBy {
                nameForChildren
                firstname
                lastname
            }
            pupilTopic {
                id
            }
            pupilCount
        }
    }
`;

const useStyles = makeStyles((theme: Theme) => ({
    iconHome: {
        color: '#D13F75'
    },
    iconSchool: {
        color: '#0083CB'
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
    }
}));

const Feedback = () => {
    const classes = useStyles();
    const queryParams = useParams();
    const router = useRouter();
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

    const { callSnackbar, token, setToken } = useContext(ThemeContext);

    const [reInviteParentMutation] = useMutation(reInviteParent);
    const [logoutMutation] = useMutation(logout);

    const { loading, error, data } = useQuery(
        token?.userType === ADMIN
            ? getFeedBackByIdAdmin
            : token?.userType === TEACHER
              ? getFeedBackByIdTeacher
              : token?.userTrustLevel < 2
                ? getFeedBackByIdMagicParent
                : getFeedBackByIdParent,
        {
            variables: {
                feedbackId: queryParams?.id
            },
            skip: !router?.isReady,
            fetchPolicy: 'network-only'
        }
    );

    const feed = data?.getFeedBackById;

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    if (loading) return <CommonLoading />;

    const collapseButtonHandler = () => {
        if (token?.userTrustLevel === 2) {
            setIsSignInModalOpen(true);

            return;
        }
    };

    const handleActiveUser = () => {
        logoutMutation()
            .then(() => {
                clearCookiesOnly();
                setToken(null);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const handleInvitedUser = (userId, source_type, source) => {
        reInviteParentMutation({ variables: { parentId: userId } });
        router?.replace({
            pathname: '/check-your-email-or-phone/invited-user',
            query: {
                source,
                source_type
            }
        });
    };

    return (
        <div>
            <CommonActivityFeedCard
                key={feed?.id}
                customClass={`history_log_feed ${
                    [PARENT, MAGICPARENT, TOPICACCESS].includes(feed?.userType)
                        ? classes.iconHome
                        : feed?.userType === TEACHER && feed?.includeInReadingTarget
                          ? classes.iconSchool
                          : !feed?.includeInReadingTarget
                            ? classes.notCountingTowardsTarget
                            : ''
                }`}
                feedback={feed}
                activityContentImg={feed?.photos?.[0]?.filename}
                type={
                    !feed?.includeInReadingTarget && feed?.userType === TEACHER
                        ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                        : getFeedbackType(feed?.type)
                }
                expandAll={token?.userTrustLevel === 2}
                classTitle={feed?.className ?? null}
                classDate={feed?.logCreatedAt}
                description={
                    feed?.audios?.length > 0 ? (
                        <FeedbackCommentCard>
                            <Heading1 text="Audio recording" />
                            <AudioPlayer src={feed?.audios?.[0]?.filename} />
                        </FeedbackCommentCard>
                    ) : null
                }
                viewActivity={collapseButtonHandler}
                photoRating={feed?.rating}>
                {feed?.type === READING ? (
                    getPupilFeedbackTitle(feed)
                ) : feed?.type === SCRAPBOOK ? (
                    <div className="activity-feed-title">
                        <Paragraph>
                            <Link href={`/admin/child/${feed?.pupil?.id}`}>
                                <u>{feed?.pupil?.fullname}</u>
                            </Link>{' '}
                            added a scrapbook entry
                        </Paragraph>
                    </div>
                ) : (
                    <div className="activity-feed-title">
                        <Paragraph>
                            <Link href={`/admin/child/${feed?.pupil?.id}`}>
                                <u>{feed?.pupil?.fullname}</u>
                            </Link>
                            {feed?.description ? (
                                ' did their own activity'
                            ) : (
                                <>
                                    {' '}
                                    added comments to the <b>{feed?.activity?.activity?.name}</b> activity in the{' '}
                                    <a href={`/admin/topic/${feed?.activity?.activity?.topic?.id}`}>
                                        <u>{feed?.activity?.activity?.topic?.teacherTopicName}</u>
                                    </a>{' '}
                                    topic
                                </>
                            )}
                        </Paragraph>
                    </div>
                )}
            </CommonActivityFeedCard>

            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${token?.userStatus === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        token?.userStatus === 'ACTIVE' ? 'log in' : 'sign up'
                    } to your account to access the full reading log section`}
                    primaryBtnText={token?.userStatus === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={() =>
                        token?.userStatus === 'ACTIVE'
                            ? handleActiveUser()
                            : handleInvitedUser(+token?.userId, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber)
                    }
                />
            )}
        </div>
    );
};

export default Feedback;
