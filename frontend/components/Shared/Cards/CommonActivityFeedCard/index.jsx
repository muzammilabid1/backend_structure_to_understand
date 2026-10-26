/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import { Card, CardContent, CardMedia, Divider, Grid, Rating, Tooltip } from '@mui/material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteFeedback, saveDemoActivityPhotoRating, savePupilFeedbackRating } from '../../../../graphQl/mutations';
import { getAllDemoFeedsForAdmin, getAllFeedsForAdmin } from '../../../../graphQl/queries';
import { ADMIN, MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, READING, SCRAPBOOK, TEACHER, TOPICACCESS } from '../../../../shared/Constant';
import {
    getCardBackgroundImageName,
    handleErrorSnackbar,
    refetchQueriesAfterUpdateOrDeleteFeedback,
    showDate,
    ThemeContext,
    viewByTeacherOrParent
} from '../../../../shared/Services/handler';
import CommonCheckBox from '../../CommonCheckBox';
import CommonPopOver from '../../CommonPopOver';
import ConfirmationModal from '../../Modals/ConfirmationModal';
import LoginOrSignUpModal from '../../Modals/LoginOrSignUpModal';
import UpdateReadingLog from '../../Modals/UpdateReadingLog';
import Heading1 from '../../Typography/Heading1';
import RadioButton from './../../../Parent/RadioButton';
import CommonRenderImage from './../../CommonRenderImage';
import Paragraph from './../../Typography/Paragraph';
import ActivityFeedReply from './ActivityFeedReply';
import FeedbackCommentCard from './FeedbackCommentCard';
import FeedbackEditHistoryLogs from './FeedbackEditHistoryLogs';
import FeedbackPupilsClasses from './FeedbackPupilsClasses';
import FeedbackTickedAndReplies from './FeedbackTickedAndReplies';
import ShowOnlyReplies from './ShowOnlyReplies';
import DialogWrapper from '../../DialogWrapper';
import InputField from '../../InputField/InputField';
import LWPButton from '../../Button/LWPButton';
import Heading2 from '../../Typography/Heading2';
import CommonLoading from '../../CommonLoading';

const updatePupilFeedbackImpactReportContext = gql`
    mutation updatePupilFeedbackImpactReportContext(
        $pupilFeedbackId: String!
        $include: Boolean!
        $contentType: SchoolImpactReportFeedbackContentType!
    ) {
        updatePupilFeedbackImpactReportContext(pupilFeedbackId: $pupilFeedbackId, include: $include, contentType: $contentType)
    }
`;

const getUserDetails = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            firstname
            lastname
            nameForChildren
            type
        }
    }
