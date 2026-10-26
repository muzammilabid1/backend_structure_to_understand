import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Chip, Collapse, createTheme, StyledEngineProvider, ThemeProvider, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { deleteFeedback } from '../../../graphQl/mutations';
import { getAllFeedsForAdmin } from '../../../graphQl/queries';
import {
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    PAGINATION_ITEM_LIMIT,
    PARENT,
    READING,
    SCRAPBOOK,
    TEACHER,
    TOPICACCESS
} from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { getFeedbackType, getPupilFeedbackTitle, ThemeContext } from '../../../shared/Services/handler';
import AudioPlayer from '../../Shared/AudioPlayer';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import FetchMoreLoading from '../../Shared/FetchMoreLoading';
import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';
import CommonLazyLoading from './../../Shared/CommonLazyLoading';
import CommonLoading from './../../Shared/CommonLoading';
import CommonStatus from './../../Shared/CommonStatus';
import AllFeedsFilter from './AllFeedsFilter';

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

const AllFeedsAdmin = () => {
    const { token, callSnackbar } = useContext(ThemeContext);
    const searchParams = useSearchParams();
    const classes = useStyles();

    const [feeds, setFeeds] = useState([]);
    const [showStatus, setShowStatus] = useState({ isRestrict: false, message: '' });
    const [isOpen, setIsOpen] = useState(false);

    const [getAllFeedsQuery, { loading, error, data: getAllFeeds }] = useLazyQuery(getAllFeedsForAdmin, {
        fetchPolicy: 'cache-and-network'
    });

    const [deleteFeedbackMutation, { loading: deleteFeedbackLoading }] = useMutation(deleteFeedback);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _fetchMore = (offset = feeds.length) => {
        const feedInput = {};

        if (searchParams.get('postedBefore')) {
            feedInput['postedBefore'] = searchParams.get('postedBefore');
        }

        if (searchParams.get('postedAfter')) {
            feedInput['postedAfter'] = searchParams.get('postedAfter');
        }

        if (searchParams.get('sharedStatus')) {
            feedInput['sharedStatus'] = searchParams.get('sharedStatus');
        } else {
            feedInput['sharedStatus'] = sharedJson?.feedbackSharedStatus?.[1]?.key;
        }

        if (!searchParams.get('filtered')) {
            feedInput['defaultDate'] = true;
        }

        if (searchParams.get('subjects')) {
            const subjects = JSON.parse(searchParams.get('subjects'));

            if (typeof subjects === 'string') {
                feedInput['subjects'] = subjects;
            } else {
                feedInput['subjects'] = subjects;
            }
        }

        if (searchParams.get('searchInput')) {
            feedInput['searchInput'] = searchParams.get('searchInput');
        }

        if (searchParams.get('bookName')) {
            feedInput['bookName'] = searchParams.get('bookName');
        }

        if (searchParams.get('topicYearGroupIds')) {
            const topicYearGroupIds = JSON.parse(searchParams.get('topicYearGroupIds'));

            if (typeof topicYearGroupIds === 'string') {
                feedInput['topicYearGroupIds'] = topicYearGroupIds;
            } else {
                feedInput['topicYearGroupIds'] = topicYearGroupIds.map(String);
            }
        }

        if (searchParams.get('topicTagIds')) {
            const topicTagIds = JSON.parse(searchParams.get('topicTagIds'));

            if (typeof topicTagIds === 'string') {
                feedInput['topicTagIds'] = topicTagIds;
            } else {
                feedInput['topicTagIds'] = topicTagIds.map(String);
            }
        }

        if (searchParams.get('activityTagIds')) {
            const activityTagIds = JSON.parse(searchParams.get('activityTagIds'));

            if (typeof activityTagIds === 'string') {
                feedInput['activityTagIds'] = activityTagIds;
            } else {
                feedInput['activityTagIds'] = activityTagIds.map(String);
            }
        }

        if (searchParams.get('schoolTagIds')) {
            const schoolTagIds = JSON.parse(searchParams.get('schoolTagIds'));

            if (typeof schoolTagIds === 'string') {
                feedInput['schoolTagIds'] = schoolTagIds;
            } else {
                feedInput['schoolTagIds'] = schoolTagIds.map(String);
            }
        }

        if (searchParams.get('schoolTypes')) {
            const schoolTypes = JSON.parse(searchParams.get('schoolTypes'));

            if (typeof schoolTypes === 'string') {
                feedInput['schoolTypes'] = schoolTypes;
            } else {
                feedInput['schoolTypes'] = schoolTypes.map(String);
            }
        }

        if (searchParams.get('feedbackTypes')) {
            const feedbackTypes = JSON.parse(searchParams.get('feedbackTypes'));

            if (typeof feedbackTypes === 'string') {
                feedInput['feedbackTypes'] = [feedbackTypes];
            } else {
                feedInput['feedbackTypes'] = feedbackTypes.map(String);
            }
        }

        if (searchParams.get('bookOptions')) {
            const bookOptions = JSON.parse(searchParams.get('bookOptions'));

            if (typeof bookOptions === 'string') {
                feedInput['bookOptions'] = bookOptions;
            } else {
                feedInput['bookOptions'] = bookOptions.map(String);
            }
        }

        if (searchParams.get('photoRatings')) {
            const photoRatings = JSON.parse(searchParams.get('photoRatings'));

            if (typeof photoRatings === 'string') {
                feedInput['photoRatings'] = Number(photoRatings);
            } else {
                feedInput['photoRatings'] = photoRatings.map(Number);
            }
        }

        if (searchParams.get('starRating')) {
            const starRating = JSON.parse(searchParams.get('starRating'));

            if (typeof starRating === 'string') {
                feedInput['starRating'] = Number(starRating);
            } else {
                feedInput['starRating'] = starRating.map(Number);
            }
        }

        if (searchParams.get('schoolIds')) {
            const schoolIds = JSON.parse(searchParams.get('schoolIds'));

            if (typeof schoolIds === 'string') {
                feedInput['schoolIds'] = schoolIds;
            } else {
                feedInput['schoolIds'] = schoolIds;
            }
        }

        if (searchParams.get('topicIds')) {
            const topicIds = JSON.parse(searchParams.get('topicIds'));

            if (typeof topicIds === 'string') {
                feedInput['topicIds'] = topicIds;
            } else {
                feedInput['topicIds'] = topicIds?.map(String);
            }
        }

        if (searchParams.get('IsOpen')) {
            setIsOpen(searchParams.get('IsOpen') === 'true');
        }

        token?.sub && getAllFeedsQuery({ variables: { offset, limit: PAGINATION_ITEM_LIMIT, filter: feedInput } });
    };

    useEffect(() => {
        if (token?.sub && !loading) {
            _fetchMore();
        }
    }, [token, searchParams]);

    useEffect(() => {
        if (getAllFeeds?.getAllFeeds?.feed?.results) {
            const arrayOfObjects = [...feeds, ...getAllFeeds.getAllFeeds.feed.results];

            const uniqueItems = arrayOfObjects.reduce((accumulator, current) => {
                let exists = accumulator.find((item) => item.id === current.id);

                if (!exists) {
                    accumulator = accumulator.concat(current);
                }

                return accumulator;
            }, []);

            const sortedByDate = uniqueItems.sort((a, b) =>
                a.logCreatedAt < b.logCreatedAt ? 1 : b.logCreatedAt < a.logCreatedAt ? -1 : 0
            );

            setFeeds(sortedByDate);
        }
    }, [getAllFeeds, loading]);

    useEffect(() => {
        let schoolIds = null;
        let sharedStatus = null;

        if (searchParams.get('schoolIds')) {
            schoolIds = JSON.parse(searchParams.get('schoolIds'));
        }

        if (searchParams.get('sharedStatus')) {
            sharedStatus = searchParams.get('sharedStatus');
        }

        if (!schoolIds?.length && sharedStatus === sharedJson?.feedbackSharedStatus?.[0]?.key && !loading && !feeds.length) {
            setShowStatus({ isRestrict: true, message: 'We do not show feedback entries that are not shared on the admin activity feed' });
        } else {
            !loading && !feeds.length ? setShowStatus({ isRestrict: false, message: 'No activities to show' }) : setShowStatus(null);
        }
    }, [loading, feeds, getAllFeeds]);

    return (
        <div className="other_layout_for_specific_pages all-admin-feeds">
            <div className="activity-feed-header other_layout_for_specific_pages">
                {getAllFeeds?.getAllFeeds?.feed?.total != null ? (
                    <Chip
                        label={`${getAllFeeds?.getAllFeeds?.feed?.total ? getAllFeeds?.getAllFeeds?.feed?.total : 0} ${
                            getAllFeeds?.getAllFeeds?.feed?.total === 1 ? 'item' : 'items'
                        } found`}
                        size="small"
                    />
                ) : (
                    <div />
                )}

                <Button className="filter-button" data-test="filter-button" onClick={() => setIsOpen(!isOpen)}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>

            <Collapse in={isOpen} unmountOnExit>
                <AllFeedsFilter
                    customClass={isOpen ? 'show' : 'notShow'}
                    setIsOpen={setIsOpen}
                    postedAfter={getAllFeeds?.getAllFeeds?.filter?.postedAfter}
                    setFeeds={setFeeds}
                />
            </Collapse>

            <FetchMoreLoading loading={loading && !!getAllFeeds} onClick={() => _fetchMore(0)} />
            <br />
            <CommonLazyLoading
                previousDataLength={feeds.length}
                hasMoreLoading={getAllFeeds?.getAllFeeds?.feed?.total !== feeds.length && !showStatus?.isRestrict}
                fetchMore={_fetchMore}
                loadingContent={<CommonLoading />}>
                {(feeds || []).map((feed) => {
                    return (
                        <CommonActivityFeedCard
                            key={feed?.id}
                            previousDataLength={feeds.length}
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
                            lastFeedId={feeds?.[feeds.length - 1]?.id}
                            activityContentImg={feed?.photos?.[0]?.filename}
                            type={
                                !feed?.includeInReadingTarget && feed?.userType === TEACHER
                                    ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                                    : getFeedbackType(feed?.type)
                            }
                            classTitle={feed?.className ?? null}
                            classDate={feed?.logCreatedAt}
                            description={
                                feed?.audios?.length > 0 ? (
                                    <div className={classes.history_log_container}>
                                        {feed?.audios?.length > 0 && (
                                            <FeedbackCommentCard>
                                                <Heading1 text="Audio recording" />
                                                <StyledEngineProvider injectFirst>
                                                    <ThemeProvider theme={muiTheme}>
                                                        <AudioPlayer src={feed?.audios?.[0]?.filename} />
                                                    </ThemeProvider>
                                                </StyledEngineProvider>
                                            </FeedbackCommentCard>
                                        )}
                                    </div>
                                ) : null
                            }
                            photoRating={feed?.rating}
                            isAdminFeed={true}
                            deleteFeedbackMutation={deleteFeedbackMutation}
                            deleteFeedbackLoading={deleteFeedbackLoading}
                            setFeeds={setFeeds}>
                            {feed?.type === READING ? (
                                getPupilFeedbackTitle(feed)
                            ) : feed?.type === SCRAPBOOK ? (
                                <div className="activity-feed-title">
                                    <Paragraph className="mb2">
                                        <a href={`/admin/child/${feed?.pupil?.id}`}>
                                            <u>{feed?.pupil?.fullname}</u>
                                        </a>{' '}
                                        added a scrapbook entry
                                    </Paragraph>
                                </div>
                            ) : (
                                <div className="activity-feed-title">
                                    <Paragraph className="mb2">
                                        <a href={`/admin/child/${feed?.pupil?.id}`}>
                                            <u>{feed?.pupil?.fullname}</u>
                                        </a>
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
                    );
                })}
            </CommonLazyLoading>

            {showStatus?.message && (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={'mathscot-thinking'}
                    heading={showStatus?.message}
                />
            )}
        </div>
    );
};

export default AllFeedsAdmin;
