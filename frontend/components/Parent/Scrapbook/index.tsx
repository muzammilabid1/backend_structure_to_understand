/* eslint-disable @next/next/no-img-element */
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { createTheme, StyledEngineProvider, Theme, ThemeProvider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { logout, reInviteParent } from '../../../graphQl/mutations';
import { clearCookiesOnly, getCookie } from '../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, REFRESH_TOKEN_COOKIE, SCRAPBOOK } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import AudioPlayer from '../../Shared/AudioPlayer';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import CommonLoading from '../../Shared/CommonLoading';
import CommonStatus from '../../Shared/CommonStatus';
import LoginOrSignUpStatusPrompt from '../../Shared/LoginOrSignUpStatusPrompt';
import LoginOrSignUpModal from '../../Shared/Modals/LoginOrSignUpModal';
import Heading1 from '../../Shared/Typography/Heading1';
import { ScrapbookFeedback } from './ScrapbookFeedbackCard';

const muiTheme = createTheme({});

const useStyles = makeStyles((theme: Theme) => ({
    iconHome: {
        color: '#D13F75',
        backgroundColor: '#ffeef5',
        borderRadius: '26px',
        padding: '7px',
        [theme.breakpoints.down('md')]: {
            backgroundColor: 'transparent'
        }
    }
}));

export const getScrapbookFeedbacksQuery = (trusted = false) => gql`
    query getScrapbookFeedbacks($pupilId: String!) {
        getScrapbookFeedbacks(pupilId: $pupilId) {
            id
            comment
            logCreatedAt
            userId
            userType
            scrapbookPrompt
            ${
                trusted
                    ? `
                audios {
                    id
                    filename
                }
                photos {
                    id
                    filename
                }`
                    : ''
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
        }
    }
`;

interface ScrapbookProps {
    pupilId: string;
    pupilTopicId: string;
}

const Scrapbook = ({ pupilId, pupilTopicId }: ScrapbookProps) => {
    const { callSnackbar, token, setToken } = useContext(ThemeContext);
    const { push, replace, asPath } = useRouter();
    const client = useApolloClient();
    const classes = useStyles();
    const [isSignInModal, setIsSignInModal] = useState({ open: false });
    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const { loading, error, data } = useQuery(getScrapbookFeedbacksQuery(token?.userTrustLevel >= 2), {
        variables: { pupilId },
        skip: !pupilId,
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const collapseButtonHandler = () => {
        if (token?.userTrustLevel < 2) {
            setIsSignInModal({
                open: true
            });

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
            query: {
                source,
                source_type
            }
        });
    };

    const handleClickedLoginOrSignUpModal = () => {
        if (token?.status === 'ACTIVE') {
            handleActiveUser();
        } else {
            handleInvitedUser(token?.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber);
        }
    };

    const feedbacks: ScrapbookFeedback[] = data?.getScrapbookFeedbacks ?? [];

    if (loading) return <CommonLoading />;

    if (feedbacks.length === 0) {
        return (
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`}
                imageAlt="Ready Teddy"
                heading="No activity"
                subHeading="Upload an image or note to add to the scrapbook"
                buttonText="Add a moment"
                buttonStartIcon="add"
                buttonDataTest="add-moment-button"
                dataTest="scrapbook-empty-state"
                className="scrapbook-empty-state"
                onClick={() => push(`/scrapbook/${pupilTopicId}`)}
            />
        );
    }

    return (
        <div className="scrapbook-entries-container">
            {/* Desktop action bar */}
            <div className="scrapbook-action-bar">
                <LWPButton
                    btnText="Add a moment"
                    startIcon="add"
                    dataTest="scrapbook-add-moment-button"
                    onClick={() => push(`/scrapbook/${pupilTopicId}`)}
                />
            </div>

            {/* Entries */}
            {feedbacks.map((feedback) => (
                <div key={feedback.id} className="pupil_history_card">
                    <CommonActivityFeedCard
                        classTitle=""
                        customClass={`history_log_feed ${classes.iconHome}`}
                        type={SCRAPBOOK}
                        thumb_up={false}
                        feedback={feedback}
                        showSideImg={false}
                        viewActivity={collapseButtonHandler}
                        isParent={true}
                        expandAll={token?.userTrustLevel < 2 && !(feedback?.feedbackReplies?.length > 0) ? false : true}
                        activityIcon="home"
                        classDate={feedback.logCreatedAt}
                        description={
                            feedback.photos?.length > 0 || feedback.audios?.length > 0 ? (
                                <div>
                                    {feedback.photos?.length > 0 && (
                                        <div className="history_log_img">
                                            <FeedbackCommentCard>
                                                <img src={feedback.photos[0].filename} alt="Scrapbook memory" />
                                            </FeedbackCommentCard>
                                        </div>
                                    )}
                                    {feedback.audios?.length > 0 && (
                                        <FeedbackCommentCard>
                                            <Heading1 text="Audio recording" />
                                            <StyledEngineProvider injectFirst>
                                                <ThemeProvider theme={muiTheme}>
                                                    <AudioPlayer src={feedback.audios[0].filename} />
                                                </ThemeProvider>
                                            </StyledEngineProvider>
                                        </FeedbackCommentCard>
                                    )}
                                </div>
                            ) : null
                        }
                        refetchQueries={[{ query: getScrapbookFeedbacksQuery, variables: { pupilId } }]}>
                        <div className="activity-feed-title">
                            {feedback.userId === token?.sub ? 'You' : 'Another parent'} added a scrapbook entry
                        </div>
                    </CommonActivityFeedCard>
                </div>
            ))}

            {token?.userTrustLevel < 2 && <LoginOrSignUpStatusPrompt redirectPath={asPath} className="scrapbook-login-prompt" />}

            {/* Mobile FAB */}
            <div className="scrapbook-fab hide-on-desktop">
                <LWPButton
                    btnText=""
                    startIcon="add"
                    dataTest="scrapbook-fab-button"
                    customClass="scrapbook-fab-btn"
                    onClick={() => push(`/scrapbook/${pupilTopicId}`)}
                />
            </div>

            {isSignInModal && (
                <LoginOrSignUpModal
                    open={isSignInModal?.open}
                    setOpen={() => setIsSignInModal({ open: false })}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        token?.status === 'ACTIVE' ? 'log in to your account' : 'set up a user account'
                    } to view the full scrapbook`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={handleClickedLoginOrSignUpModal}
                />
            )}
        </div>
    );
};

export default Scrapbook;
