import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Tooltip } from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { ReadingMode } from 'lwp-shared';
import { logout, reInviteParent } from '../../graphQl/mutations';
import { clearCookiesOnly, getCookie } from '../../lib/manageCookies';
import { ADMIN, PARENT, readingModeObjectLinks, readingModePhrases, REFRESH_TOKEN_COOKIE, TEACHER } from '../../shared/Constant';
import { showDate, ThemeContext } from '../../shared/Services/handler';
import LoginOrSignUpModal from '../Shared/Modals/LoginOrSignUpModal';
import DialogWrapper from './../Shared/DialogWrapper';
import Paragraph from './../Shared/Typography/Paragraph';

const getPupilReadingLogsForTheDay = (pupilId, date, trusted) => {
    const pupilReadingLogsForTheDayQuery = gql`
        query getPupilReadingLogsForTheDay($pupilId: String!, $date: DateTime!) {
            getPupilReadingLogsForTheDay(pupilId: $pupilId, date: $date) {
                id
                bookName
                bookReadAt
                isBookFinished
                readingMode
                comment
                sharingAllowed
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
                    ${trusted ? 'type' : ''}
                }
                pupilCount
                pupilTopic {
                    id
                    releaseDate
                }
                originalFeedbackId
                entryDeletedAt
                reasonToDelete
            }
        }
    `;

    const {
        data: pupilReadingLogsForTheDay,
        loading: pupilReadingLogsForTheDayLoading,
        error: pupilReadingLogsForTheDayError
    } = useQuery(pupilReadingLogsForTheDayQuery, {
        variables: { pupilId, date }
    });

    return { pupilReadingLogsForTheDay, pupilReadingLogsForTheDayLoading, pupilReadingLogsForTheDayError };
};

