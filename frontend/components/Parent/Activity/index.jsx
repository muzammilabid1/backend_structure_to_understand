import { useApolloClient, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import LockIcon from '@mui/icons-material/Lock';
import { makeStyles } from '@mui/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import gql from 'graphql-tag';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useState } from 'react';

import {
    addPupilMathscot,
    increaseAccessCount,
    logout,
    mergeMathscotItems,
    reInviteParent,
    savePupilActivityRating
} from '../../../graphQl/mutations';
import { clearCookiesOnly, getCookie } from '../../../lib/manageCookies';
import { ADMIN, MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, REFRESH_TOKEN_COOKIE, TEACHER, TOPICACCESS } from '../../../shared/Constant';
import { getActivityComponentName, getTopicType, ThemeContext } from '../../../shared/Services/handler';
import { filterStepsForViewer } from '../../../shared/Services/stepVisibility';
import ChangeDress from '../../PagesContent/ChangeDress';
import Breadcrumb from '../../Parent/Breadcrumb';
import RatingCard from '../../Parent/Cards/RatingCard';
import MathscotSelection from '../../Parent/MathscotSelection';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import CommonActivityPreview from '../../Shared/CommonActivityPreview';
import CommonLoading from '../../Shared/CommonLoading';
import CommonStatus from '../../Shared/CommonStatus';
import DialogWrapper from '../../Shared/DialogWrapper';
import MathScotWithBubbleText from '../../Shared/MathScotWithBubbleText';
import AddPupilFeedback from '../../Shared/Modals/AddPupilFeedback';
import LoginOrSignUpModal from '../../Shared/Modals/LoginOrSignUpModal';
import RenderStaticActivies from '../../Shared/StaticActivityViews/RenderStaticActivies';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';
import ActivityFeedbackCard from './ActivityFeedbackCard';
import { Alert, Grid, useMediaQuery, useTheme } from '@mui/material';

// Queries

const getPupilActivity = (trusted) => {
    return gql`
        query getPupilActivity($id: String!) {
            getPupilActivity(id: $id) {
                id
                rating
                mathscotActivityItemIds
                context
                isInPreviousAcademicYear
                pupil {
                    id
                    fullname
                    firstname
                    lastname
                    mathscotUrl {
                        thumbnailImage
                    }
                    getSchoolSponsorProgram {
                        characterUrl
                    }
                    school {
                        id
                        parentFeedbackTickFeatureEnabledAt
                        organisations
                        privacyPolicy
                        # Ids only. Used to match against a step's visibilityRules below.
                        tagIds
                        curentPeriod {
                            index
                        }
                    }
                    currentMathscot {
                        character
                        colour
                    }
                }
                topic {
                    id
                    period {
                        index
                    }
                    setByTeacherMedia {
                        id
                        filename
                        parentMessage
                        step {
                            id
                        }
                    }
                }
                feedbacks {
                    id
                    pupilComment
                    parentComment
                    userName
                    userId
                    userType
                    logCreatedAt
                    logCreatedBy {
                        id
                        firstname
                        lastname
                        ${trusted ? 'type' : ''}
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
                    sharingAllowed
                    lastAction {
                        updatedAt
                    }
                    originalFeedbackId
                    entryDeletedAt
                }
                activity {
                    id
                    name
                    starValue
                    activityType
                    hidePhotoUpload
                    welcomeMessage
                    rationaleModal {
                        id
                    }
                    topic {
                        id
                        teacherTopicName
                        parentTopicName
                        isReading
                        isReadyTeddyTopic
                    }
                    details
                    steps {
                        ... on StaticLwpActivityLegacy {
                            legacySteps {
                                id
                                order
                                stepType
                                text
                                imageUrl
                                downloadUrl
                                downloadName
                                linkUrl
                                linkName
                                properties
                                fontType
                                fontSize
                                textCarouselData
                                carouselData {
                                    textEditorState
                                    labelEditorState
                                    type
                                    imageUrl
                                    alt
                                    fileName
                                    fileIdentifier
                                }
                                accordionData
                                checkListTextData
                                tableData
                                selectedModalId
                                fileName
                                editorState
                                timerData
                                btnType
                                imageCarouselData
                                checklistImageData
                                includeSeconds
                                clickableAlphabetData
                                dimensions
                                audioUrl
                                tabsData
                                editAsHtml
                                setByTeacherData {
                                    heading
                                    subHeading
                                }
                                visibilityRules {
                                    hideForSchoolTagIds
                                }
                            }
                        }
                    }
                }
            }
        }
    `;
};

const getUserForViewActivity = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            type
            userStatus
            email
            phoneNumber
            sharingAllowed
            showInterstitial {
                id
                optedOut
            }
        }
    }