`;

const CommonActivityFeedCard = ({
    classTitle,
    classDate,
    children,
    description,
    activityContentImg,
    type,
    photoRating,
    customClass,
    activityIcon,
    isDemoActivity,
    showSideImg,
    isParent,
    isAdminFeed,
    deleteFeedbackMutation,
    deleteDemoFeedbackMutation,
    deleteFeedbackLoading,
    deleteDemoFeedbackLoading,
    showTickedAllFeedbackQuery = null,
    lastFeedId,
    expandAll,
    displayEditIcon,
    editActivity,
    viewActivity,
    feedback,
    isPupilReadingLog,
    setFeeds,
    user,
    searchfeedInput,
    getFirstTick,
    getFirstComment,
    getFirstStickers,
    onReadingLogUpdate,
    refetchQueries = [],
    handleClickedLoginOrSignUpModal = () => {},
    pupilId
}) => {
    const { callSnackbar, token, userId } = useContext(ThemeContext);
    const checkBoxLabel = 'Include in school impact report';
    const isAdmin = token?.userType === ADMIN;
    const [deleteFeedbackModal, setDeleteFeedbackModal] = useState({
        open: false,
        reasonToDelete: ''
    });
    const [photoChecked, setIncludePhotoChecked] = useState(feedback?.includePhotoInImpactReport);
    const [readingCommentChecked, setIncludeReadingCommentChecked] = useState(feedback?.includeReadingCommentInImpactReport);
    const [pupilCommentChecked, setIncludePupilCommentChecked] = useState(feedback?.includePupilCommentInImpactReport);
    const [parentCommentChecked, setIncludeParentCommentChecked] = useState(feedback?.includeParentCommentInImpactReport);
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const queryParams = useParams();
    const router = useRouter();
    const getYear = moment().year();

    if (!deleteFeedbackMutation || !deleteFeedbackLoading) {
        [deleteFeedbackMutation, { loading: deleteFeedbackLoading }] = useMutation(deleteFeedback);
    }

    const [saveFeedbackRatingMutation] = useMutation(savePupilFeedbackRating);
    const [saveDemoActivityPhotoRatingMutation] = useMutation(saveDemoActivityPhotoRating);
    const [updatePupilFeedbackImpactReportContextMutation, { loading: updatePupilFeedbackImpactReportContextLoading }] = useMutation(
        updatePupilFeedbackImpactReportContext
    );
    const [getLoggedInUserDetails, { loading: getLoggedInUserDetailsLoading, data: loggedInUserData, error: getLoggedInUserDetailsError }] =
        useLazyQuery(getUserDetails);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, getLoggedInUserDetailsError);
    }, [getLoggedInUserDetailsError]);

    const searchParams = useSearchParams();

    const ViewAsEntity = () => {
        const newPath = router?.asPath?.split('/')?.[1];

        switch (newPath) {
            case 'parent':

            case 'child':

            case 'topic':

            case 'activity':
                return PARENT;

            case 'school':

            case 'class':

            case 'pupil':
                return TEACHER;

            default:
                return ADMIN;
        }
    };

    const isUserAuthorized = () => {
        const isUserOwn = (feedback?.userId || feedback?.logCreatedBy?.id) === token?.sub;
        const isTeacherInSameSchool =
            token?.userType === TEACHER && feedback?.userType === TEACHER && feedback?.school?.id === token?.schoolId;

        return isUserOwn || isTeacherInSameSchool;
    };

    const isValidRoute = () => {
        const isParentRoute =
            (queryParams?.child_id || queryParams?.activity_id) && [TOPICACCESS, MAGICPARENT, PARENT, ADMIN].includes(token?.userType);

        const isTeacherRoute =
            (queryParams?.pupil_id ||
                queryParams?.class_id ||
                router?.pathname === '/school/[school_id]/log-reading' ||
                router?.pathname === '/feed/[user_id]' ||
                router?.pathname === '/school/[school_id]/feed') &&
            [TEACHER, ADMIN].includes(token?.userType);

        return isParentRoute || isTeacherRoute;
    };

    const isVisibleEditIcon =
        ((isAdmin && feedback?.userType === ViewAsEntity()) || (isUserAuthorized() && isValidRoute())) && displayEditIcon;

    const isParentOnHistoryPage =
        router?.pathname === '/child/[child_id]/history' &&
        [TOPICACCESS, MAGICPARENT, PARENT].includes(feedback?.userType) &&
        (feedback?.userId === token?.sub || isAdmin);

    /**
     * Conditions for displaying the delete icon:
     *
     * 1. **Admin Permissions:**
     *    - Admin can delete feedback from the admin activity feed (`isAdminFeed` is `true`).
     *    - Admin can delete feedbacks for a school when viewing as a school.
     *    - Admin can delete feedbacks for parents when viewing as a parent.
     *
     * 2. **Teacher Permissions:**
     *    - A teacher can delete TEACHER feedbacks from the entire school.
     *
     * 3. **Parent Permissions:**
     *    - A parent can delete their own feedbacks.
     *    - Parents cannot edit feedbacks from the history page, but they can delete their own feedbacks
     *      if they are on the history page (`isParentOnHistoryPage` is `true`).
     *
     * 4. **General Conditions:**
     *    - The user must have a `userTrustLevel` of `2` (indicating elevated permissions).
     *    - The feedback must not already be deleted (`feedback?.entryDeletedAt` should be `null`).
     */
    const isVisibleDeleteIcon = !feedback?.entryDeletedAt ? isAdminFeed || isVisibleEditIcon || isParentOnHistoryPage : false;
    const deletePupilFeedback = () => {
        if (isVisibleDeleteIcon) {
            const topicId = searchParams.get('topicId');
            const pupil_id = queryParams?.child_id || queryParams?.pupil_id || feedback?.pupil?.id || pupilId;
            /**
             * Some pages on the parent side, such as the history page and activity page,
             * require refetching queries after deleting feedback.
             *
             * - We have a prop called `refetchQueries`, which is an array of queries to refetch.
             * - If `refetchQueries` is provided, we use it.
             * - Otherwise, we use the default function to determine which queries need to be refetched.
             */
            const refetch_queries =
                refetchQueries?.length > 0 ? refetchQueries : refetchQueriesAfterUpdateOrDeleteFeedback(userId, pupil_id, topicId, router);

            deleteFeedbackMutation({
                variables: {
                    id: feedback?.id,
                    reasonToDelete: deleteFeedbackModal?.reasonToDelete?.trim() || null
                },
                refetchQueries: refetch_queries,
                awaitRefetchQueries: true
            })
                .then(({ data: deletedFeedbackData }) => {
                    /**
                     * If the user is on the admin activity feed page or school activity feed page,
                     * we need to update the `feeds` array to show the deleted feedback once the user is reloaded or come back to the page the deleted feedback was not shown.
                     */
                    const isOnActivityFeedPage =
                        isAdminFeed || router?.pathname === '/feed/[user_id]' || router?.pathname === '/school/[school_id]/feed';

                    if (isOnActivityFeedPage) {
                        setFeeds((prev) =>
                            prev?.map((feed) =>
                                feed?.id === feedback?.id
                                    ? {
                                          ...deletedFeedbackData?.deleteFeedback,
                                          id: feedback?.id,
                                          userType: null,
                                          includeInReadingTarget: null
                                      }
                                    : feed
                            )
                        );
                        if (feedback?.id === lastFeedId) {
                            window.location.reload();
                        }
                    } else {
                        /**
                         * For some pages, such as:
                         * - Pupil reading log page (PARENT/TEACHER)
                         * - Reading Week page
                         *
                         * We need to refetch queries after deleting and also update the state of feeds.
                         *
                         * For other pages, such as:
                         * - School reading log page
                         *
                         * We only need to update the state of feeds without refetching queries.
                         */

                        if (onReadingLogUpdate)
                            onReadingLogUpdate({
                                ...deletedFeedbackData?.deleteFeedback,
                                id: feedback?.id,
                                userType: null,
                                includeInReadingTarget: null
                            });
                    }

                    callSnackbar('Feedback deleted!', 'success');
                    setDeleteFeedbackModal({ open: !deleteFeedbackModal.open, reasonToDelete: '' });
                })
                .catch((err) => {
                    setDeleteFeedbackModal({ open: !deleteFeedbackModal.open, reasonToDelete: '' });
                    callSnackbar(err, 'error');
                });
        }

        if (isDemoActivity) {
            deleteDemoFeedbackMutation({
                variables: {
                    id: feedback?.id
                }
            })
                .then(() => {
                    setDeleteFeedbackModal({ open: !deleteFeedbackModal?.open, reasonToDelete: '' });

                    callSnackbar('Demo Feedback deleted!', 'success');
                    setFeeds((prev) => prev?.filter((feed) => feed.id !== feedback?.id));
                    if (feedback?.id === lastFeedId) {
                        window.location.reload();
                    }
                })
                .catch(({ ...err }) => {
                    setDeleteFeedbackModal({ open: !deleteFeedbackModal?.open, reasonToDelete: '' });
                    callSnackbar(err, 'error');
                });
        }
    };

    const [activeAccordion, setActiveAccordions] = useState({
        index: null,
        active: false
    });

    const [photoRatingValue, setPhotoRatingValue] = useState(0);

    useEffect(() => {
        setPhotoRatingValue(photoRating);
    }, [photoRating]);

    const radioButtonPhotoList = [
        { label: '5 Highly Recommend', value: 5 },
        { label: '4 e.g. photo of child + parent playing', value: 4 },
        { label: '3 e.g. photo of child playing', value: 3 },
        { label: '2 e.g. photo of child working', value: 2 },
        { label: '1 e.g. photo of work', value: 1 },
        { label: 'Report', value: -1 },
        { label: 'Don’t share', value: -2 }
    ];

    const _onPhotoRadioInputChange = (e) => {
        setPhotoRatingValue(+e.target.value);

        if (photoRating !== +e.target.value) {
            if (isDemoActivity) {
                saveDemoActivityPhotoRatingMutation({
                    variables: { id: feedback?.id, photoRating: +e.target.value },
                    refetchQueries: [{ query: getAllDemoFeedsForAdmin }],
                    awaitRefetchQueries: true
                })
                    .then(() => {
                        callSnackbar('Photo rating saved.', 'success');
                    })
                    .catch((error) => callSnackbar(error, 'error'));
            } else {
                saveFeedbackRatingMutation({
                    variables: { id: feedback?.id, rating: +e.target.value },
                    refetchQueries: [{ query: getAllFeedsForAdmin }],
                    awaitRefetchQueries: true
                })
                    .then(() => {
                        callSnackbar('Photo rating saved.', 'success');
                    })
                    .catch((error) => callSnackbar(error, 'error'));
            }
        }
    };

    const showDateWithDifferentyear = (date) => {
        return moment(date).year() === getYear ? showDate({ date }) : showDate({ date, year: true });
    };

    const showInfo = (res) => {
        return (
            <div className="date-popover">
                <CommonPopOver
                    hover
                    text={<p className="unwrap_text">For {showDateWithDifferentyear(feedback?.bookReadAt)}</p>}
                    icon={<InfoOutlinedIcon />}
                    childrenClass={'activity-feed-popover'}
                    className={res ? '' : 'date-margin'}>
                    <span style={{ maxWidth: '452px', minWidth: '300px', display: 'flex' }}>
                        <Paragraph>
                            This reading was done on {showDateWithDifferentyear(feedback?.bookReadAt)}, but not recorded on Learning with
                            Parents until {showDateWithDifferentyear(feedback?.logCreatedAt)}
                        </Paragraph>
                    </span>
                </CommonPopOver>
            </div>
        );
    };

    const feedbackHasDifferentReadingDate = (feedback) => {
        return showDate({ date: feedback?.logCreatedAt }) !== showDate({ date: feedback?.bookReadAt }) && feedback?.type === READING;
    };

    const shouldAccordionBeActive = (feedback, includeInReadingTarget = true) => {
        const hasNoContent =
            !feedback?.privateNote &&
            !feedback?.comment &&
            !feedback?.parentComment &&
            !feedback?.pupilComment &&
            !feedback?.audios?.length > 0 &&
            !feedback?.photos?.length > 0;

        const isEligibleForActiveState = ['/child/[child_id]/reading', '/child/[child_id]/history', '/pupil/[pupil_id]/reading']?.includes(
            router?.pathname
        )
            ? feedback?.userType === PARENT && includeInReadingTarget
                ? !feedback?.isOfSameDay
                : feedback?.includeInReadingTarget && !feedback?.isOfSameDay
            : true;

        return hasNoContent && isEligibleForActiveState;
    };

    const isAccordionExpanded = (feedback) => {
        if (feedback?.id == activeAccordion.index && token?.userTrustLevel == 2) {
            return activeAccordion.active;
        }

        if (!expandAll) {
            return false;
        }

        if (type === SCRAPBOOK) {
            return expandAll;
        }

        if (shouldAccordionBeActive(feedback)) {
            return false;
        }

        return true;
    };

    const handleCheckboxChange = async (contentType, checkedState, setState) => {
        const newChecked = !checkedState;

        setState(newChecked);

        try {
            await updatePupilFeedbackImpactReportContextMutation({
                variables: {
                    pupilFeedbackId: feedback?.id,
                    include: newChecked,
                    contentType
                },
                refetchQueries: [{ query: getAllFeedsForAdmin }],
                awaitRefetchQueries: true
            });
        } catch (error) {
            setState(checkedState);
            callSnackbar(error, 'error');
        }
    };

    const renderClassName = () => {
        if (feedback?.isFeedbackForMultipleClasses)
            return (
                <CommonPopOver className="multiple-classes" hover element={'Multiple classes'}>
                    <FeedbackPupilsClasses feedbackId={feedback?.id} />
                </CommonPopOver>
            );

        return (
            <u
                onClick={() =>
                    router?.push(
                        `/class/${
                            feedback?.activity ? feedback?.activity?.topic?.classTopic?.class?.id : feedback?.pupilTopic?.class?.id
                        }/readingweek`
                    )
                }
                className="class-name unwrap_text">
                {classTitle}
            </u>
        );
    };

    const renderLastEditedBy = () => {
        if (!feedback?.lastAction) return null;

        return (
            <div className="last-edited-container">
                <CommonPopOver
                    hover
                    transformOriginHorizontal="right"
                    childrenClass="last-edited-popover"
                    element={
                        <div className="last-edited">
                            <span>
                                <RestoreIcon fontSize="small" />
                                <Paragraph
                                    dataTest="feedback-last-edited"
                                    text={`Last edited on ${showDate({ date: feedback?.lastAction?.updatedAt })}`}
                                />
                            </span>
                        </div>
                    }>
                    <FeedbackEditHistoryLogs feedbackId={feedback?.id} />
                </CommonPopOver>
            </div>
        );
    };

    const isFeedbackCardRenderingForTeacher = viewByTeacherOrParent(router) === TEACHER;

    const showFeedbackContent =
        feedback?.parentComment ||
        feedback?.pupilComment ||
        feedback?.privateNote ||
        feedback?.isOfSameDay ||
        description ||
        activityContentImg ||
        (feedback?.audios?.length > 0 && feedback?.audios?.[0]?.filename) ||
        feedback?.comment ||
        (type === SCRAPBOOK && expandAll);

    const renderDeletedFeedback = (feedbackInfo) => {
        const feedbackDeletedBy = feedbackInfo?.logCreatedBy;

        const deletedBy =
            feedbackDeletedBy?.type === ADMIN
                ? 'Learning with Parents support'
                : feedbackDeletedBy?.nameForChildren ||
                  (feedbackDeletedBy?.firstname ? feedbackDeletedBy?.firstname + ' ' + feedbackDeletedBy?.lastname : '');

        const reason = feedbackInfo?.reasonToDelete;
        return (
            <div className="activity-deleted-feedback-container">
                <CommonPopOver
                    hover
                    transformOriginHorizontal="center"
                    className="activity-deleted-feedback"
                    childrenClass="activity-feedback-actions-info-popover"
                    element={<InfoOutlinedIcon color="#00303C" />}>
                    <Paragraph
                        text={`Deleted on ${showDate({ date: feedbackInfo?.entryDeletedAt, fullDateTime: true })}`}
                        dataTest="deleted-feedback-entry-info"
                    />
                </CommonPopOver>
                <Paragraph dataTest="deleted-feedback-entry">
                    An entry from {showDate({ date: feedbackInfo?.bookReadAt ?? feedbackInfo?.logCreatedAt })} has been deleted
                    {deletedBy ? (
                        <>
                            {' by '}
                            <b>{deletedBy}</b>
                        </>
                    ) : null}
                    {reason ? ` ("${reason}")` : ''}.
                </Paragraph>
            </div>
        );
    };

    const isShowPhotoRating =
        isAdminFeed || isDemoActivity; /** Show "Rate Photo" only for admins (on the admin activity feed) or for demo activities. */

    /**
     * Match the feed/history comment backgrounds to the parent "Up next" activity cards
     * (brighter `${type}-bg` colours + the lettered background pattern).
     * "Reading not counting towards target" entries already share the reading background colour
     * (only their top accent bar is greyed), so they use the reading background here too.
     */
    const backgroundType = type === 'READING-NOT-COUNTING-TOWARDS-TARGET' ? READING : type;

    return (
        <Grid item xs={12} classes={{ root: `grid-card ${type === SCRAPBOOK ? 'scrapbook-card' : ''}` }}>
            {feedback?.originalFeedbackId ? (
                renderDeletedFeedback(feedback)
            ) : (
                <Card classes={{ root: `activity-feed-container active-border ${type}-color` }}>
                    <Accordion
                        expanded={isAccordionExpanded(feedback)}
                        slotProps={{ transition: { unmountOnExit: true } }}
                        onClick={(event) => {
                            event.stopPropagation();
                            setActiveAccordions({
                                index: feedback?.id,
                                active: !activeAccordion.active
                            });
                            if (viewActivity) {
                                viewActivity();
                            }
                        }}
                        className="activity-feed-accordion">
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon className="expand-icon" data-test="expand-activity-feedback-icon" />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                            className="activity-feed-accordion-summary">
                            <div className="activity-feed-header-section" onClick={(event) => event.stopPropagation()}>
                                <div className="activity-feed-title-section">
                                    {activityIcon ? (
                                        <div className="activity-feed-title-icon">
                                            <span className={`material-icons ${customClass}`}>{activityIcon}</span>
                                        </div>
                                    ) : showSideImg ? (
                                        <div className="activity-feed-title-icon">
                                            <>
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/tick_all_on_feedback.svg`}
                                                    className={`is_feedback_tick ${feedback?.tickedBy ? '' : 'hide_tick_on_feed'}`}
                                                />

                                                <span
                                                    className={`material-icons ${customClass} ${
                                                        feedback?.userType === TEACHER || feedback?.userType === ADMIN
                                                            ? 'school-icon'
                                                            : 'home-icon'
                                                    }`}>
                                                    {feedback?.pupilCount > 1
                                                        ? 'groups'
                                                        : feedback?.userType === TEACHER || feedback?.userType === ADMIN
                                                          ? 'school'
                                                          : [TOPICACCESS, MAGICPARENT, PARENT].includes(feedback?.userType)
                                                            ? 'home'
                                                            : ''}
                                                </span>
                                            </>
                                        </div>
                                    ) : null}
                                    <CardContent classes={{ root: 'activity-feed-content' }}>
                                        {children}

                                        {type === SCRAPBOOK && feedback?.scrapbookPrompt && (
                                            <Paragraph customClass="activity-feed-paragraph">
                                                <span>
                                                    Suggestion: <b>“{feedback.scrapbookPrompt}”</b>
                                                </span>
                                            </Paragraph>
                                        )}

                                        {classTitle ? (
                                            feedback?.sharingAllowed != null && !isParent ? (
                                                <Paragraph customClass="activity-feed-paragraph">
                                                    {feedbackHasDifferentReadingDate(feedback) ? (
                                                        <span className="date-hover">
                                                            {renderClassName()} - {showInfo()}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {renderClassName()} - {showDateWithDifferentyear(classDate)}
                                                        </>
                                                    )}

                                                    {feedback?.userType === PARENT && (
                                                        <>
                                                            -
                                                            <span className={feedback?.sharingAllowed ? 'permitted' : 'notPermitted'}>
                                                                {feedback?.sharingAllowed ? 'Sharing permitted' : 'Sharing not permitted'}
                                                            </span>
                                                        </>
                                                    )}
                                                </Paragraph>
                                            ) : (
                                                <Paragraph customClass="activity-feed-paragraph">
                                                    {feedbackHasDifferentReadingDate(feedback) ? (
                                                        <span className="date-hover">
                                                            {renderClassName()}- {showInfo()}
                                                        </span>
                                                    ) : (
                                                        <span className="activity-feed-dateParagraph">
                                                            <span className="unwrap_text">
                                                                {renderClassName()}- {showDateWithDifferentyear(classDate)}
                                                            </span>
                                                        </span>
                                                    )}
                                                </Paragraph>
                                            )
                                        ) : feedback?.sharingAllowed != null && !isParent ? (
                                            <Paragraph customClass="activity-feed-paragraph">
                                                <>
                                                    {showDateWithDifferentyear(classDate)} -{' '}
                                                    <span
                                                        className={`${feedback?.sharingAllowed ? 'permitted' : 'notPermitted'} unwrap_text`}>
                                                        {feedback?.sharingAllowed ? 'Sharing permitted' : 'Sharing not permitted'}
                                                    </span>
                                                </>
                                            </Paragraph>
                                        ) : (
                                            <Paragraph customClass="activity-feed-paragraph">
                                                {feedbackHasDifferentReadingDate(feedback) ? (
                                                    <span className="date-hover">{showInfo(true)}</span>
                                                ) : (
                                                    <span className="unwrap_text">{showDateWithDifferentyear(classDate)}</span>
                                                )}
                                            </Paragraph>
                                        )}

                                        {feedback?.activity?.rating > 0 && isAdmin && router?.pathname === '/admin/all-feeds' && (
                                            <Rating value={feedback?.activity?.rating} readOnly />
                                        )}
                                    </CardContent>
                                </div>
                                <Grid display={'flex'} gap={1} alignItems={'center'} className={'activity-feed-edit-container'}>
                                    {isVisibleEditIcon && (
                                        <Grid>
                                            <Tooltip title={'Edit this record'}>
                                                <span
                                                    onClick={() => {
                                                        if (editActivity) {
                                                            editActivity(feedback?.id, () => setEditModal(true));
                                                        } else {
                                                            setEditModal(true);
                                                        }
                                                    }}
                                                    className={`material-icons edit`}
                                                    data-test="edit-activity-feedback-icon">
                                                    edit
                                                </span>
                                            </Tooltip>
                                        </Grid>
                                    )}

                                    {(isVisibleDeleteIcon || isDemoActivity) && (
                                        <Grid>
                                            <Tooltip title={'Delete this record'}>
                                                <span
                                                    onClick={() => {
                                                        if (token?.userTrustLevel < 2) setIsSignInModalOpen(true);
                                                        else {
                                                            if (isFeedbackCardRenderingForTeacher)
                                                                getLoggedInUserDetails({ variables: { id: token?.sub } });

                                                            setDeleteFeedbackModal({ open: true, reasonToDelete: '' });
                                                        }
                                                    }}
                                                    className={`material-icons`}
                                                    data-test="delete-activity-feedback-icon">
                                                    delete
                                                </span>
                                            </Tooltip>
                                        </Grid>
                                    )}
                                </Grid>
                            </div>
                        </AccordionSummary>
                        <AccordionDetails
                            className="activity-feed-accordion-details"
                            onClick={(event) => {
                                event.stopPropagation();
                            }}>
                            <CardMedia
                                classes={{
                                    root: `${backgroundType}-bg activity-feed-comment-bg`
                                }}
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${getCardBackgroundImageName(
                                    backgroundType
                                )}.png`}>
                                <CardContent
                                    classes={{
                                        root: 'activity-feed-comment-section'
                                    }}>
                                    {showFeedbackContent ? (
                                        token?.userTrustLevel < 2 && feedback?.userType === PARENT ? (
                                            <ShowOnlyReplies feedback={feedback} />
                                        ) : (
                                            <>
                                                {activityContentImg && (
                                                    <Grid spacing={isShowPhotoRating ? 6 : 0} container>
                                                        <Grid item md={isShowPhotoRating ? 6 : null} lg={isShowPhotoRating ? 6 : null}>
                                                            <FeedbackCommentCard className="activity-feed-card-img">
                                                                <CommonRenderImage
                                                                    src={activityContentImg}
                                                                    className="activity-img"
                                                                    isSharingAllowed={feedback?.sharingAllowed}
                                                                />
                                                                {isAdminFeed ? (
                                                                    <>
                                                                        <br />
                                                                        <CommonCheckBox
                                                                            onClick={() =>
                                                                                handleCheckboxChange(
                                                                                    SchoolImpactReportFeedbackContentType.PHOTO,
                                                                                    photoChecked,
                                                                                    setIncludePhotoChecked
                                                                                )
                                                                            }
                                                                            name="include-photo-checkbox"
                                                                            checked={photoChecked}
                                                                            value={photoChecked}
                                                                            label={checkBoxLabel}
                                                                            disabled={updatePupilFeedbackImpactReportContextLoading}
                                                                        />
                                                                    </>
                                                                ) : null}
                                                            </FeedbackCommentCard>
                                                        </Grid>
                                                        {isShowPhotoRating && (
                                                            <Grid item md={6} lg={6}>
                                                                <div className="activity-radio">
                                                                    <Paragraph customClass="radio-para" text="Rate Photo" />
                                                                    <RadioButton
                                                                        radioButtonList={radioButtonPhotoList}
                                                                        radioValue={photoRatingValue}
                                                                        onChange={_onPhotoRadioInputChange}
                                                                    />
                                                                </div>
                                                            </Grid>
                                                        )}
                                                    </Grid>
                                                )}

                                                {feedback?.parentComment ? (
                                                    <FeedbackCommentCard>
                                                        <Heading1 text="Family comment" />
                                                        <Paragraph dataTest="feedback-family-comment" text={feedback?.parentComment} />
                                                        {isAdminFeed ? (
                                                            <>
                                                                <br />
                                                                <CommonCheckBox
                                                                    onClick={() =>
                                                                        handleCheckboxChange(
                                                                            SchoolImpactReportFeedbackContentType.PARENT_COMMENT,
                                                                            parentCommentChecked,
                                                                            setIncludeParentCommentChecked
                                                                        )
                                                                    }
                                                                    checked={parentCommentChecked}
                                                                    name="include-parent-comment-checkbox"
                                                                    value={parentCommentChecked}
                                                                    label={checkBoxLabel}
                                                                    disabled={updatePupilFeedbackImpactReportContextLoading}
                                                                />
                                                            </>
                                                        ) : null}
                                                    </FeedbackCommentCard>
                                                ) : (
                                                    ''
                                                )}

                                                {feedback?.privateNote ? (
                                                    <FeedbackCommentCard>
                                                        <Grid display={'flex'} alignItems={'center'} gap={1} item>
                                                            <Heading1 text="Internal note for school" />
                                                            <CommonPopOver hover element={<InfoOutlinedIcon />}>
                                                                <div className="note-info-icon-message">
                                                                    This is not shared with parents and is only visible to school staff
                                                                </div>
                                                            </CommonPopOver>
                                                        </Grid>
                                                        <Paragraph text={feedback?.privateNote} />
                                                    </FeedbackCommentCard>
                                                ) : (
                                                    ''
                                                )}

                                                {feedback?.comment ? (
                                                    <FeedbackCommentCard>
                                                        <Heading1 text="Comment" />
                                                        <Paragraph
                                                            dataTest={
                                                                type === SCRAPBOOK
                                                                    ? 'feedback-scrapbook-comment'
                                                                    : 'feedback-reading-comment'
                                                            }
                                                            text={feedback?.comment}
                                                        />
                                                        {isAdminFeed ? (
                                                            <>
                                                                <br />
                                                                <CommonCheckBox
                                                                    onClick={() =>
                                                                        handleCheckboxChange(
                                                                            SchoolImpactReportFeedbackContentType.READING_COMMENT,
                                                                            readingCommentChecked,
                                                                            setIncludeReadingCommentChecked
                                                                        )
                                                                    }
                                                                    checked={readingCommentChecked}
                                                                    value={readingCommentChecked}
                                                                    name="include-reading-comment-checkbox"
                                                                    label={checkBoxLabel}
                                                                    disabled={updatePupilFeedbackImpactReportContextLoading}
                                                                />
                                                            </>
                                                        ) : null}
                                                    </FeedbackCommentCard>
                                                ) : (
                                                    ''
                                                )}

                                                {feedback?.pupilComment ? (
                                                    <FeedbackCommentCard>
                                                        <Heading1 text="Child comment" />
                                                        <Paragraph dataTest="feedback-pupil-comment" text={feedback?.pupilComment} />
                                                        {isAdminFeed ? (
                                                            <>
                                                                <br />
                                                                <CommonCheckBox
                                                                    onClick={() =>
                                                                        handleCheckboxChange(
                                                                            SchoolImpactReportFeedbackContentType.PUPIL_COMMENT,
                                                                            pupilCommentChecked,
                                                                            setIncludePupilCommentChecked
                                                                        )
                                                                    }
                                                                    checked={pupilCommentChecked}
                                                                    name="include-pupil-comment-checkbox"
                                                                    value={pupilCommentChecked}
                                                                    label={checkBoxLabel}
                                                                    disabled={updatePupilFeedbackImpactReportContextLoading}
                                                                />
                                                            </>
                                                        ) : null}
                                                    </FeedbackCommentCard>
                                                ) : (
                                                    ''
                                                )}

                                                {description ? description : ''}

                                                {feedback?.isOfSameDay && isPupilReadingLog && (
                                                    <div className="reading-target">
                                                        <span className="material-icons">info_outline</span>
                                                        {feedback?.showText === 'FIRST_ENTRY' ? (
                                                            <Paragraph>
                                                                This reading log entry is not counted towards your weekly target. Only the
                                                                first entry on each day is counted.
                                                            </Paragraph>
                                                        ) : (
                                                            <Paragraph>
                                                                This reading log entry is not counted towards your weekly target.
                                                            </Paragraph>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )
                                    ) : (
                                        <div className="activity-feed-comment-section">
                                            <div className="reading-target">
                                                <span className="material-icons">info_outline</span>
                                                <Paragraph> no comments, photos or audio.</Paragraph>
                                            </div>
                                        </div>
                                    )}

                                    {renderLastEditedBy()}

                                    {(feedback?.tickedBy || feedback?.feedbackReplies?.length > 0) && token?.userTrustLevel === 2 && (
                                        <>
                                            <Divider
                                                sx={{
                                                    backgroundColor: '#FFF',
                                                    height: '2px',
                                                    marginBottom: '32px',
                                                    borderColor: '#FFF'
                                                }}
                                            />
                                            <FeedbackTickedAndReplies feedback={feedback} user={user} setFeeds={setFeeds} />
                                        </>
                                    )}

                                    {isAdminFeed ? (
                                        <Link passHref href={`/feedback/${feedback?.id}`}>
                                            <span className="material-icons" style={{ position: 'absolute', bottom: 30, right: 24 }}>
                                                link
                                            </span>
                                        </Link>
                                    ) : (
                                        ''
                                    )}
                                </CardContent>
                            </CardMedia>

                            <ActivityFeedReply
                                feedback={feedback}
                                user={user}
                                getFirstTick={getFirstTick}
                                searchfeedInput={searchfeedInput}
                                setFeeds={setFeeds}
                                getFirstStickers={getFirstStickers}
                                getFirstComment={getFirstComment}
                                showTickedAllFeedbackQuery={showTickedAllFeedbackQuery}
                            />
                        </AccordionDetails>
                    </Accordion>
                </Card>
            )}

            {editModal && (
                <UpdateReadingLog
                    setOpen={() => {
                        setEditModal(false);
                    }}
                    open={editModal}
                    selectedFeedbackId={feedback?.id}
                    onReadingLogUpdate={onReadingLogUpdate}
                />
            )}

            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        token?.status === 'ACTIVE' ? 'log in to your account' : 'set up a user account'
                    } to delete this entry`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={handleClickedLoginOrSignUpModal}
                />
            )}

            {deleteFeedbackModal?.open && (
                <DialogWrapper
                    open={deleteFeedbackModal?.open}
                    onClose={() => setDeleteFeedbackModal({ open: false, reasonToDelete: '' })}
                    contentWidth={isFeedbackCardRenderingForTeacher ? '864px' : '650px'}
                    className="delete-feedback-modal">
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Heading2 text="Delete this entry?" />
                        </Grid>
                        {isFeedbackCardRenderingForTeacher ? (
                            getLoggedInUserDetailsLoading ? (
                                <Grid item xs={12}>
                                    <CommonLoading />
                                </Grid>
                            ) : (
                                <>
                                    <Grid item xs={12}>
                                        <Paragraph text={`Are you sure you wish to delete this entry? This action cannot be undone.`} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <InputField
                                            name="reasonForDelete"
                                            label="Reason (optional)"
                                            value={deleteFeedbackModal?.reasonToDelete}
                                            onChange={(e) =>
                                                setDeleteFeedbackModal({ ...deleteFeedbackModal, reasonToDelete: e.target.value })
                                            }
                                            type="text"
                                            multiline
                                            rows={3}
                                            md={12}
                                            lg={12}
                                            disabled={false}
                                            wordCount={deleteFeedbackModal?.reasonToDelete?.length || 0}
                                            inputProps={{
                                                maxlength: 150
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Paragraph text={'Instead of the entry, the following will appear in the feed '} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        {/* Modifying the feedback object to display how it appears when the teacher deletes feedback */}
                                        {renderDeletedFeedback({
                                            ...feedback,
                                            logCreatedBy: {
                                                firstname: token?.firstName,
                                                lastname: token?.lastName,
                                                ...(loggedInUserData?.getUser || {})
                                            },
                                            reasonToDelete: deleteFeedbackModal?.reasonToDelete,
                                            entryDeletedAt: new Date()
                                        })}
                                    </Grid>
                                </>
                            )
                        ) : (
                            <Grid item xs={12}>
                                <Paragraph
                                    text={`Are you sure you wish to delete this entry? This action cannot be undone. The feed will show that you have deleted an entry for ${feedback?.pupilCount > 1 ? 'these pupils' : 'this pupil'}, but the details of the entry will be removed.`}
                                />
                            </Grid>
                        )}

                        <Grid item xs={12} className="delete-feedback-modal-action">
                            <LWPButton
                                btnText="Cancel"
                                variant="text"
                                color="inherit"
                                disabled={deleteFeedbackLoading || deleteDemoFeedbackLoading}
                                onClick={() => setDeleteFeedbackModal({ open: false, reasonToDelete: '' })}
                            />
                            <LWPButton
                                btnText="Delete"
                                customClass="delete-feedback-modal-delete-btn"
                                dataTest="delete-feedback-confirmation-btn"
                                loading={deleteFeedbackLoading || deleteDemoFeedbackLoading}
                                onClick={deletePupilFeedback}
                            />
                        </Grid>
                    </Grid>
                </DialogWrapper>
            )}
        </Grid>
    );
};

