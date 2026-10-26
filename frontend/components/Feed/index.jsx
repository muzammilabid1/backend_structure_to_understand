import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Chip, Collapse, createTheme, Grid, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getPupilActivityFeeds, haveUnTickedFeedbacks } from '../../graphQl/queries';
import { getCookie } from '../../lib/manageCookies';
import {
    ADMIN,
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    PAGINATION_ITEM_LIMIT,
    PARENT,
    READING,
    SCRAPBOOK,
    TEACHER,
    TOPICACCESS
} from '../../shared/Constant';
import {
    getFeedbackType,
    getPupilFeedbackTitle,
    getWeekPostedRange,
    handleErrorSnackbar,
    ThemeContext
} from '../../shared/Services/handler';
import AudioPlayer from '../Shared/AudioPlayer';
import LWPButton from '../Shared/Button/LWPButton';
import CommonActivityFeedCard from '../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import MarkAsSeen from '../Shared/Cards/CommonActivityFeedCard/MarkAsSeen';
import FetchMoreLoading from '../Shared/FetchMoreLoading';
import SurveyModal from '../Shared/Modals/SurveyModal';
import Paragraph from '../Shared/Typography/Paragraph';
import CommonLazyLoading from './../../components/Shared/CommonLazyLoading';
import CommonLoading from './../../components/Shared/CommonLoading';
import CommonStatus from './../../components/Shared/CommonStatus';
import Heading1 from './../../components/Shared/Typography/Heading1';
import TecherActivityFeedFilter from './TecherActivityFeedFilter';
import TecherActivityFeedFilterLoading from './TecherActivityFeedFilterLoading';
import { useDelegatedClaims } from '../../context/DelegatedClaimsContext.tsx';
import NotActiveThisYearBanner from './../../components/Shared/NotActiveThisYearBanner';
import { useTooltip } from '../../context/TooltipContext.tsx';
import SchoolImportedDataSync from '../Shared/SchoolImportedDataSync/index.tsx';

const getUserForActivityFeed = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            isSchoolLeader
            nameForChildren
            type
            hasClassesThisYear
            school {
                id
                curentPeriod {
                    index
                    shortName
                }
                parentFeedbackTickFeatureEnabledAt
                isParentFeedbackReplyFeatureEnabled
                isParentFeedbackStickerFeatureEnabled
            }
            showInterstitial {
                id
                optedOut
            }
        }
    }
`;

const getSchoolForActivityFeed = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            importStatus
            misName
            lastImportedAt
            curentPeriod {
                index
                shortName
            }
            importedSchool {
                id
            }
        }
    }
`;

const muiTheme = createTheme({});

