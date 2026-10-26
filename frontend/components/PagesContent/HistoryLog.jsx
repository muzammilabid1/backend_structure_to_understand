/* eslint-disable @next/next/no-img-element */
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client';
import { createTheme, Divider, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { ReadingBookOptions, ReadingMode } from 'lwp-shared';
import { logout, reInviteParent } from '../../graphQl/mutations';
import { haveUnTickedFeedbacks } from '../../graphQl/queries';
import { clearCookiesOnly, getCookie } from '../../lib/manageCookies';
import {
    ADMIN,
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    PARENT,
    READING,
    readingModeObjectLinks,
    readingModePhrases,
    REFRESH_TOKEN_COOKIE,
    TEACHER,
    TOPICACCESS
} from '../../shared/Constant';
import { enrichFeedbacksWithSameDayFlag, showDate, ThemeContext } from '../../shared/Services/handler';
import CommonActivityFeedCard from '../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import MarkAsSeen from '../Shared/Cards/CommonActivityFeedCard/MarkAsSeen';
import CommonLazyLoading from '../Shared/CommonLazyLoading';
import LoginOrSignUpModal from '../Shared/Modals/LoginOrSignUpModal';
import Heading1 from '../Shared/Typography/Heading1';
import AudioPlayer from './../Shared/AudioPlayer';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import LoginOrSignUpStatusPrompt from './../Shared/LoginOrSignUpStatusPrompt';
import Paragraph from './../Shared/Typography/Paragraph';

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
    isOfSameDay: {
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

const HistoryLog = ({
    readingLoading,
    readingLogData,
    setReadingLogData,
    _fetchMore,
    pupilReadingLog,
    pupil,
    collapse,
    isCurrentWeek,
    viewByTeacher = false,
    onReadingLogUpdate
}) => {
    const searchParams = useSearchParams();
    const { callSnackbar, token, setToken } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();
    const [isSignInModal, setIsSignInModal] = useState({
        open: false,
        isEditing: false
    });
    const [readingLog, setReadingLog] = useState(null);
    const client = useApolloClient();

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);
    const pupilId = queryParams?.child_id || queryParams?.pupil_id;
    const topicId = searchParams.get('topicId');
    const classes = useStyles();

    const [showTickedAllFeedbackQuery, { error: showTickedAllFeedbackError, data: showAllTick }] = useLazyQuery(haveUnTickedFeedbacks, {});

    useEffect(() => {
        if (queryParams?.pupil_id && pupil?.pupil) {
            showTickedAllFeedbackQuery({
                variables: { pupilId, schoolId: pupil?.pupil?.school?.id }
            });
        }
    }, [queryParams?.pupil_id, pupil?.pupil]);

    useEffect(() => {
        showTickedAllFeedbackError?.message && callSnackbar(showTickedAllFeedbackError, 'error');
    }, [showTickedAllFeedbackError]);

    useEffect(() => {
        if (readingLogData) {
            let result = readingLogData.reduce((unique, o) => {
                if (!unique.some((obj) => obj.id === o.id)) {
                    unique.push(o);
                }

                return unique;
            }, []);

            result = result.sort((a, b) => {
                if (moment(a.bookReadAt).valueOf() > moment(b.bookReadAt).valueOf()) return -1;
                if (moment(a.bookReadAt).valueOf() < moment(b.bookReadAt).valueOf()) return 1;

                return moment(b.logCreatedAt).valueOf() - moment(a.logCreatedAt).valueOf();
            });

            result = enrichFeedbacksWithSameDayFlag(result || []);

            setReadingLog(createHistoryWithWeek(result));
        }
    }, [readingLogData, collapse]);

    const createHistoryWithWeek = (readingLogData) => {
        let log = null;

        readingLogData?.map((data) => {
            const { bookReadAt } = data;

            const createdYearAndMonth = showDate({ date: moment(bookReadAt).isoWeekday(1), yearMonth: true });
            const createdWeek = showDate({ date: moment(bookReadAt).isoWeekday(1), week: true });
            const createdString = `${createdYearAndMonth}-${createdWeek}`;

            if (!log) {
                log = {};
            }

            if (log[createdString]) {
                log[createdString] = [...log[createdString], { ...data }];
            } else {
                log[createdString] = [{ ...data }];
            }

            return null;
        });

        return log;
    };

    const addLog = (feedback, callback) => {
        if (
            (feedback?.userType === TEACHER && token?.userType === TEACHER) ||
            (feedback?.userType === TOPICACCESS && token?.userType === PARENT && token?.userTrustLevel == 2) ||
            (feedback?.userType === MAGICPARENT && token?.userType === PARENT && token?.userTrustLevel == 2) ||
            (feedback?.userType === PARENT && token?.userType === TEACHER && token?.sub === feedback?.userId) ||
            (feedback?.userType === PARENT &&
                token?.userType === PARENT &&
                token?.userTrustLevel == 2 &&
                token?.sub === feedback?.userId) ||
            token?.userType === ADMIN
        ) {
            callback();
        } else if (token?.userTrustLevel < 2 && token?.sub === feedback?.userId) {
            setIsSignInModal({
                open: true,
                isEditing: true
            });
        }
    };

    const collapseButtonHandler = () => {
        if (token?.userTrustLevel < 2) {
            setIsSignInModal({
                open: true,
                isEditing: false
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

    const renderBookStatus = (result) => {
        const { isBookFinished, bookName, logCreatedBy, userName, pageNumber, userId, readingType, readingMode, pupilCount } = result;

        const readingVerb = readingModePhrases[readingMode] || 'read';
        const objectLink = readingModeObjectLinks[readingMode] ? `${readingModeObjectLinks[readingMode]} ` : '';

        const readAsGroup = pupilCount > 1 ? 'as part of a group' : '';

        const renderName = () => {
            // Reading independently means nobody read along, so naming a person here would contradict the
            // verb. The group phrase stays, because it describes how the entry was recorded rather than who
            // read with the child, and the card icon still shows whether a parent or a teacher logged it.
            if (readingMode === ReadingMode.READ_INDEPENDENTLY) {
                return readAsGroup ? ` ${readAsGroup}` : null;
            }

            if (logCreatedBy?.nameForChildren) {
                return token?.userTrustLevel < 2 ? (
                    ` ${readAsGroup} with a teacher`
                ) : (
                    <>
                        {readAsGroup ? ` ${readAsGroup}` : ''}
                        {logCreatedBy ? (
                            <>
                                {' '}
                                with <b>{logCreatedBy?.nameForChildren}</b>
                            </>
                        ) : (
                            ''
                        )}
                    </>
                );
            } else if (token?.sub === userId) {
                return ` ${readAsGroup} with you`;
            } else if (userName) {
                return (
                    <>
                        {readAsGroup ? ` ${readAsGroup}` : ''} with <b>{userName}</b>
                    </>
                );
            }

            return null;
        };

        const renderReadingType = () => {
            if (readingType === ReadingBookOptions.SCHOOL_BOOK) {
                return (
                    <>
                        a <b>school book</b>,{' '}
                    </>
                );
            } else if (readingType === ReadingBookOptions.OWN_BOOK) {
                return (
                    <>
                        their <b>own book</b>,{' '}
                    </>
                );
            }

            return null;
        };

        return (
            <>
                <b>{pupil?.pupil?.fullname}</b> {readingVerb}{' '}
                {isBookFinished ? (
                    ' and finished '
                ) : pageNumber ? (
                    <>
                        up to <b>page {pageNumber}</b> of{' '}
                    </>
                ) : (
                    objectLink
                )}
                {renderReadingType()}
                <b>{bookName}</b>
                {renderName()}.
            </>
        );
    };

    const customClasses = (result) => {
        const isParentOrTopicAccess = [TOPICACCESS, MAGICPARENT, PARENT].includes(result?.userType);
        const isTeacher = result?.userType === TEACHER;
        const isAdminWithChildId = result?.userType === ADMIN && queryParams?.child_id;
        const isAdminWithPupilId = result?.userType === ADMIN && queryParams?.pupil_id;
        const isSameDay = result?.isOfSameDay;
        const includeInReadingTarget = result?.includeInReadingTarget;

        let customClass = 'history_log_feed';

        if ((isParentOrTopicAccess && !isSameDay) || (isAdminWithChildId && !isSameDay)) {
            customClass += ` ${classes.iconHome}`;
        } else if ((isParentOrTopicAccess && isSameDay) || (isAdminWithChildId && isSameDay) || (isTeacher && isSameDay)) {
            customClass += ` ${classes.isOfSameDay}`;
        } else if ((result?.userType === TEACHER || isAdminWithPupilId) && includeInReadingTarget) {
            customClass += ` ${classes.iconSchool}`;
        } else if (!includeInReadingTarget) {
            customClass += ` ${classes.notCountingTowardsTarget}`;
        }

        return customClass;
    };

    const handleClickedLoginOrSignUpModal = () => {
        if (token?.status === 'ACTIVE') {
            handleActiveUser();
        } else {
            handleInvitedUser(token?.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber);
        }
    };

    return (
        <div className={`history_log ${classes.history_container}`}>
            {!readingLoading && !readingLogData?.length ? (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'Nothing to show here'}
                    subHeading={'Submit comments, audio or photos to add them to your history.'}
                />
            ) : (
                ''
            )}
            {readingLog &&
                Object?.keys(readingLog)?.map((t) => {
                    const currentWeek = moment().isoWeekday(1).format('w');
                    const readingWeek = moment(readingLog?.[t]?.[0]?.bookReadAt).isoWeekday(1).format('w');

                    const count = currentWeek - readingWeek;

                    let temp;

                    if (count === 0) {
                        temp = 'This week';
                    } else if (count === 1) {
                        temp = 'Last week';
                    } else {
                        const date = showDate({ date: readingLog?.[t]?.[0]?.pupilTopic?.releaseDate });

                        temp = `Week starting ${date}`;
                    }

                    return (
                        <>
                            <CommonLazyLoading
                                fetchMore={_fetchMore}
                                previousDataLength={readingLogData?.length}
                                hasMoreLoading={pupilReadingLog?.allPupilReadingLogs?.total !== readingLogData?.length}
                                loadingContent={<CommonLoading />}>
                                <Divider style={{ margin: '24px 0' }}>
                                    <Paragraph customClass="history_log_dividerText">{temp}</Paragraph>
                                </Divider>
                                {(readingLog[t] || [])?.map((result) => {
                                    return (
                                        <div className={classes.history_container} data-test={'reading-history-card'}>
                                            <CommonActivityFeedCard
                                                key={result?.id}
                                                classTitle=""
                                                customClass={customClasses(result)}
                                                editActivity={(_, callback) => addLog(result, callback)}
                                                showTickedAllFeedbackQuery={showTickedAllFeedbackQuery}
                                                setFeeds={setReadingLogData}
                                                user={pupil?.pupil}
                                                type={
                                                    (!result?.includeInReadingTarget && result?.userType === TEACHER) || result?.isOfSameDay
                                                        ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                                                        : READING
                                                }
                                                displayEditIcon={
                                                    isCurrentWeek ? (viewByTeacher ? true : result?.pupilCount > 1 ? false : true) : false
                                                }
                                                thumb_up={false}
                                                isParent={true}
                                                isPupilReadingLog
                                                activityIcon={
                                                    result?.pupilCount > 1
                                                        ? 'groups'
                                                        : result?.userType === TEACHER ||
                                                            (result?.userType === ADMIN && queryParams?.pupil_id)
                                                          ? 'school'
                                                          : [TOPICACCESS, MAGICPARENT, PARENT].includes(result?.userType) ||
                                                              (result?.userType === ADMIN && queryParams?.child_id)
                                                            ? 'home'
                                                            : ''
                                                }
                                                feedback={result}
                                                classDate={result.bookReadAt}
                                                description={
                                                    result?.photos?.length > 0 || result?.audios?.length > 0 ? (
                                                        <div className={classes.history_log_container}>
                                                            {result?.photos?.length > 0 && (
                                                                <div className="history_log_img">
                                                                    <FeedbackCommentCard>
                                                                        <img src={result?.photos?.[0]?.filename} />
                                                                    </FeedbackCommentCard>
                                                                </div>
                                                            )}
                                                            {result?.audios?.length > 0 && (
                                                                <FeedbackCommentCard>
                                                                    <Heading1 text="Audio recording" />
                                                                    <StyledEngineProvider injectFirst>
                                                                        <ThemeProvider theme={muiTheme}>
                                                                            <AudioPlayer src={result?.audios?.[0]?.filename} />
                                                                        </ThemeProvider>
                                                                    </StyledEngineProvider>
                                                                </FeedbackCommentCard>
                                                            )}
                                                        </div>
                                                    ) : null
                                                }
                                                expandAll={
                                                    token?.userTrustLevel < 2 && result?.userType === TEACHER
                                                        ? true
                                                        : token?.userTrustLevel < 2 && !result?.feedbackReplies?.length > 0
                                                          ? false
                                                          : true
                                                }
                                                viewActivity={collapseButtonHandler}
                                                onReadingLogUpdate={onReadingLogUpdate}
                                                handleClickedLoginOrSignUpModal={handleClickedLoginOrSignUpModal}
                                                pupilId={pupil?.pupil?.id}>
                                                {renderBookStatus(result)}
                                            </CommonActivityFeedCard>
                                        </div>
                                    );
                                })}
                            </CommonLazyLoading>
                        </>
                    );
                })}

            {readingLogData?.length > 0 &&
                pupilReadingLog?.allPupilReadingLogs?.total === readingLogData?.length &&
                showAllTick?.haveUnTickedFeedbacks &&
                queryParams?.pupil_id && (
                    <MarkAsSeen
                        showAllTick={showAllTick?.haveUnTickedFeedbacks}
                        setFeeds={setReadingLogData}
                        allFeeds={readingLogData}
                        user={pupil?.pupil}
                        showTickedAllFeedbackQuery={showTickedAllFeedbackQuery}
                        isAllTick
                    />
                )}

            {token?.userTrustLevel < 2 && pupilReadingLog?.allPupilReadingLogs?.total === readingLogData?.length && (
                <LoginOrSignUpStatusPrompt redirectPath={`/child/${pupilId}/reading?topicId=${topicId}`} />
            )}

            {isSignInModal && (
                <LoginOrSignUpModal
                    open={isSignInModal?.open}
                    setOpen={() => setIsSignInModal({ open: false, isEditing: false })}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        token?.status === 'ACTIVE' ? 'log in to your account' : 'set up a user account'
                    } to ${isSignInModal.isEditing ? 'edit' : 'view the full'} reading log`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={handleClickedLoginOrSignUpModal}
                />
            )}
        </div>
    );
};

HistoryLog.propTypes = {
    readingLoading: PropTypes.bool,
    collapse: PropTypes.bool,
    isCurrentWeek: PropTypes.bool,
    viewByTeacher: PropTypes.bool,
    setReadingLogData: PropTypes.func,
    readingLogData: PropTypes.array,
    _fetchMore: PropTypes.func,
    pupilReadingLog: PropTypes.array,
    pupil: PropTypes.object,
    user: PropTypes.object,
    onReadingLogUpdate: PropTypes.func
};

export default HistoryLog;
