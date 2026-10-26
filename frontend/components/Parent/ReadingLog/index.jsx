/* eslint-disable @next/next/no-img-element */
import { useMutation, useQuery } from '@apollo/client';
import { Card, Collapse, FormControl, FormControlLabel, Grid, Paper, Radio, RadioGroup } from '@mui/material';
import { Form, Formik } from 'formik';
import gql from 'graphql-tag';
import { debounce } from 'lodash';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import Breadcrumb from '../../../components/Parent/Breadcrumb';
import {
    getClassReadingTopicForWeekByWeek,
    getGroupAcrossClassesReadingTopicForWeekByWeek,
    getPupilReadingNoteForReadingLog,
    getReadingTopics,
    getRecommendedPupilTopicsForTodoTopicLists
} from '../../../graphQl/queries';
import {
    ADMIN,
    classReadingProgress,
    formIncompleteWarning,
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    PAGINATION_ITEM_LIMIT,
    PARENT,
    SCHOOLLEADER,
    TEACHER,
    TOPICACCESS,
    unexpectedError
} from '../../../shared/Constant';
import { useSavingLock } from '../../../shared/hooks/useSavingLock';
import { getHtml, showDate, ThemeContext, ViewAsEntity } from '../../../shared/Services/handler';
import PermissionCheckboxes from '../../Shared/PermissionCheckboxes';
import { readingLogValidationForParent, readingLogValidationForTeacher } from '../../../shared/validations';
import HistoryLog from '../../PagesContent/HistoryLog';
import ReadinglogModal from '../../PagesContent/ReadingLogModal';
import ReadingLogSlider from '../../PagesContent/Slider';
import WelcomeChild from '../../PagesContent/WelcomeChild';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonAddPupilInTag from '../../Shared/CommonAddPupilInTag';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonLoading from '../../Shared/CommonLoading';
import InputField from '../../Shared/InputField/InputField';
import MathScotWithBubbleText from '../../Shared/MathScotWithBubbleText';
import PupilBookHistoryModal from '../../Shared/Modals/PupilBookHistoryModal';
import SurveyModal from '../../Shared/Modals/SurveyModal';
import UpdateReadingLog from '../../Shared/Modals/UpdateReadingLog';
import SelectLoggedBookName from '../../Shared/SelectLoggedBookName';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading2 from '../../Shared/Typography/Heading2';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import ReadingLogForParent from '../ReadingLogForParent';
import ReadingLogForTeacher from '../ReadingLogForTeacher';
import { getPupilTopicsForTodoTopicLists } from '../../PagesContent/TodoTopicLists';
import { matchBooks } from '../../../shared/Services/handler';
import { ReadingBookOptions, ReadingMode } from 'lwp-shared';

// Queries

const GET_PUPIL_BOOKS = gql`
    query getPupilBooks($pupilId: String!) {
        getPupilBooks(pupilId: $pupilId) {
            bookName
            isBookFinished
            pageNumber
            readingType
        }
    }
`;

const getParameterByKeyForReadingLog = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

const getUserForReadingLog = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            type
            sharingAllowed
            nameForChildren
            showInterstitial {
                id
                optedOut
            }
        }
    }
`;

const getPupilForReadingLog = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            previousMathscotImage
            parentWatchedIntroVideo
            currentMathscot {
                character
                colour
            }
            school {
                id
                parentFeedbackTickFeatureEnabledAt
                isParentFeedbackReplyFeatureEnabled
                isParentFeedbackStickerFeatureEnabled
                organisations
                privacyPolicy
                enableBookNameOnlyReadingLog
            }
            currentClassOrGroupAcrossClasses {
                id
                name
                isFullProgramme
                IsReadingLogsEnabled
            }
            mathscotUrl {
                bigImage
                thumbnailImage
            }
            tags {
                id
                name
                color
            }
        }
    }
`;

const allPupilReadingLogsForReadingLogForParent = (trusted = false) => gql`
    query allPupilReadingLogs($pupilId: String!, $limit: Float, $offset: Float) {
        allPupilReadingLogs(pupilId: $pupilId, limit: $limit, offset: $offset) {
            total
            limit
            offset
            page_total
            results {
                id
                bookName
                bookReadAt
                isBookFinished
                comment
                sharingAllowed
                logCreatedAt
                type
                pupilCount
                includeInReadingTarget
                readingType
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
                userId
                userType
                pageNumber
                userName
                logCreatedBy {
                    nameForChildren
                    id
                    firstname
                    lastname
                    ${trusted ? 'type' : ''}
                }
                pupilTopic {
                    id
                    releaseDate
                }
                lastAction {
                    updatedAt
                }
                originalFeedbackId
                entryDeletedAt
                reasonToDelete
            }
        }
    }
`;

const allPupilReadingLogsForReadingLogForTeacher = gql`
    query allPupilReadingLogs($pupilId: String!, $limit: Float, $offset: Float) {
        allPupilReadingLogs(pupilId: $pupilId, limit: $limit, offset: $offset) {
            total
            limit
            offset
            page_total
            results {
                id
                bookName
                bookReadAt
                isBookFinished
                school {
                    id
                }
                comment
                privateNote
                sharingAllowed
                logCreatedAt
                type
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
                    id
                    firstname
                    lastname
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
    }
`;

const getPupilReadingTopicForReadingLogSlider = gql`
    query getPupilReadingTopic($pupilId: String!, $topicId: String!) {
        getPupilReadingTopic(pupilId: $pupilId, topicId: $topicId) {
            prevReadingTopicId
            nextReadingTopicId
            readingTopic {
                id
                releaseDate
                class {
                    id
                    name
                }
            }
        }
    }
`;