const useStyles = makeStyles((theme) => ({
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

const ActivityFeed = () => {
    const { token, callSnackbar, userId: contextUserId } = useContext(ThemeContext);
    const { setClaims } = useDelegatedClaims();
    const searchParams = useSearchParams();
    const params = useParams();
    const classes = useStyles();

    // For admin/school leader on /school/[school_id]/feed, use contextUserId
    // For teachers on /feed/[user_id], use user_id from URL
    const userId = params?.user_id ?? contextUserId;

    const [feeds, setFeeds] = useState([]);
    const [tickedAllFeedsLoading, setTickedAllFeedsLoading] = useState(false);
    const [onChangeLoading, setOnChangeLoading] = useState(false);
    const [openSurveyModal, setOpenSurveyModal] = useState(false);
    const [aborter, setAborter] = useState(new AbortController());
    const { isTooltipActive } = useTooltip();

    const isFilter = searchParams.get('isFilter') === 'true';
    const expandMore = searchParams.get('expandMore') === 'true';

    const { error: getUserError, data: user } = useQuery(getUserForActivityFeed, {
        variables: { id: userId, skip: !userId },
        fetchPolicy: 'cache-first'
    });

    const schoolId = params?.school_id ?? user?.getUser?.school?.id;

    useEffect(() => {
        if (schoolId) {
            setClaims({ schoolId: schoolId });
        }
    }, [schoolId, setClaims]);

    const { data: schoolData, error: schoolError } = useQuery(getSchoolForActivityFeed, {
        variables: { id: schoolId },
        skip: !(schoolId && (token?.userType === ADMIN || token?.isSchoolLeader))
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, schoolError);
    }, [schoolError]);

    const userDetails = user?.getUser;

    const [showTickedAllFeedbackQuery, { error: showTickedAllFeedbackError, loading: showAllTickLoading, data: showAllTick }] =
        useLazyQuery(haveUnTickedFeedbacks, {
            context: {
                fetchOptions: {
                    signal: aborter.signal
                }
            },
            notifyOnNetworkStatusChange: true
        });

    const [getPupilActivityFeedsQuery, { loading, error, data: pupilActivityFeeds, called }] = useLazyQuery(getPupilActivityFeeds, {
        context: {
            fetchOptions: {
                signal: aborter.signal
            }
        },
        notifyOnNetworkStatusChange: true
    });

    useEffect(() => {
        error?.message ? error?.message !== 'signal is aborted without reason' && callSnackbar(error, 'error') : null;
        showTickedAllFeedbackError?.message
            ? showTickedAllFeedbackError?.message !== 'signal is aborted without reason' &&
              callSnackbar(showTickedAllFeedbackError, 'error')
            : null;
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [getUserError, showTickedAllFeedbackError, error]);

    useEffect(() => {
        const isInterstitialCookie = getCookie('isInterstitial');
        const isInterstitial = String(isInterstitialCookie) === 'true';

        if (
            !user?.getUser?.isSchoolLeader &&
            user?.getUser?.showInterstitial?.id &&
            !user?.getUser?.showInterstitial?.optedOut &&
            isInterstitial &&
            called &&
            !loading
        ) {
            setOpenSurveyModal(true);
        }
    }, [user, called, loading]);

    useEffect(() => {
        if (user?.getUser && !called) {
            _fetchMore(0, searchfeedInput(), 'cache-and-network');
        }
    }, [user?.getUser, called]);

    const isFeedAfterDate = (feedback, date) => moment(feedback?.logCreatedAt).isSameOrAfter(moment(date));

    const searchfeedInput = () => {
        const classGroups = searchParams.get('classGroups');
        const activity = searchParams.get('activity') ? searchParams.get('activity') : 'ALL';
        const media = searchParams.get('media') ? searchParams.get('media') : 'ALL';

        const classIds = classGroups ? [classGroups] : searchParams.get('classIds') ? JSON.parse(searchParams.get('classIds')) : [];
        const sharingPermitted = searchParams.get('sharingPermitted') == 'true';
        const showOnlyUntickFeed = searchParams.get('showOnlyUntickFeed') == 'true';
        const academicYear = searchParams.get('academicYear') ? +searchParams.get('academicYear') : null;
        const bookName = searchParams.get('bookName') ? searchParams.get('bookName') : null;
        const subjects = searchParams.get('subject') ? [searchParams.get('subject')] : [];
        const feedbackTypes = searchParams.get('feedbackType') ? [searchParams.get('feedbackType')] : [];

        // A "This week" / "Last week" selection is persisted as `week` and translated back into posted-date
        // bounds here (shared with the filter's submit path) so the feed, unticked count and "Mark all as
        // seen" all use the same range. Explicit From/To dates are used only when no week is selected.
        const week = searchParams.get('week');
        const isWeekSelected = week === 'THIS_WEEK' || week === 'LAST_WEEK';
        const weekRange = getWeekPostedRange(week);
        const postedBefore = isWeekSelected
            ? weekRange.postedBefore
            : searchParams.get('postedBefore')
              ? new Date(searchParams.get('postedBefore'))
              : null;
        const postedAfter = isWeekSelected
            ? weekRange.postedAfter
            : searchParams.get('postedAfter')
              ? new Date(searchParams.get('postedAfter'))
              : null;

        const payload = {
            postedBefore,
            postedAfter,
            bookName,
            classIds,
            activity,
            media,
            sharingPermitted,
            showOnlyUntickFeed,
            academicYear,
            subjects,
            feedbackTypes
        };

        return payload;
    };

    const _fetchMore = async (offset = feeds.length, feedInput = searchfeedInput(), fetchPolicy = 'cache-and-network') => {
        if (user) {
            try {
                const { data } = await showTickedAllFeedbackQuery({
                    variables: {
                        teacherId: userId,
                        filter: feedInput,
                        schoolId: schoolId
                    }
                });

                const { data: pupilActivityFeeds } = await getPupilActivityFeedsQuery({
                    variables: {
                        teacherId: userId,
                        schoolId: schoolId,
                        offset,
                        limit: PAGINATION_ITEM_LIMIT,
                        filter: {
                            ...feedInput,
                            showOnlyUntickFeed: data?.haveUnTickedFeedbacks ? feedInput?.showOnlyUntickFeed : false
                        }
                    },
                    fetchPolicy
                });

                if (pupilActivityFeeds?.getPupilActivityFeeds) {
                    const pupilActivityFeedsResults = pupilActivityFeeds?.getPupilActivityFeeds?.results;
                    const arrayOfObjects = offset ? [...pupilActivityFeedsResults, ...feeds] : [...pupilActivityFeedsResults];

                    const uniqueItems = arrayOfObjects.reduce((accumulator, current) => {
                        let exists = accumulator.find((item) => {
                            return item.id === current.id;
                        });

                        if (!exists) {
                            accumulator = accumulator.concat(current);
                        }

                        return accumulator;
                    }, []);

                    const sortedByDate = uniqueItems?.sort((a, b) =>
                        a.logCreatedAt < b.logCreatedAt ? 1 : b.logCreatedAt < a.logCreatedAt ? -1 : 0
                    );

                    setFeeds(sortedByDate);
                }

                return data;
            } catch (error) {
                console.error('An error occurred:', error);
            } finally {
                setOnChangeLoading(false);
            }
        }
    };

    const getFirstTick = feeds?.find(
        (feed) => feed?.userType === PARENT && isFeedAfterDate(feed, user?.getUser?.school?.parentFeedbackTickFeatureEnabledAt)
    );
    const getFirstComment = user?.getUser?.school?.isParentFeedbackReplyFeatureEnabled
        ? feeds?.find((feed) => feed?.userType === PARENT)
        : null;
    const getFirstStickers = user?.getUser?.school?.isParentFeedbackStickerFeatureEnabled
        ? feeds?.find((feed) => feed?.userType === PARENT)
        : null;
    const isFeedsTick = feeds?.some(
        (feed) => feed?.userType === PARENT && isFeedAfterDate(feed, user?.getUser?.school?.parentFeedbackTickFeatureEnabledAt)
    );

    const showfilterLoader = (showAllTickLoading && !isFilter) || tickedAllFeedsLoading;
    const teacherHasNoClassesThisYear = userDetails?.type === TEACHER && !userDetails?.isSchoolLeader && !userDetails?.hasClassesThisYear;

    const schoolDetails = schoolData?.getSchool;

    return (
        <div className="other_layout_for_specific_pages">
            {teacherHasNoClassesThisYear ? (
                <div className="teacher-not-active-banner">
                    <NotActiveThisYearBanner description="Your school has not assigned you to any classes for this academic year yet. Please check again later." />
                </div>
            ) : null}

            {schoolDetails ? <SchoolImportedDataSync school={schoolDetails} /> : null}

            <div className="activity-feed-header other_layout_for_specific_pages">
                <div className="teacher-activity-feed-header">
                    <Heading1 text="Activity feed" />

                    <Chip
                        label={`${
                            pupilActivityFeeds?.getPupilActivityFeeds?.total ? pupilActivityFeeds?.getPupilActivityFeeds?.total : 0
                        } ${pupilActivityFeeds?.getPupilActivityFeeds?.total === 1 ? 'item' : 'items'} found`}
                        size="small"
                    />
                </div>

                {!(loading && !!pupilActivityFeeds) && (
                    <Grid display={'flex'}>
                        <LWPButton
                            onClick={() => _fetchMore(0)}
                            variant="text"
                            color="inherit"
                            btnText="Check for new items"
                            startIcon="sync"
                        />
                    </Grid>
                )}
            </div>

            <Collapse in={showfilterLoader} timeout={0} unmountOnExit={isFilter}>
                <TecherActivityFeedFilterLoading open={expandMore} />
            </Collapse>

            <Collapse in={!showfilterLoader} timeout={0} unmountOnExit={!isFilter}>
                <TecherActivityFeedFilter
                    user={user?.getUser}
                    _fetchMore={_fetchMore}
                    haveUnTickedFeedbacks={showAllTick?.haveUnTickedFeedbacks}
                    showUntickFeedback={!!user?.getUser?.school?.parentFeedbackTickFeatureEnabledAt && feeds.length > 0 && isFeedsTick}
                    isLoading={showAllTickLoading || loading}
                    setOnChangeLoading={setOnChangeLoading}
                    aborter={aborter}
                    setAborter={setAborter}
                    schoolId={schoolId}
                    schoolDetails={userDetails?.school ?? schoolDetails}
                />
            </Collapse>

            <br />
            <FetchMoreLoading loading={(showAllTickLoading || loading || onChangeLoading) && !!pupilActivityFeeds} />

            <CommonLazyLoading
                previousDataLength={feeds.length}
                hasMoreLoading={pupilActivityFeeds?.getPupilActivityFeeds?.total !== feeds.length}
                fetchMore={_fetchMore}
                loadingContent={<CommonLoading />}>
                {(feeds || []).map((feedback) => {
                    return (
                        <CommonActivityFeedCard
                            key={feedback?.id}
                            displayEditIcon={true}
                            getFirstTick={getFirstTick}
                            getFirstComment={getFirstComment}
                            getFirstStickers={getFirstStickers}
                            setFeeds={setFeeds}
                            user={user?.getUser}
                            searchfeedInput={searchfeedInput}
                            showTickedAllFeedbackQuery={showTickedAllFeedbackQuery}
                            customClass={`history_log_feed ${
                                [PARENT, MAGICPARENT, TOPICACCESS].includes(feedback?.userType)
                                    ? classes.iconHome
                                    : feedback?.userType === TEACHER && feedback?.includeInReadingTarget
                                      ? classes.iconSchool
                                      : !feedback?.includeInReadingTarget
                                        ? classes.notCountingTowardsTarget
                                        : ''
                            }`}
                            isSchoolFeed
                            previousDataLength={feeds.length}
                            feedback={feedback}
                            activityContentImg={feedback?.photos?.[0]?.filename}
                            onReadingLogUpdate={(feed) =>
                                setFeeds(feeds?.map((item) => (item?.id === feed?.id ? { ...item, ...feed } : item)))
                            }
                            type={
                                !feedback?.includeInReadingTarget && feedback?.userType === TEACHER
                                    ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                                    : getFeedbackType(feedback?.type)
                            }
                            classTitle={feedback?.className ?? null}
                            classDate={feedback?.logCreatedAt}
                            description={
                                feedback?.audios?.length > 0 ? (
                                    <div className={classes.history_log_container}>
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
                            }>
                            {feedback?.type === READING ? (
                                getPupilFeedbackTitle(feedback)
                            ) : feedback?.type === SCRAPBOOK ? (
                                <div className="activity-feed-title">
                                    <Paragraph className="mb2">
                                        <a href={`/pupil/${feedback?.pupil?.id}`}>
                                            <u>{feedback?.pupil?.fullname}</u>
                                        </a>{' '}
                                        added a scrapbook entry
                                    </Paragraph>
                                </div>
                            ) : (
                                <div className="activity-feed-title">
                                    <Paragraph className="mb2">
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
                            )}
                        </CommonActivityFeedCard>
                    );
                })}
                {feeds.length > 0 &&
                    pupilActivityFeeds?.getPupilActivityFeeds?.total === feeds.length &&
                    showAllTick?.haveUnTickedFeedbacks && (
                        <MarkAsSeen
                            setFeeds={setFeeds}
                            searchfeedInput={searchfeedInput}
                            setTickedAllFeedsLoading={setTickedAllFeedsLoading}
                            showTickedAllFeedbackQuery={showTickedAllFeedbackQuery}
                            allFeeds={feeds}
                            showAllTick={showAllTick?.haveUnTickedFeedbacks}
                            user={user?.getUser}
                            isAllTick={true}
                            userId={userId}
                        />
                    )}

                {!loading && pupilActivityFeeds?.getPupilActivityFeeds?.total == 0 && (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'No activities to show'}
                        className="mt8"
                    />
                )}
            </CommonLazyLoading>

            {openSurveyModal && !isTooltipActive && <SurveyModal open={openSurveyModal} setOpen={setOpenSurveyModal} viewType={TEACHER} />}
        </div>
    );
};

export default ActivityFeed;