`;

const getMathscotItemForViewActivity = gql`
    query getMathscotItem($itemName: String!) {
        getMathscotItem(itemName: $itemName) {
            id
        }
    }
`;

// Component

const useStyles = makeStyles({
    container: {
        maxWidth: '470px',
        margin: 'auto'
    },
    lockedMathscot: {
        display: 'flex',
        justifyContent: 'center',
        userSelect: 'none'
    },
    lockedMathscotImage: {
        ['@media (max-width:523px)']: {
            width: '100%'
        }
    },
    linkCursor: {
        cursor: 'pointer'
    }
});
const ViewActivity = () => {
    const router = useRouter();
    const classes = useStyles();
    const client = useApolloClient();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const { setHeaderTitle, setParentPath, callSnackbar, setChildDetails, token, setToken, userId } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [open_1, setOpen_1] = useState(false);
    const [selectedMathscot, setSelectedMathscot] = useState(null);
    const [updateValues, setUpdateValues] = useState(null);
    const [order, setOrder] = useState(0);
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [openAddFeedbackModal, setOpenAddFeedbackModal] = useState(false);
    const [pupilMathscotData, setPupilMathscotData] = useState({
        image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/question-mark-new.png`,
        character: null,
        colour: null,
        shirt: null
    });
    const toggle = () => setOpen(!open);
    const toggle_1 = () => setOpen_1(!open_1);

    const getPupilActivityForViewActivity = getPupilActivity(token?.userTrustLevel >= 2);

    const [increaseAccessCountMutation] = useMutation(increaseAccessCount);
    const [savePupilActivityRatingMutation] = useMutation(savePupilActivityRating);
    const [addPupilMathscotMutation, { loading: addPupilMathscotLoading }] = useMutation(addPupilMathscot, {
        refetchQueries: [{ query: getPupilActivityForViewActivity, variables: { id: router?.query?.activity_id } }],
        awaitRefetchQueries: true
    });
    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const {
        loading,
        error,
        data: activity
    } = useQuery(getPupilActivityForViewActivity, {
        variables: { id: router?.query?.activity_id }
    });

    const pupilActivity = activity?.getPupilActivity;
    const pupilTopic = pupilActivity?.topic;

    const sbtMediaByStepId = {};

    for (const { filename, parentMessage, step } of pupilTopic?.setByTeacherMedia ?? []) {
        if (filename && step?.id && !sbtMediaByStepId[step.id]) {
            sbtMediaByStepId[step.id] = { filename, parentMessage: parentMessage ?? null };
        }
    }

    const [mergeMathscotItemsMutation, { loading: mergeMathscotItemsLoader }] = useMutation(mergeMathscotItems);

    const [getMathscotItemQuery, { error: mathscotItemError, data: mathscotItem }] = useLazyQuery(getMathscotItemForViewActivity);

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForViewActivity, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        if (activity) {
            setHeaderTitle(activity?.getPupilActivity?.activity?.name);
            setParentPath(`/topic/${activity?.getPupilActivity?.topic?.id}`);
        }
    }, [activity]);

    useEffect(
        () =>
            activity &&
            setChildDetails({ id: activity?.getPupilActivity?.pupil?.id, firstname: activity?.getPupilActivity?.pupil?.firstname }),
        [activity]
    );

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        mathscotItemError?.message && callSnackbar(mathscotItemError, 'error');
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [error, mathscotItemError, getUserError]);

    const isAllowed = () => user?.getUser?.type === PARENT || user?.getUser?.type === ADMIN;

    useEffect(() => {
        if (user?.getUser?.type === PARENT) {
            increaseAccessCountMutation({ variables: { pupilActivityId: router?.query?.activity_id } });
        }
    }, []);

    useEffect(() => {
        if (pupilMathscotData.shirt) {
            getMathscotItemQuery({ variables: { itemName: pupilMathscotData?.shirt } });
        }
    }, [pupilMathscotData.shirt]);

    const saveStars = (starValue) => {
        if (starValue && isAllowed()) {
            savePupilActivityRatingMutation({ variables: { id: router?.query?.activity_id, rating: starValue } })
                /*DebugCallSnackbar .then(() => callSnackbar('Rating saved', 'success'))*/
                .catch((err) => callSnackbar(err, 'error'));
        }
    };

    const onSavePupilMathscot = () => {
        addPupilMathscotMutation({
            variables: {
                input: {
                    pupilId: activity?.getPupilActivity?.pupil?.id,
                    itemIds: mathscotItem?.['getMathscotItem']?.id ? [mathscotItem?.['getMathscotItem']?.id] : [],
                    character: pupilMathscotData.character,
                    colour: pupilMathscotData.colour,
                    periodIndex: activity?.getPupilActivity?.topic?.period?.index
                }
            }
        })
            .then(() => {
                callSnackbar('Mathscot created successfully!', 'success');
                toggle_1();
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
                toggle_1();
            });
    };

    const breadcrumbLists = [
        {
            route: [ADMIN, PARENT, MAGICPARENT].includes(user?.getUser?.type)
                ? `/parent/${user?.getUser?.id}`
                : `/child/${activity?.getPupilActivity?.pupil?.id}`,
            homeIcon: true
        },
        {
            label: activity?.getPupilActivity?.pupil?.fullname,
            route: `/child/${activity?.getPupilActivity?.pupil?.id}`
        },
        {
            label:
                activity?.getPupilActivity?.activity?.topic?.parentTopicName?.length > 0
                    ? activity?.getPupilActivity?.activity?.topic?.parentTopicName
                    : activity?.getPupilActivity?.activity?.topic?.teacherTopicName,
            route: `/topic/${activity?.getPupilActivity?.topic?.id}`
        },
        {
            label: activity?.getPupilActivity?.activity?.name
        }
    ];

    const mathScotMutation = () => {
        if (selectedMathscot) {
            mergeMathscotItemsMutation({
                variables: {
                    input: {
                        pupilId: activity?.getPupilActivity?.pupil?.id,
                        ids: selectedMathscot.mergedUrl.itemIds,
                        character: activity?.getPupilActivity?.pupil?.currentMathscot?.character ?? 'MONKEY',
                        colour: activity?.getPupilActivity?.pupil?.currentMathscot?.colour ?? 'NATURAL'
                    },
                    logInput: {
                        activityId: activity?.getPupilActivity?.id,
                        staticActivityId: activity?.getPupilActivity?.activity?.id,
                        order
                    },
                    periodIndex: activity?.getPupilActivity?.topic?.period?.index
                }
            })
                .then(() => {
                    callSnackbar('Mathscot saved', 'success');
                    routeToTopic();
                })
                .catch(({ ...err }) => {
                    callSnackbar(err, 'error');
                });
        } else {
            routeToTopic();
        }
    };

    const routeToTopic = () => {
        const userDetails = user?.getUser;
        if (
            userDetails?.showInterstitial?.id &&
            !userDetails?.showInterstitial?.optedOut &&
            [TOPICACCESS, MAGICPARENT, PARENT].includes(user?.getUser?.type)
        ) {
            router?.push({ pathname: `/topic/${pupilTopic?.id}`, query: { optedOut: true } });
        } else {
            router?.push(`/topic/${pupilTopic?.id}`);
        }
    };

    const editButtonHandler = (feedbackId) => {
        if (token?.userTrustLevel < 2) {
            setIsSignInModalOpen(true);

            return;
        }

        const feedback = (activity?.getPupilActivity.feedbacks || []).find((feedback) => feedback?.id === feedbackId);

        if (feedback) {
            setUpdateValues(feedback);
            setOpenAddFeedbackModal(true);
        }
    };

    const collapseButtonHandler = () => {
        if (token?.userTrustLevel < 2) {
            setIsSignInModalOpen(true);

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
        router?.replace(`/activity/${activity?.getPupilActivity?.id}`);
    };

    const handleInvitedUser = (userId, source_type, source) => {
        reInviteParentMutation({ variables: { parentId: userId } });
        router?.replace({
            pathname: '/check-your-email-or-phone/invited-user?.getUser',
            query: {
                source,
                source_type
            }
        });
    };

    const handleClickedLoginOrSignUpModal = () => {
        if (user?.getUser?.userStatus === 'ACTIVE') {
            handleActiveUser();
        } else {
            handleInvitedUser(
                user?.getUser?.id,
                user?.getUser?.email ? 'email' : 'number',
                user?.getUser?.email || user?.getUser?.phoneNumber
            );
        }
    };

    // A "Ready Teddy" topic prevents the creation of a mathscot
    const isReadyTeddyTopic = activity?.getPupilActivity?.activity?.topic?.isReadyTeddyTopic;

    if (loading || getUserLoading) return <CommonLoading />;

    return (
        <div className="view-activity-container">
            <Breadcrumb breadcrumbLists={breadcrumbLists} customClass="hide-on-mobile" />
            {activity?.getPupilActivity?.isInPreviousAcademicYear ? (
                <Grid item style={{ paddingTop: isDesktop ? '32px' : '0px' }}>
                    <Alert severity={'warning'} icon={<HelpOutlineIcon />}>
                        {`You’re viewing content from a previous academic year. Your teacher may not see any entries you add here.`}
                    </Alert>
                </Grid>
            ) : null}
            <MathScotWithBubbleText
                image={
                    activity?.getPupilActivity?.pupil?.getSchoolSponsorProgram?.characterUrl ||
                    `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-child.png`
                }
                bubbleText={activity?.getPupilActivity?.activity?.welcomeMessage}
            />
            {activity?.getPupilActivity?.activity?.activityType === 'STATIC' ? (
                <RenderStaticActivies
                    activityComponentName={getActivityComponentName(activity?.getPupilActivity?.activity?.details)}
                    type={getTopicType(activity?.getPupilActivity?.activity?.topic?.isReading)}
                    context={activity?.getPupilActivity?.context}
                    pupilName={activity?.getPupilActivity?.pupil?.fullname}
                />
            ) : (
                <CommonActivityPreview
                    activity={{
                        ...activity?.getPupilActivity?.activity,
                        steps: {
                            ...activity?.getPupilActivity?.activity?.steps,
                            legacySteps: filterStepsForViewer(activity?.getPupilActivity?.activity?.steps?.legacySteps, {
                                schoolTagIds: activity?.getPupilActivity?.pupil?.school?.tagIds,
                                sbtMediaByStepId
                            })
                        }
                    }}
                    pupilActivityContext={activity?.getPupilActivity?.context}
                    isPupilActivity
                    sbtMediaByStepId={sbtMediaByStepId}
                    pupilData={{
                        pupil: {
                            firstname: activity?.getPupilActivity?.pupil?.firstname,
                            lastname: activity?.getPupilActivity?.pupil?.lastname,
                            fullname: activity?.getPupilActivity?.pupil?.fullname
                        }
                    }}
                />
            )}
            <div className="rating-comments-upload-container">
                <RatingCard
                    value={activity?.getPupilActivity?.rating || 0}
                    setValue={saveStars}
                    isActivity={true}
                    dataTest="activity-rating-star"
                />

                {activity?.getPupilActivity.feedbacks?.length > 0 ? (
                    <div className="pupil-activity-feedbacks-section">
                        <div className="pupil-activity-feedbacks-section-header">
                            <Heading2 text="Comments and photos" />
                            <Paragraph>
                                {token?.userTrustLevel < 2 ? (
                                    <>
                                        If you have done the activity again, add another set of comments. If you want to edit comments you
                                        left previously, please{' '}
                                        <span onClick={() => setIsSignInModalOpen(true)} className={classes.linkCursor}>
                                            <u className="pupil-activity-feedbacks-section-paragraph-link">log in or sign up</u>
                                        </span>
                                        .
                                    </>
                                ) : (
                                    'You can either edit the comments you left for this activity before, or if you have done the activity again, add a new set of comments and/or photos.'
                                )}
                            </Paragraph>
                        </div>
                        <div className="pupil-activity-feedbacks-section-main">
                            {(activity?.getPupilActivity.feedbacks || []).map((feedback) => {
                                return (
                                    <CommonActivityFeedCard
                                        expandAll={false}
                                        feedback={feedback}
                                        displayEditIcon={true}
                                        editActivity={editButtonHandler}
                                        viewActivity={collapseButtonHandler}
                                        customClass={'mt-5'}
                                        user={activity?.getPupilActivity?.pupil}
                                        type={getTopicType(activity?.getPupilActivity?.activity?.topic?.isReading)}
                                        thumb_up={false}
                                        activityContentImg={feedback?.photos?.[0]?.filename}
                                        showSideImg={false}
                                        isParent={true}
                                        classDate={feedback?.logCreatedAt}
                                        refetchQueries={[
                                            {
                                                query: getPupilActivityForViewActivity,
                                                variables: { id: router?.query?.activity_id }
                                            }
                                        ]}
                                        handleClickedLoginOrSignUpModal={handleClickedLoginOrSignUpModal}>
                                        {user?.getUser?.type === PARENT && user?.getUser?.id === feedback?.logCreatedBy?.id ? (
                                            <p>
                                                <b>You</b> added comments/photos
                                            </p>
                                        ) : feedback?.logCreatedBy?.firstname ? (
                                            <>
                                                {/* {`${feedback?.logCreatedBy?.firstname} ${feedback?.logCreatedBy?.lastname} added comments/photos`} */}
                                                {
                                                    <span>
                                                        <b>{feedback?.logCreatedBy?.firstname}</b> <b>{feedback?.logCreatedBy?.lastname}</b>{' '}
                                                        added comments/photos
                                                    </span>
                                                }
                                            </>
                                        ) : (
                                            <>
                                                {
                                                    <span>
                                                        <b>{'Another parent'}</b> added comments/photos
                                                    </span>
                                                }
                                            </>
                                        )}
                                    </CommonActivityFeedCard>
                                );
                            })}
                        </div>
                        <div className="pupil-activity-feedbacks-section-footer">
                            <LWPButton
                                disabled={user?.getUser?.type === TEACHER}
                                btnText="Add comments/photos"
                                onClick={() => setOpenAddFeedbackModal(!openAddFeedbackModal)}
                            />
                        </div>
                        {isReadyTeddyTopic ? (
                            <div className="pupil-activity-close-section">
                                <LWPButton color="inherit" onClick={() => router.push(`/topic/${pupilTopic?.id}`)} btnText="Close" />
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <ActivityFeedbackCard
                        activity={activity}
                        activityUser={user?.getUser}
                        getUserForViewActivity={getUserForViewActivity}
                        isReadyTeddyTopic={isReadyTeddyTopic}
                        routeToTopic={routeToTopic}
                    />
                )}
            </div>

            {!isReadyTeddyTopic ? (
                <>
                    {activity?.getPupilActivity?.feedbacks.length === 0 ? (
                        <div className="activity-cards">
                            <div className={'blur'}>
                                {activity?.['getPupilActivity']?.pupil?.currentMathscot == null ? (
                                    <CommonStatus
                                        className={classes.container}
                                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-question-mark.png`}
                                        imageAlt="page not found"
                                        heading="It’s time for a new Mathscot!"
                                        subHeading="Choose the Mathscot you want for the year, then earn items for it by completing activities."
                                        buttonText="Choose new Mathscot"
                                        onClick={() => {
                                            toggle();
                                        }}
                                    />
                                ) : (
                                    <div className={classes.lockedMathscot}>
                                        <ChangeDress
                                            pupilActivity={activity?.getPupilActivity}
                                            parentId={router?.query.parent_id}
                                            saveMathscot={mathScotMutation}
                                            selectedMathscot={selectedMathscot}
                                            setSelectedMathscot={setSelectedMathscot}
                                            setOrder={setOrder}
                                            mergeMathscotItemsLoader={mergeMathscotItemsLoader}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="activity-overlay-container">
                                <LockIcon className="lock_icon" />
                                <Heading1 centerText text="Leave a comment to unlock" />
                                <Paragraph centerText text="Please add a comment or photo to unlock this section" />
                            </div>
                        </div>
                    ) : (
                        !activity?.['getPupilActivity']?.pupil?.currentMathscot && (
                            <CommonStatus
                                className={classes.container}
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-question-mark.png`}
                                imageAlt="page not found"
                                heading="It’s time for a new Mathscot!"
                                subHeading="Choose the Mathscot you want for the year, then earn items for it by completing activities."
                                buttonText="Choose new Mathscot"
                                onClick={() => {
                                    toggle();
                                }}
                                buttonDataTest={'choose-mathscot-button'}
                            />
                        )
                    )}

                    {activity?.getPupilActivity?.feedbacks?.length > 0 && activity?.['getPupilActivity']?.pupil?.currentMathscot && (
                        <ChangeDress
                            pupilActivity={activity?.getPupilActivity}
                            parentId={router?.query.parent_id}
                            saveMathscot={mathScotMutation}
                            selectedMathscot={selectedMathscot}
                            setSelectedMathscot={setSelectedMathscot}
                            setOrder={setOrder}
                            mergeMathscotItemsLoader={mergeMathscotItemsLoader}
                        />
                    )}
                </>
            ) : null}

            <AddPupilFeedback
                activity={activity}
                updateValues={updateValues}
                open={openAddFeedbackModal}
                activityUser={user?.getUser}
                getUserForViewActivity={getUserForViewActivity}
                setOpen={() => {
                    setUpdateValues(null);
                    setOpenAddFeedbackModal(!openAddFeedbackModal);
                }}
            />
            <DialogWrapper contentWidth="1032px" className="mathscot_selection" open={open} setOpen={toggle}>
                <MathscotSelection
                    pupilTopicPeriodIndex={activity?.getPupilActivity?.topic?.period?.index}
                    onClick={(data) => {
                        setPupilMathscotData(data);
                        toggle_1() || toggle();
                    }}
                />
            </DialogWrapper>
            <DialogWrapper
                contentWidth="1032px"
                className="mathscot_Looking"
                open={open_1}
                setOpen={toggle_1}
                dataTest={'mathscot-looking-good-modal'}>
                <CommonStatus
                    className={classes.container}
                    image={pupilMathscotData.image}
                    imageAlt="page not found"
                    heading="Looking good!"
                    subHeading="Your new Mathscot is ready to learn with you. Once you confirm your choice, this Mathscot will stay with you for the rest of the year as you earn items for it.">
                    <div className="mathscot_btn">
                        <LWPButton
                            customClass="Mathscot_bnb"
                            color="inherit"
                            onClick={() => {
                                toggle_1() || toggle();
                            }}
                            btnText={`Back`}
                            size="large"
                        />
                        <LWPButton
                            customClass="Mathscot_bnb"
                            onClick={onSavePupilMathscot}
                            btnText={`Confirm`}
                            loading={addPupilMathscotLoading}
                            size="large"
                            dataTest={'confirm-mathscot-button'}
                        />
                    </div>
                </CommonStatus>
            </DialogWrapper>

            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${user?.getUser?.userStatus === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        user?.getUser?.userStatus === 'ACTIVE' ? 'log in' : 'sign up'
                    } to your account to view the full history below.`}
                    primaryBtnText={user?.getUser?.userStatus === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={handleClickedLoginOrSignUpModal}
                />
            )}
        </div>
    );
};

export default ViewActivity;