// Mutations

const addReadingLogForReadingLogForParent = gql`
    mutation addReadingLog($input: AddReadingLogInput!) {
        addReadingLog(input: $input) {
            id
            bookName
            bookReadAt
            isBookFinished
            comment
            sharingAllowed
            readingType
            readingMode
            includeInReadingTarget
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
            }
            pupilTopic {
                id
                releaseDate
            }
            pupilCount
        }
    }
`;

const addReadingLogForReadingLogForTeacher = gql`
    mutation addReadingLog($input: AddReadingLogInput!) {
        addReadingLog(input: $input) {
            id
            bookName
            bookReadAt
            isBookFinished
            comment
            privateNote
            sharingAllowed
            includeInReadingTarget
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
            }
            pupilTopic {
                id
                releaseDate
            }
            pupilCount
        }
    }
`;

const ReadingLog = ({
    topic_id,
    pupil_id,
    getPupilFeedbackByPupilTopicId,
    pupilFeedback = [],
    refetchQueries = [],
    showOnlySlider = false,
    isCurrentWeek = true
}) => {
    const { setChildDetails, callSnackbar, token, userId } = useContext(ThemeContext);
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const [collapse, setCollapse] = useState(null);
    const [openSurveyModal, setOpenSurveyModal] = useState(false);
    const [id, setId] = useState(null);
    const [open, setOpen] = useState(null);
    const [, setFileName] = useState(null);
    const [showPhotoPermission, setShowPhotoPermission] = useState(true);
    const [permissionParam, setPermissionParam] = useState(null);
    const [readingLogData, setReadingLogData] = useState([]);
    const [routeChanged, setRouteChanged] = useState(false);
    const [bookHistoryModal, setBookHistoryModal] = useState({ open: false });
    const { isSaving, hasSavingLock, setSavingLock } = useSavingLock();
    const [pupilBooks, setPupilBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);

    /**
     * "editFeedbackModal" is just for "ReadingLogModal" when user clicked on "Edit" button. from there we can edit the feedback.
     * "open" is for UpdateReadingLog Modal will appear or not
     * "feedbackId" is for getting feedback by this id.
     * "date" is for Open the ReadingLogModal with the date.
     */
    const [editFeedbackModal, setEditFeedbackModal] = useState({ open: false, feedbackId: null });

    // Clear reading log data when we change route.
    router.events.on('routeChangeStart', () => setRouteChanged(true));

    const viewByTeacher = queryParams?.pupil_id || pupil_id;
    const viewByParent = queryParams?.child_id;

    const pupilId = viewByParent || viewByTeacher;
    const topicId = topic_id || searchParams.get('topicId');

    const parentAllPupilReadingLogsQuery = allPupilReadingLogsForReadingLogForParent(token?.userTrustLevel >= 2);

    // This document is the teacher's book list, and the query that reads it is skipped unless a
    // teacher is viewing. Refetching it on a parent save is a round trip the parent waits for, via
    // awaitRefetchQueries, and nothing reads the result. The parent's own suggestions come from a
    // separate document keyed by reading mode, which revalidates itself.
    const teacherPupilBooksRefetch = viewByTeacher ? [{ query: GET_PUPIL_BOOKS, variables: { pupilId } }] : [];

    const readingLogRefetchQueries = [
        {
            query: getPupilFeedbackByPupilTopicId,
            variables: { pupilTopicId: topicId, pupilId: pupilId, type: 'READING' }
        },
        {
            query: getPupilTopicsForTodoTopicLists,
            variables: { id: pupilId }
        },
        {
            query: getRecommendedPupilTopicsForTodoTopicLists,
            variables: { id: pupilId }
        },
        { query: parentAllPupilReadingLogsQuery },
        ...teacherPupilBooksRefetch
    ];

    if (refetchQueries.length > 0) readingLogRefetchQueries.push(...refetchQueries);

    const [addReadingLogMutation, { loading: addReadingLogLoading }] = useMutation(
        viewByTeacher ? addReadingLogForReadingLogForTeacher : addReadingLogForReadingLogForParent,
        {
            refetchQueries: readingLogRefetchQueries,
            awaitRefetchQueries: true
        }
    );

    const {
        loading: readingLoading,
        error: readingError,
        data: pupilReadingLog,
        fetchMore
    } = useQuery(viewByTeacher ? allPupilReadingLogsForReadingLogForTeacher : parentAllPupilReadingLogsQuery, {
        variables: { pupilId: pupilId, offset: 0, limit: PAGINATION_ITEM_LIMIT },
        fetchPolicy: 'cache-first',
        skip: !(pupilId && !showOnlySlider)
    });

    const {
        error: error,
        data: readingNote,
        loading: loadingReadingNote
    } = useQuery(getPupilReadingNoteForReadingLog, {
        variables: { pupilId, pupilTopicId: topicId },
        skip: !(pupilId && topicId),
        fetchPolicy: 'cache-first'
    });

    const { loading: getPermissionParameterLoading, data: permissionParameter } = useQuery(getParameterByKeyForReadingLog, {
        variables: { key: 'COMMENT_PHOTO_PERMISSIONS' },
        fetchPolicy: 'cache-first'
    });

    const {
        loading: readingTopicLoading,
        error: readingTopicError,
        data: getReadingTopic
    } = useQuery(getPupilReadingTopicForReadingLogSlider, {
        variables: { pupilId: pupilId, topicId: topicId },
        fetchPolicy: 'cache-first',
        skip: !(pupilId && topicId)
    });

    const { error: getUserError, data: user } = useQuery(getUserForReadingLog, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    const { data: pupil } = useQuery(getPupilForReadingLog, { variables: { id: pupilId }, skip: !pupilId, fetchPolicy: 'cache-first' });

    // This will fetch pupil books for teachers on component mount
    const {
        data: pupilBooksData,
        loading: pupilBooksLoading,
        error: pupilBooksError
    } = useQuery(GET_PUPIL_BOOKS, {
        variables: { pupilId },
        skip: !(collapse && viewByTeacher && pupilId)
    });

    useEffect(() => {
        if (readingTopicError?.message) {
            callSnackbar(readingTopicError, 'warning');

            // Navigate to pupil's only when viewing by parent
            if (topicId && viewByParent) router?.push({ pathname: `/child/${pupilId}/reading`, query: {} }); // try again with no topicId
        }
    }, [readingTopicError, viewByParent, topic_id]);

    useEffect(() => {
        pupilBooksError?.message && callSnackbar(pupilBooksError, 'error');
    }, [pupilBooksError]);

    // This is triggered when teacher opens reading log for a pupil using class/readingweek page for new entry
    useEffect(() => {
        if (pupilBooksData?.getPupilBooks && viewByTeacher) {
            setPupilBooks(pupilBooksData.getPupilBooks);
            const filteredBooks = matchBooks(pupilBooksData.getPupilBooks, '', ReadingBookOptions.SCHOOL_BOOK);
            setFilteredBooks(filteredBooks);
        }
    }, [pupilBooksData, viewByTeacher]);

    useEffect(() => {
        if (permissionParameter?.getParameterByKey?.value) {
            setPermissionParam(JSON.parse(permissionParameter?.getParameterByKey?.value));
        }
    }, [permissionParameter]);

    const {
        loading: readingTopicsLoading,
        error: readingTopicsError,
        data: pupilReadingTopics
    } = useQuery(getReadingTopics, {
        variables: { pupilId },
        fetchPolicy: 'cache-first',
        skip: !pupilId
    });

    useEffect(() => {
        readingError?.message && callSnackbar(readingError, 'error');
        error?.message && callSnackbar(error, 'error');
        readingTopicsError?.message && callSnackbar(readingTopicsError, 'error');
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [error, readingError, readingTopicsError, getUserError]);

    useEffect(() => {
        if (null == pupil) {
            return;
        }

        setChildDetails({ id: pupil.pupil.id, firstName: pupil.pupil.firstName });
    }, [pupil]);

    useEffect(() => {
        if (user?.getUser?.sharingAllowed == null) {
            setShowPhotoPermission(true);
        } else {
            setShowPhotoPermission(false);
        }
    }, [user, id, collapse]);

    const fetchAndUpdateReadingLogs = (getPupilForReadingLog) => {
        // Don't include existing reading log data if the route changed.
        const getAllData = [...getPupilForReadingLog, ...(routeChanged ? [] : readingLogData)];

        if (routeChanged) {
            // Clear past reading log data, and then clear the route changed marker.
            setRouteChanged(false);
        }

        const result = getAllData.reduce((accumulator, current) => {
            let exists = accumulator.find((item) => {
                return item.id === current.id;
            });

            if (!exists) {
                accumulator = accumulator.concat(current);
            }

            return accumulator;
        }, []);

        sortReadingLogs(result);
    };

    const _fetchMore = async () => {
        const data = await fetchMore({
            variables: { pupilId: pupilId, offset: readingLogData.length, limit: PAGINATION_ITEM_LIMIT }
        });

        if (data?.data?.allPupilReadingLogs?.results?.length > 0) {
            fetchAndUpdateReadingLogs(data?.data?.allPupilReadingLogs?.results);
        }
    };

    useEffect(() => {
        if (pupilReadingLog?.allPupilReadingLogs?.results?.length > 0) {
            fetchAndUpdateReadingLogs(pupilReadingLog?.allPupilReadingLogs?.results);
        }
    }, [pupilReadingLog]);

    useEffect(() => {
        if (pupilFeedback?.length > 0) {
            fetchAndUpdateReadingLogs(pupilFeedback);
        }
    }, [pupilFeedback]);

    const getReadingWeekProgress = (classReadingTarget, pupilEarnedStars) => {
        if (classReadingTarget === 0) return classReadingProgress.NOT_SET;
        if (classReadingTarget > pupilEarnedStars) return classReadingProgress.IN_PROGRESS;

        return classReadingProgress.COMPLETED;
    };

    const sortReadingLogs = (readlingLogs) => {
        setReadingLogData((readlingLogs || [])?.sort((a, b) => (a.bookReadAt < b.bookReadAt ? 1 : b.bookReadAt < a.bookReadAt ? -1 : 0)));
    };

    const isCurrentTopic = () => {
        const nextTopicId = getReadingTopic?.getPupilReadingTopic?.nextReadingTopicId;

        return !nextTopicId;
    };

    const breadCumbLists = [
        {
            route: '/',
            homeIcon: true
        },
        {
            label: `${pupil?.pupil?.currentClassOrGroupAcrossClasses?.name}`,
            route: `/class/${pupil?.pupil?.currentClassOrGroupAcrossClasses?.id}/readingweek`
        },
        {
            label: `${pupil?.pupil?.fullname}`,
            route: [ADMIN, PARENT, MAGICPARENT].includes(user?.getUser?.type) ? `/child/${pupilId}` : `/pupil/${pupilId}`
        },
        {
            label: 'Reading log'
        }
    ];

    const disableViewAsParent = token?.userType === TEACHER && !!viewByParent;

    const searchPupilBooks = useCallback(
        debounce((substring, readingType = null) => {
            const books = matchBooks(pupilBooks, substring, readingType);
            setFilteredBooks(books);
        }, 300),
        [pupilBooks]
    );

    const suggestedBookNames = useMemo(() => {
        return viewByTeacher ? filteredBooks : [];
    }, [viewByTeacher, filteredBooks]);

    const onReadingLogUpdate = (feed, removedPupils) => {
        /**
         * When updating the reading log, if a pupil is removed from the list,
         * their reading log entry should also be removed.
         */
        if (pupilId && removedPupils?.length > 0 && removedPupils.includes(pupilId)) {
            sortReadingLogs(readingLogData?.filter((item) => item?.id !== feed?.id));
        } else {
            sortReadingLogs(readingLogData?.map((item) => (item?.id === feed?.id ? { ...item, ...feed } : item)));
        }
    };

    if ((readingTopicsLoading && !getReadingTopic) || (readingTopicLoading && !pupilReadingTopics)) return <CommonLoading />;

    return (
        <>
            <div className="reading_log_container">
                {!showOnlySlider && (
                    <>
                        {(user?.getUser?.type === TEACHER || user?.getUser?.type === SCHOOLLEADER) && viewByTeacher && (
                            <>
                                <Breadcrumb breadcrumbLists={breadCumbLists} customClass="hide-on-mobile" />
                                <Grid container alignItems={'center'} justifyContent={'center'} gap={2} pb={3}>
                                    <Grid item>
                                        <Heading1
                                            text={`${pupil?.pupil?.firstname}'s reading log`}
                                            dataTest="pupil-reading-log-heading"
                                            customClass="hide-on-mobile"
                                        />

                                        <div className="hide-on-desktop wel_head">
                                            <WelcomeChild child_name={pupil?.pupil?.firstname} images={[]} subHeading={false} />
                                        </div>
                                    </Grid>
                                    <Grid item>
                                        <CommonAddPupilInTag
                                            tags={pupil?.pupil.tags}
                                            pupilId={pupil?.pupil?.id}
                                            schoolId={pupil?.pupil?.school?.id}
                                            query={getPupilForReadingLog}
                                            variables={{ id: pupilId }}
                                        />
                                    </Grid>
                                </Grid>
                            </>
                        )}

                        {viewByParent ? (
                            <div className="is-current-topic">
                                {!isCurrentTopic() && (
                                    <LWPButton
                                        customClass="mb-20"
                                        btnText="Jump to the current week"
                                        variant="secondary"
                                        startIcon="rotate_right"
                                        onClick={() => router?.push(`/child/${pupilId}/reading`, undefined, { scroll: false })}
                                    />
                                )}
                            </div>
                        ) : null}

                        {readingNote?.['getPupilReadingNote']?.messageText && (
                            <MathScotWithBubbleText
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Teacher-2.png`}
                                headingText={`${readingNote?.['getPupilReadingNote']?.headingText} says:`}
                                bubbleText={`${readingNote?.['getPupilReadingNote']?.messageText}`}
                            />
                        )}

                        {!loadingReadingNote && (
                            <div
                                className={`reading_log_target_container ${
                                    getReadingWeekProgress(
                                        readingNote?.getPupilReadingNote?.classReadingTarget,
                                        readingNote?.getPupilReadingNote?.pupilEarnedStars
                                    ) === classReadingProgress.NOT_SET
                                        ? 'blue-bg'
                                        : getReadingWeekProgress(
                                                readingNote?.getPupilReadingNote?.classReadingTarget,
                                                readingNote?.getPupilReadingNote?.pupilEarnedStars
                                            ) === classReadingProgress.IN_PROGRESS
                                          ? 'yellow-bg'
                                          : 'green-bg'
                                }`}>
                                <div
                                    className={`reading_log_target_book_container ${
                                        getReadingWeekProgress(
                                            readingNote?.getPupilReadingNote?.classReadingTarget,
                                            readingNote?.getPupilReadingNote?.pupilEarnedStars
                                        ) === classReadingProgress.NOT_SET
                                            ? 'blue-book-bg'
                                            : getReadingWeekProgress(
                                                    readingNote?.getPupilReadingNote?.classReadingTarget,
                                                    readingNote?.getPupilReadingNote?.pupilEarnedStars
                                                ) === classReadingProgress.IN_PROGRESS
                                              ? 'yellow-book-bg'
                                              : 'green-book-bg'
                                    }`}>
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/orange_book.png`}
                                    />
                                </div>

                                <div className="reading_log_target_text">
                                    <Heading1
                                        text={
                                            getReadingWeekProgress(
                                                readingNote?.getPupilReadingNote?.classReadingTarget,
                                                readingNote?.getPupilReadingNote?.pupilEarnedStars
                                            ) === classReadingProgress.NOT_SET
                                                ? 'There is no reading target for this week'
                                                : getReadingWeekProgress(
                                                        readingNote?.getPupilReadingNote?.classReadingTarget,
                                                        readingNote?.getPupilReadingNote?.pupilEarnedStars
                                                    ) === classReadingProgress.IN_PROGRESS
                                                  ? `Read on ${
                                                        readingNote?.getPupilReadingNote?.classReadingTarget -
                                                        readingNote?.getPupilReadingNote?.pupilEarnedStars
                                                    } more ${
                                                        readingNote?.getPupilReadingNote?.classReadingTarget -
                                                            readingNote?.getPupilReadingNote?.pupilEarnedStars ===
                                                        1
                                                            ? 'day'
                                                            : 'days'
                                                    } to reach this week's target`
                                                  : `Target met for this week - well done!`
                                        }
                                        customClass={
                                            getReadingWeekProgress(
                                                readingNote?.getPupilReadingNote?.classReadingTarget,
                                                readingNote?.getPupilReadingNote?.pupilEarnedStars
                                            ) === classReadingProgress.NOT_SET
                                                ? 'blue-text'
                                                : getReadingWeekProgress(
                                                        readingNote?.getPupilReadingNote?.classReadingTarget,
                                                        readingNote?.getPupilReadingNote?.pupilEarnedStars
                                                    ) === classReadingProgress.IN_PROGRESS
                                                  ? 'yellow-text'
                                                  : 'green-text'
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {isCurrentWeek && (!topicId ? !readingLogData.length : getReadingTopic?.getPupilReadingTopic) ? (
                    <div className="slider_container">
                        <Collapse in={typeof collapse === typeof '' ? true : false} collapsedSize={160} className="collapse_continer">
                            <Paper elevation={4}>
                                <Formik
                                    validationSchema={
                                        viewByTeacher
                                            ? readingLogValidationForTeacher
                                            : readingLogValidationForParent(
                                                  pupil?.pupil?.school?.enableBookNameOnlyReadingLog,
                                                  hasSavingLock
                                              )
                                    }
                                    initialValues={{
                                        readingType: null,
                                        readingMode: null,
                                        bookName: '',
                                        readDate: '',
                                        finishedBook: null,
                                        includeInReadingTarget: false,
                                        pageNumber: '',
                                        comments: '',
                                        note: '',
                                        audioFile: '',
                                        photo: '',
                                        shareWithTeacher: viewByTeacher ? true : user?.getUser?.sharingAllowed == null ? false : true,
                                        sharingAllowed: user?.getUser?.sharingAllowed === true ? true : false,
                                        rememberPermissions: false,
                                        thoughts: null
                                    }}
                                    enableReinitialize
                                    onSubmit={async (values, { resetForm }) => {
                                        // Enter in a field submits the form even while the button is disabled.
                                        if (hasSavingLock()) {
                                            callSnackbar('Please wait for your photo or voice note to finish uploading', 'warning');

                                            return;
                                        }

                                        try {
                                            let {
                                                readingType,
                                                readingMode,
                                                bookName,
                                                comments,
                                                finishedBook,
                                                pageNumber,
                                                readDate,
                                                note,
                                                includeInReadingTarget
                                            } = values;

                                            const hasABookToFinish =
                                                readingMode !== ReadingMode.READ_IN_REAL_WORLD &&
                                                readingType !== ReadingBookOptions.SOMETHING_ELSE;

                                            const newBookRead = readDate || collapse;

                                            const userType =
                                                token?.userType === ADMIN
                                                    ? ViewAsEntity(router?.asPath) === 'Parent'
                                                        ? PARENT
                                                        : TEACHER
                                                    : token?.userType;

                                            if (viewByTeacher) {
                                                const { data } = await addReadingLogMutation({
                                                    variables: {
                                                        input: {
                                                            pupilId,
                                                            bookName: bookName,
                                                            userName: token?.userName ?? null,
                                                            userType: userType ?? null,
                                                            comment: comments,
                                                            includeInReadingTarget,
                                                            privateNote: note,
                                                            isBookFinished: finishedBook,
                                                            pageNumber: `${pageNumber}`,
                                                            bookReadAt: newBookRead,
                                                            pupilTopicId: topicId,
                                                            sharingAllowed:
                                                                user?.getUser?.type === ADMIN || user?.getUser?.type === TEACHER
                                                                    ? false
                                                                    : values.sharingAllowed,
                                                            photo: values?.photo?.token ?? null,
                                                            audio: values?.audioFile?.token ?? null,
                                                            readingType: ReadingBookOptions.SCHOOL_BOOK
                                                        }
                                                    },
                                                    refetchQueries: [
                                                        {
                                                            query: viewByTeacher
                                                                ? allPupilReadingLogsForReadingLogForTeacher
                                                                : parentAllPupilReadingLogsQuery,
                                                            variables: {
                                                                pupilId,
                                                                offset: 0,
                                                                limit: PAGINATION_ITEM_LIMIT
                                                            }
                                                        },
                                                        { query: getReadingTopics, variables: { pupilId } },
                                                        {
                                                            query: getPupilReadingNoteForReadingLog,
                                                            variables: { pupilId, pupilTopicId: topicId }
                                                        },
                                                        { query: getUserForReadingLog, variables: { id: userId } },
                                                        ...(router?.query?.class_id
                                                            ? [
                                                                  {
                                                                      query: getClassReadingTopicForWeekByWeek,
                                                                      variables: {
                                                                          classId: router?.query?.class_id,
                                                                          topicId: router?.query?.topicId
                                                                      }
                                                                  },
                                                                  {
                                                                      query: getGroupAcrossClassesReadingTopicForWeekByWeek,
                                                                      variables: {
                                                                          classId: router?.query?.class_id,
                                                                          topicId: router?.query?.topicId
                                                                      }
                                                                  }
                                                              ]
                                                            : []),
                                                        {
                                                            query: getRecommendedPupilTopicsForTodoTopicLists,
                                                            variables: { id: pupilId }
                                                        },
                                                        ...teacherPupilBooksRefetch
                                                    ],
                                                    awaitRefetchQueries: true
                                                });

                                                callSnackbar('Reading entry has been added', 'success');
                                                resetForm({ values: '' });
                                                setCollapse(null);
                                                sortReadingLogs([data?.addReadingLog, ...readingLogData]);
                                                if (
                                                    [TOPICACCESS, MAGICPARENT, PARENT].includes(user?.getUser?.type) &&
                                                    user?.getUser?.showInterstitial?.id &&
                                                    !user?.getUser?.showInterstitial?.optedOut
                                                ) {
                                                    setOpenSurveyModal(true);
                                                }
                                            } else {
                                                const isTeacherOrAdmin = [ADMIN, TEACHER].includes(user?.getUser?.type);
                                                const { data } = await addReadingLogMutation({
                                                    variables: {
                                                        input: {
                                                            pupilId,
                                                            readingType,
                                                            readingMode,
                                                            bookName: bookName,
                                                            includeInReadingTarget,
                                                            userName: token?.userName ?? null,
                                                            userType: userType ?? null,
                                                            comment: comments,
                                                            isBookFinished: hasABookToFinish ? finishedBook : null,
                                                            pageNumber: hasABookToFinish ? `${pageNumber}` : null,
                                                            bookReadAt: newBookRead,
                                                            pupilTopicId: topicId,
                                                            sharingAllowedGlobal: isTeacherOrAdmin ? null : values.rememberPermissions,
                                                            sharingAllowed: isTeacherOrAdmin ? false : values.sharingAllowed,
                                                            photo: values?.photo?.token ?? null,
                                                            audio: values?.audioFile?.token ?? null
                                                        }
                                                    },
                                                    refetchQueries: [
                                                        {
                                                            query: viewByTeacher
                                                                ? allPupilReadingLogsForReadingLogForTeacher
                                                                : parentAllPupilReadingLogsQuery,
                                                            variables: {
                                                                pupilId,
                                                                offset: 0,
                                                                limit: PAGINATION_ITEM_LIMIT
                                                            }
                                                        },
                                                        { query: getReadingTopics, variables: { pupilId } },
                                                        {
                                                            query: getPupilReadingNoteForReadingLog,
                                                            variables: { pupilId, pupilTopicId: topicId }
                                                        },
                                                        { query: getUserForReadingLog, variables: { id: userId } },
                                                        {
                                                            query: getRecommendedPupilTopicsForTodoTopicLists,
                                                            variables: { id: pupilId }
                                                        },
                                                        ...teacherPupilBooksRefetch
                                                    ],
                                                    awaitRefetchQueries: true
                                                });

                                                callSnackbar('Reading entry has been added', 'success');
                                                resetForm({ values: '' });
                                                setCollapse(null);
                                                sortReadingLogs([data?.addReadingLog, ...readingLogData]);
                                                if (
                                                    [TOPICACCESS, MAGICPARENT, PARENT].includes(user?.getUser?.type) &&
                                                    user?.getUser?.showInterstitial?.id &&
                                                    !user?.getUser?.showInterstitial?.optedOut
                                                ) {
                                                    setOpenSurveyModal(true);
                                                }
                                            }
                                        } catch (error) {
                                            const statusCode =
                                                error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                                            if (statusCode) {
                                                callSnackbar(error, 'error');
                                            } else {
                                                window.newrelic?.noticeError(error, { caught: true, handled: false });
                                                callSnackbar(unexpectedError, 'error');
                                            }
                                        }
                                    }}>
                                    {({
                                        values,
                                        handleChange,
                                        handleSubmit,
                                        handleBlur,
                                        errors,
                                        touched,
                                        resetForm,
                                        setFieldValue,
                                        validateForm
                                    }) => {
                                        // On a phone the missing fields are often scrolled out of view.
                                        const submitOrWarn = async () => {
                                            const formErrors = await validateForm();

                                            if (Object.keys(formErrors).length) callSnackbar(formIncompleteWarning, 'warning');

                                            handleSubmit();
                                        };

                                        return (
                                            <Form>
                                                {topicId ? (
                                                    <>
                                                        <div className="hide-on-mobile">
                                                            <ReadingLogSlider
                                                                setCollapse={setCollapse}
                                                                values={values}
                                                                collapse={collapse}
                                                                pupilReadingLog={pupilReadingLog ?? pupilFeedback}
                                                                pupilReadingTopics={pupilReadingTopics}
                                                                setOpen={setOpen}
                                                                open={open}
                                                                setFieldValue={setFieldValue}
                                                                setId={setId}
                                                                isMobile={false}
                                                                resetForm={resetForm}
                                                                getReadingTopic={getReadingTopic}
                                                                disableViewAsParent={disableViewAsParent}
                                                                showArrowButton={!showOnlySlider}
                                                            />
                                                        </div>
                                                        <div className="hide-on-desktop">
                                                            <ReadingLogSlider
                                                                setCollapse={setCollapse}
                                                                collapse={collapse}
                                                                pupilReadingLog={pupilReadingLog ?? pupilFeedback}
                                                                pupilReadingTopics={pupilReadingTopics}
                                                                setOpen={setOpen}
                                                                open={open}
                                                                setFieldValue={setFieldValue}
                                                                setId={setId}
                                                                isMobile
                                                                resetForm={resetForm}
                                                                getReadingTopic={getReadingTopic}
                                                                disableViewAsParent={disableViewAsParent}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Heading3
                                                        customClass={'no-reading-topic'}
                                                        text={`Reading for the week ${
                                                            pupilReadingTopics?.getReadingTopics[0]?.releaseDate
                                                                ? `starting  ${showDate({
                                                                      date: pupilReadingTopics?.getReadingTopics[0]?.releaseDate,
                                                                      time: true
                                                                  })}`
                                                                : ''
                                                        } can't be logged yet, please check back later.`}
                                                    />
                                                )}

                                                {viewByTeacher ? (
                                                    <>
                                                        <InputField
                                                            type="text"
                                                            label="What book are you reading?"
                                                            md={12}
                                                            lg={12}
                                                            name="bookName"
                                                            value={values.bookName}
                                                            onChange={(e) => {
                                                                handleChange(e);
                                                                if (pupilBooks.length) {
                                                                    searchPupilBooks(e.target.value, ReadingBookOptions.SCHOOL_BOOK);
                                                                }
                                                            }}
                                                            error={errors.bookName}
                                                            touched={touched.bookName}
                                                        />
                                                        {pupilBooksLoading || suggestedBookNames.length ? (
                                                            <SelectLoggedBookName
                                                                suggestedBookNames={suggestedBookNames}
                                                                disableViewAsParent={disableViewAsParent}
                                                                bookName={values?.bookName}
                                                                loading={pupilBooksLoading}
                                                                handleOnSelect={(bookName) => {
                                                                    if (disableViewAsParent) return;
                                                                    handleChange({
                                                                        target: {
                                                                            name: 'bookName',
                                                                            value: bookName
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                        ) : null}
                                                        <FormControl component="fieldset" classes={{ root: 'root' }}>
                                                            <Paragraph text="Did you finish this book?" />
                                                            <RadioGroup
                                                                name="finishedBook"
                                                                value={values.finishedBook}
                                                                onChange={(event) =>
                                                                    setFieldValue('finishedBook', 'true' === event.target.value)
                                                                }>
                                                                <FormControlLabel
                                                                    value={true}
                                                                    control={<Radio color="secondary" className="Radio_btn_3" />}
                                                                    label="Yes"
                                                                />
                                                                <FormControlLabel
                                                                    value={false}
                                                                    control={<Radio color="secondary" className="Radio_btn_3" />}
                                                                    label="No"
                                                                />
                                                            </RadioGroup>
                                                        </FormControl>
                                                        {false === values.finishedBook && (
                                                            <>
                                                                <br />
                                                                <InputField
                                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                    label="Which page did you get to?"
                                                                    md={12}
                                                                    lg={12}
                                                                    name="pageNumber"
                                                                    value={values.pageNumber}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={errors.pageNumber}
                                                                    touched={touched.pageNumber}
                                                                />
                                                            </>
                                                        )}
                                                        {viewByTeacher && (
                                                            <>
                                                                <CommonCheckBox
                                                                    name="includeInReadingTarget"
                                                                    checked={values.includeInReadingTarget}
                                                                    onBlur={handleBlur}
                                                                    onChange={handleChange}
                                                                    label="Count this towards weekly reading target"
                                                                    error={errors.includeInReadingTarget}
                                                                    touched={touched.includeInReadingTarget}
                                                                    className="includeInReadingTarget-checkbox"
                                                                />
                                                                <br />
                                                            </>
                                                        )}

                                                        <ReadingLogForTeacher
                                                            values={values}
                                                            handleChange={handleChange}
                                                            handleBlur={handleBlur}
                                                            setFileName={setFileName}
                                                            resetForm={resetForm}
                                                            setSavingLock={setSavingLock}
                                                        />
                                                    </>
                                                ) : (
                                                    <ReadingLogForParent
                                                        disableViewAsParent={disableViewAsParent}
                                                        values={values}
                                                        handleChange={handleChange}
                                                        setFieldValue={setFieldValue}
                                                        handleBlur={handleBlur}
                                                        errors={errors}
                                                        touched={touched}
                                                        setFileName={setFileName}
                                                        // setIsShowParentCheckbox={setIsShowParentCheckbox}
                                                        resetForm={resetForm}
                                                        enableBookNameOnlyReadingLog={pupil?.pupil?.school?.enableBookNameOnlyReadingLog}
                                                        setSavingLock={setSavingLock}
                                                    />
                                                )}

                                                {!(user?.getUser?.type === TEACHER) && values?.readingMode && (
                                                    <PermissionCheckboxes
                                                        permissionParam={permissionParam}
                                                        organisations={pupil?.pupil?.school?.organisations}
                                                        privacyPolicy={pupil?.pupil?.school?.privacyPolicy}
                                                        showPhotoPermission={showPhotoPermission}
                                                        setShowPhotoPermission={setShowPhotoPermission}
                                                        getPermissionParameterLoading={getPermissionParameterLoading}
                                                    />
                                                )}
                                                {(user?.getUser?.type === ADMIN || user?.getUser?.type === TEACHER) &&
                                                    permissionParam?.teacher_permission &&
                                                    values?.readingMode && (
                                                        <Card className="demo-activity-photo-permission-update-card">
                                                            <Paragraph>
                                                                {getHtml(permissionParam?.teacher_permission, {
                                                                    ORGANISATIONS: pupil?.pupil?.school?.organisations
                                                                })}
                                                            </Paragraph>
                                                        </Card>
                                                    )}
                                                {viewByParent && values?.readingMode ? (
                                                    <>
                                                        {/* The day has no field in the form, so its error has nowhere else to appear.
                                                            Without it, saving before a day is chosen would simply do nothing. */}
                                                        {errors?.readDate && touched?.readDate ? (
                                                            <div className="reading-day-error" data-test="reading-day-error">
                                                                <Paragraph>{errors?.readDate}</Paragraph>
                                                            </div>
                                                        ) : null}
                                                        <div className="reader-btn">
                                                            <LWPButton
                                                                customClass="cancel_btn"
                                                                variant="text"
                                                                onClick={() => {
                                                                    setCollapse(null);
                                                                    resetForm({ values: '' });
                                                                    setId(null);
                                                                }}
                                                                btnText="Cancel"
                                                                color="inherit"
                                                            />
                                                            <LWPButton
                                                                dataTest={'submit-reading-log-button'}
                                                                customClass="m-25"
                                                                disabled={disableViewAsParent || isSaving}
                                                                btnText={`Add reading log`}
                                                                onClick={submitOrWarn}
                                                                loading={addReadingLogLoading}
                                                            />
                                                        </div>
                                                    </>
                                                ) : !values?.readingMode && viewByTeacher ? (
                                                    <div className="reader-btn">
                                                        <LWPButton
                                                            customClass="cancel_btn"
                                                            variant="text"
                                                            onClick={() => {
                                                                setCollapse(null);
                                                                resetForm({ values: '' });
                                                            }}
                                                            btnText="Cancel"
                                                            color="inherit"
                                                        />
                                                        <LWPButton
                                                            customClass="m-25"
                                                            disabled={isSaving}
                                                            btnText={`Add reading log`}
                                                            onClick={submitOrWarn}
                                                            loading={addReadingLogLoading}
                                                        />
                                                    </div>
                                                ) : null}

                                                {open && (
                                                    <ReadinglogModal
                                                        open={open}
                                                        setOpen={setOpen}
                                                        values={values}
                                                        readingLogData={readingLogData}
                                                        fullname={pupil?.pupil?.fullname}
                                                        topicId={topicId}
                                                        pupilId={pupilId}
                                                        handleClickOnEdit={(feedbackId) => {
                                                            setEditFeedbackModal({ open: true, feedbackId });
                                                        }}
                                                        setCollapse={setCollapse}
                                                        viewByParent={viewByParent ? true : false}
                                                        viewByTeacher={viewByTeacher ? true : false}
                                                    />
                                                )}

                                                {openSurveyModal && (
                                                    <SurveyModal
                                                        open={openSurveyModal}
                                                        setOpen={setOpenSurveyModal}
                                                        feedbackRedirectUrl={router?.asPath}
                                                        viewType={PARENT}
                                                    />
                                                )}
                                            </Form>
                                        );
                                    }}
                                </Formik>
                            </Paper>
                        </Collapse>
                        <br />
                        <br />
                    </div>
                ) : (
                    <br />
                )}

                {!showOnlySlider && (
                    <Grid container justifyContent={'space-between'} alignItems={'center'}>
                        <Heading2 text="History" />
                        <Grid display={'flex'} alignItems={'center'}>
                            {viewByTeacher ? (
                                <LWPButton
                                    size="small"
                                    btnText="View book history"
                                    variant="link"
                                    onClick={() => setBookHistoryModal({ open: true, name: pupil?.pupil?.fullname, pupilId })}
                                    startIcon={
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/View_book_history_black_icon.svg`}
                                            width={29}
                                        />
                                    }
                                />
                            ) : (
                                ''
                            )}
                        </Grid>
                    </Grid>
                )}

                {showOnlySlider && getReadingTopic?.getPupilReadingTopic && (
                    <Grid container justifyContent={'flex-end'}>
                        <LWPButton
                            startIcon="menu_book"
                            btnText="Go to reading log"
                            variant="secondary"
                            onClick={() => router?.push(`/pupil/${pupilId}/reading?topicId=${topicId}`)}
                        />
                    </Grid>
                )}

                <HistoryLog
                    readingLoading={readingLoading}
                    readingLogData={readingLogData}
                    setReadingLogData={setReadingLogData}
                    _fetchMore={_fetchMore}
                    pupilReadingLog={pupilReadingLog}
                    pupil={pupil}
                    collapse={collapse}
                    isCurrentWeek={isCurrentWeek}
                    viewByTeacher={viewByTeacher ? true : false}
                    onReadingLogUpdate={onReadingLogUpdate}
                />

                <PupilBookHistoryModal
                    open={bookHistoryModal?.open}
                    setOpen={setBookHistoryModal}
                    name={bookHistoryModal?.name}
                    pupilId={bookHistoryModal?.pupilId}
                />
                {/**
                 * this will only open when user clicked on edit button in reading log from ReadingLogModal
                 */}
                {editFeedbackModal.open && (
                    <UpdateReadingLog
                        setOpen={() => {
                            setEditFeedbackModal({ open: false, feedbackId: null });
                        }}
                        open={editFeedbackModal?.open}
                        selectedFeedbackId={editFeedbackModal?.feedbackId}
                        onReadingLogUpdate={onReadingLogUpdate}
                    />
                )}
            </div>
        </>
    );
};

ReadingLog.propTypes = {
    topic_id: PropTypes.string,
    pupil_id: PropTypes.string,
    getPupilFeedbackByPupilTopicId: PropTypes.object,
    pupilFeedback: PropTypes.arrayOf(PropTypes.object),
    showOnlySlider: PropTypes.bool,
    isCurrentWeek: PropTypes.bool
};

export default ReadingLog;
