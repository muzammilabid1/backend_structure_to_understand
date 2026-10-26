/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { MAGICPARENT, MINIO_PUBLIC_PATHS, PAGINATION_ITEM_LIMIT, PARENT, TEACHER, TOPICACCESS } from '../../../../shared/Constant';
import { getPupilFeedbackTitle, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import AudioPlayer from '../../../Shared/AudioPlayer';
import CommonActivityFeedCard from '../../../Shared/Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../../../Shared/Cards/CommonActivityFeedCard/FeedbackCommentCard';
import CommonLazyLoading from '../../../Shared/CommonLazyLoading';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import Heading1 from '../../../Shared/Typography/Heading1';
import Paragraph from '../../../Shared/Typography/Paragraph';

const muiTheme = createTheme({});

const useStyles = makeStyles((theme: Theme) => ({
    iconHome: {
        color: '#D13F75',
        borderRadius: '26px',
        padding: '7px',
        [theme.breakpoints.down('md')]: {
            backgroundColor: 'transparent'
        }
    },
    iconSchool: {
        color: '#0083CB',
        borderRadius: '26px',
        padding: '7px',
        [theme.breakpoints.down('md')]: {
            backgroundColor: 'transparent'
        }
    },
    notCountingTowardsTarget: {
        color: '#999591',
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

interface Feedback {
    id: string;
    logCreatedAt: string;
    userType: string;
    includeInReadingTarget: boolean;
    photos?: { filename: string }[];
    audios?: { filename: string }[];
    pupilCount: number;
}

interface PupilActivityFeeds {
    getFeedbackForGroupReading: {
        total: number;
        results: Feedback[];
    };
}

interface PreviousGroupReadingProps {
    pupilActivityFeeds?: PupilActivityFeeds;
    loading: boolean;
    getPupilActivityFeedsQuery: (variables: any) => Promise<any>;
    setFeeds: React.Dispatch<React.SetStateAction<Feedback[]>>;
    feeds: Feedback[];
    readingGroupState: ReadingGroupState;
    parentClassId?: string;
    isRegistrationClass: boolean;
    pupilIdsForGroup?: string[];
    classData?: { schoolClass: ILwpSchoolClassDetails };
    schoolId: string;
}

interface ReadingGroupState {
    pupilIds?: string[];
    showPreviousGroupLoading?: boolean;
}

const PreviousGroupReading = ({
    pupilActivityFeeds,
    loading,
    getPupilActivityFeedsQuery,
    setFeeds,
    feeds,
    readingGroupState,
    parentClassId,
    isRegistrationClass,
    pupilIdsForGroup,
    classData,
    schoolId
}: PreviousGroupReadingProps) => {
    const classes = useStyles();
    const queryParams = useParams();
    const { token } = useContext(ThemeContext);

    const [showFeed, setShowFeed] = useState(true);

    const _fetchMore = () => {
        if (token?.sub) {
            getPupilActivityFeedsQuery({
                variables: {
                    schoolId,
                    classId: isRegistrationClass ? queryParams?.class_id : parentClassId,
                    offset: feeds.length,
                    limit: PAGINATION_ITEM_LIMIT,
                    pupilIds:
                        readingGroupState?.pupilIds?.length > 0 ? readingGroupState?.pupilIds : isRegistrationClass ? [] : pupilIdsForGroup
                },
                fetchPolicy: 'network-only'
            });
        }
    };

    useEffect(() => {
        if (token?.sub && classData && schoolId) {
            _fetchMore();
        }
    }, [token, classData, schoolId]);

    useEffect(() => {
        if (!feeds.length && pupilActivityFeeds?.getFeedbackForGroupReading?.results) {
            setFeeds([...feeds, ...pupilActivityFeeds.getFeedbackForGroupReading.results]);
        }
    }, [pupilActivityFeeds]);

    useEffect(() => {
        const newFeeds = pupilActivityFeeds?.getFeedbackForGroupReading?.results;

        if (feeds.length && Array.isArray(newFeeds) && newFeeds.length) {
            const oldFeeds = feeds[feeds.length - 1];
            const lastItemFromNewFeeds = newFeeds[newFeeds.length - 1];

            if (lastItemFromNewFeeds.id !== oldFeeds?.id) {
                setFeeds([...feeds, ...newFeeds]);
            } else {
                setFeeds(newFeeds);
            }
        }
    }, [pupilActivityFeeds]);

    const handleShowFeed = () => {
        setShowFeed(!showFeed);
    };

    if (readingGroupState?.showPreviousGroupLoading) {
        return (
            <div className="previous_section">
                <CommonLoading />
            </div>
        );
    }

    return (
        <div className="previous_section">
            <div className="show_feed" onClick={handleShowFeed}>
                {showFeed ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                <Paragraph>
                    <b>Reading history</b>
                </Paragraph>
            </div>
            <br />

            <div className={`pupil_history_card activity_Feed_card`} style={{ display: `${showFeed ? 'block' : 'none'}` }}>
                <CommonLazyLoading
                    previousDataLength={feeds?.length}
                    hasMoreLoading={pupilActivityFeeds?.getFeedbackForGroupReading?.total !== feeds?.length}
                    fetchMore={_fetchMore}
                    loadingContent={<CommonLoading />}
                    height={600}>
                    {(feeds || []).map((feedback) => {
                        return (
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
                                type={
                                    !feedback?.includeInReadingTarget && feedback?.userType === TEACHER
                                        ? 'READING-NOT-COUNTING-TOWARDS-TARGET'
                                        : 'READING'
                                }
                                expandAll={false}
                                thumb_up={false}
                                feedback={feedback}
                                showSideImg={true}
                                displayEditIcon={true}
                                isParent={true}
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
                                        <div>
                                            {feedback?.photos?.length > 0 && (
                                                <div className="reading_group_log_img">
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
                                onReadingLogUpdate={(feed) =>
                                    setFeeds(feeds?.map((item) => (item?.id === feed?.id ? { ...item, ...feed } : item)))
                                }>
                                {getPupilFeedbackTitle(feedback)}
                            </CommonActivityFeedCard>
                        );
                    })}

                    {!loading && !feeds?.length && (
                        <CommonStatus
                            className="no_feed"
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                            imageAlt={''}
                            heading={'Nothing to show here'}
                        />
                    )}
                </CommonLazyLoading>
            </div>
        </div>
    );
};

export default PreviousGroupReading;