CommonActivityFeedCard.propTypes = {
    classTitle: PropTypes.string,
    classDate: PropTypes.string,
    customClass: PropTypes.string,
    children: PropTypes.element,
    activityContentImg: PropTypes.string,
    description: PropTypes.element,
    type: PropTypes.string,
    previousDataLength: PropTypes.number,
    lastFeedId: PropTypes.number,
    photoRating: PropTypes.number,
    thumb_up: PropTypes.bool,
    isAdminFeed: PropTypes.bool,
    expandAll: PropTypes.bool,
    isParent: PropTypes.bool,
    displayEditIcon: PropTypes.bool,
    activityIcon: PropTypes.string,
    isDemoActivity: PropTypes.bool,
    showSideImg: PropTypes.bool,
    deleteFeedbackMutation: PropTypes.func,
    editActivity: PropTypes.func,
    viewActivity: PropTypes.func,
    deleteDemoFeedbackMutation: PropTypes.func,
    deleteFeedbackLoading: PropTypes.bool,
    deleteDemoFeedbackLoading: PropTypes.bool,
    feedback: PropTypes.object.isRequired,
    isPupilReadingLog: PropTypes.bool,
    setFeeds: PropTypes.func,
    searchfeedInput: PropTypes.func,
    user: PropTypes.object,
    getFirstTick: PropTypes.object,
    getFirstComment: PropTypes.object,
    getFirstStickers: PropTypes.object,
    showTickedAllFeedbackQuery: PropTypes.func,
    onReadingLogUpdate: PropTypes.func,
    refetchQueries: PropTypes.array,
    handleClickedLoginOrSignUpModal: PropTypes.func,
    pupilId: PropTypes.string,
    softDeleteDemoFeedbackLoading: PropTypes.bool
};

CommonActivityFeedCard.defaultProps = {
    classDate: 'Tuesday 28 July',
    thumb_up: true,
    feedback: {},
    isDemoActivity: false,
    isParent: false,
    isAdminFeed: false,
    showSideImg: true,
    displayEditIcon: false,
    expandAll: true,
    isPupilReadingLog: false,
    children: (
        <p className="mb2">
            <strong>Miriam Cooper</strong> did the <strong>Counting</strong> activity in the <strong>Multiples of ten</strong> topic
        </p>
    ),
    refetchQueries: []
};

export default CommonActivityFeedCard;