const ReadinglogModal = ({
    open,
    setOpen,
    values,
    setCollapse,
    fullname,
    topicId,
    pupilId,
    handleClickOnEdit,
    viewByParent,
    viewByTeacher
}) => {
    const { callSnackbar, token, setToken } = useContext(ThemeContext);
    const router = useRouter();
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

    const client = useApolloClient();

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const { pupilReadingLogsForTheDay, pupilReadingLogsForTheDayLoading, pupilReadingLogsForTheDayError } = getPupilReadingLogsForTheDay(
        pupilId,
        values.readDate,
        token?.userTrustLevel >= 2
    );

    const addLog = (result) => {
        if (
            (result?.userType == TEACHER && token?.userType == TEACHER) ||
            (result?.userType == PARENT && token?.userType == PARENT && token?.userTrustLevel == 2 && token.sub === result?.userId)
        ) {
            handleClickOnEdit(result.id);
            setOpen(null);
        } else if (token?.userType == ADMIN || !result) {
            setOpen(null);
            /**
             * if have result then open the edit modal else open the collapse to log new reading record
             */
            if (result) handleClickOnEdit(result.id);
            else setCollapse(open);
        } else if (token?.userTrustLevel < 2 && token.sub === result?.userId) {
            setIsSignInModalOpen(true);
        }
    };

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        client.clearStore();
        router?.replace(`/child/${pupilId}/reading?topicId=${topicId}`);
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
    const canEditFeedback = (userType, loggedBy) => {
        /**
         * Determines if the user can edit the record based on their role and viewing context.
         *
         * - A teacher can edit the record if they are viewing as a teacher or if the user is an admin.
         * - A parent can edit the record if they are viewing as a parent and they are the logged-in user,
         *   or if the user is an admin.
         * - An admin can edit both teacher and parent records when viewing as the respective user type.
         */

        if (
            (userType === TEACHER && viewByTeacher && (token?.userType === TEACHER || token?.userType === ADMIN)) ||
            (userType === PARENT && viewByParent && ((token?.userType === PARENT && token.sub === loggedBy) || token?.userType === ADMIN))
        ) {
            return {
                disabled: false,
                title: 'Edit this record',
                icon: 'edit'
            };
        }

        return {
            disabled: true,
            title: 'Cannot edit this record',
            icon: 'edit_off'
        };
    };

    return (
        <div>
            <DialogWrapper
                className="reading-log-modal-container"
                heading={'Reading records found'}
                open={typeof open === typeof '' ? true : false}
                setOpen={() => setOpen(null)}
                contentWidth="600px"
                dialogFooter
                cancelBtn>
                <div className="reading-log-modal" data-test={'reading-record-found-modal'}>
                    <Paragraph customClass="log-text">
                        {viewByParent
                            ? `Well done for doing more reading on ${showDate({ date: values.readDate })}. You've already earned a star for the day, but you can add another reading record to show your teacher all the reading you're doing.`
                            : `There are already reading records for ${showDate({ date: values.readDate })}. Would you like to edit an existing record or create a new one?`}
                    </Paragraph>
                    <div className="readingLog-modal-card-container">
                        {pupilReadingLogsForTheDayLoading && (
                            <div className="loading-state">
                                <span className="material-icons rotating">refresh</span>
                            </div>
                        )}

                        {pupilReadingLogsForTheDayError && (
                            <div className="error-state">
                                <span className="material-icons">error_outline</span>
                                <Paragraph>Failed to load reading records. Please try again.</Paragraph>
                            </div>
                        )}

                        {!pupilReadingLogsForTheDayLoading && !pupilReadingLogsForTheDayError && (
                            <>
                                {(pupilReadingLogsForTheDay?.getPupilReadingLogsForTheDay || []).map((result, key) => {
                                    const readAsGroup = result?.pupilCount > 1 ? 'as part of a group' : '';
                                    const { title, disabled, icon } = canEditFeedback(result?.userType, result?.userId);
                                    const loggedByName =
                                        result?.readingMode === ReadingMode.READ_INDEPENDENTLY
                                            ? ''
                                            : result?.logCreatedBy?.nameForChildren || result?.userName || '';
                                    const readingVerb = [
                                        readingModePhrases[result?.readingMode] || 'read',
                                        readingModeObjectLinks[result?.readingMode]
                                    ]
                                        .filter(Boolean)
                                        .join(' ');

                                    return (
                                        <div key={key} className="readingLog-modal-card" disabled={disabled} onClick={() => addLog(result)}>
                                            <div className="card_icon">
                                                <Tooltip title={title}>
                                                    <span className={`material-icons ${icon} `}>{icon}</span>
                                                </Tooltip>
                                            </div>
                                            <div className="content">
                                                <b>{fullname}</b> {readingVerb} <b>{result?.bookName}</b>
                                                {readAsGroup ? ` ${readAsGroup}` : ''}
                                                {loggedByName ? (
                                                    <>
                                                        {' with '}
                                                        <b>{loggedByName}</b>
                                                    </>
                                                ) : null}
                                                {result?.isBookFinished ? (
                                                    <>
                                                        {' '}
                                                        and finished the book. <br />
                                                    </>
                                                ) : (
                                                    <>
                                                        {result?.pageNumber && (
                                                            <>
                                                                {' '}
                                                                and got to Page <b>{result?.pageNumber}</b>
                                                            </>
                                                        )}
                                                        .
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    <div className="new-reading-record" onClick={() => addLog()} data-test={'reading-record-found-modal-create-button'}>
                        <span className="material-icons">add_circle_outline</span>
                        <Paragraph>Create a new reading record</Paragraph>
                    </div>
                </div>
            </DialogWrapper>
            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${token?.status === 'ACTIVE' ? 'log in' : 'sign up'} to your account to edit your comment.`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={() =>
                        token?.status === 'ACTIVE'
                            ? handleActiveUser()
                            : handleInvitedUser(token?.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber)
                    }
                    className="reading-log-slider-modal"
                />
            )}
        </div>
    );
};

ReadinglogModal.propTypes = {
    readingLogData: PropTypes.any,
    values: PropTypes.object,
    setOpen: PropTypes.func,
    open: PropTypes.string,
    fullname: PropTypes.string,
    topicId: PropTypes.string,
    pupilId: PropTypes.string,
    setCollapse: PropTypes.func,
    viewByParent: PropTypes.bool,
    viewByTeacher: PropTypes.bool,
    handleClickOnEdit: PropTypes.func
};

export default ReadinglogModal;
