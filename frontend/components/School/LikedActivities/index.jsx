import { useLazyQuery } from '@apollo/client';
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';

import { getLikedActivityFeeds } from '../../../graphQl/queries';
import { MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, READING, TEACHER, TOPICACCESS } from '../../../shared/Constant';
import { getFeedbackType, getPupilFeedbackTitle, ThemeContext } from '../../../shared/Services/handler';
import AudioPlayer from '../../Shared/AudioPlayer';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import CommonCard from '../../Shared/Cards/CommonCard';
import Paragraph from '../../Shared/Typography/Paragraph';
import CommonLoading from './../../Shared/CommonLoading';
import CommonStatus from './../../Shared/CommonStatus';
import Heading1 from './../../Shared/Typography/Heading1';

// const menuLists = [
//     {
//         key: 'Test class 1',
//         value: 'Test class 1'
//     },
//     {
//         key: 'Test class 2',
//         value: 'Test class 2'
//     },
//     {
//         key: 'Test class 3',
//         value: 'Test class 3'
//     }
// ];

// const timeRanges = [
//     {
//         key: 'Last one week',
//         value: 'Last one week'
//     },
//     {
//         key: 'Last two weeks',
//         value: 'Last two weeks'
//     },
//     {
//         key: 'Last three week',
//         value: 'Last three week'
//     }
// ];

const muiTheme = createTheme({});

const useStyles = makeStyles((theme) => ({
    iconHome: {
        color: '#D13F75'
    },
    iconSchool: {
        color: '#0083CB'
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

const LikedActivities = () => {
    // const [selectedClass, setSelectedClass] = useState('');
    // const [selectedRange, setSelectedRange] = useState('');
    const { token, callSnackbar } = useContext(ThemeContext);
    const [getLikedActivityFeedsQuery, { loading, error, data: likedActivities }] = useLazyQuery(getLikedActivityFeeds);
    const classes = useStyles();

    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        if (token?.sub) getLikedActivityFeedsQuery({ variables: { id: token.sub } });
    }, [token]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        !loading && !likedActivities?.['getLikedActivityFeeds']?.length ? setShowStatus(true) : setShowStatus(false);
    }, [loading, likedActivities]);

    if (loading) return <CommonLoading />;

    return (
        <div className="other_layout_for_specific_pages activity-feed-container">
            <div className="activity-feed-header all-class-details">
                <Heading1 text="Liked activities" customClass="pb8" />
                {/* <CommonPopOver
                    anchorOriginHorizontal="right"
                    transformOriginHorizontal="right"
                    bold
                    text="Filter activities"
                    icon="expand_more"
                    iconClassName="ml2">
                    <div className="filter-content">
                        <Heading3 text="Filters" />
                        <OptionSelectField
                            label="Class"
                            md={12}
                            lg={12}
                            value={selectedClass}
                            setValue={(e) => setSelectedClass(e.target.value)}
                            menuLists={menuLists}
                            customClass="option-field"
                        />
                        <OptionSelectField
                            label="Time range"
                            md={12}
                            lg={12}
                            value={selectedRange}
                            setValue={(e) => setSelectedRange(e.target.value)}
                            menuLists={timeRanges}
                            customClass="option-field"
                        />
                    </div>
                </CommonPopOver> */}
            </div>
            {(likedActivities?.['getLikedActivityFeeds'] || []).map((feedback) => {
                return (
                    <CommonActivityFeedCard
                        key={feedback?.id}
                        feedback={feedback}
                        customClass={`history_log_feed ${
                            [TOPICACCESS, MAGICPARENT, PARENT].includes(feedback?.userType)
                                ? classes.iconHome
                                : feedback?.userType === TEACHER
                                  ? classes.iconSchool
                                  : ''
                        }`}
                        activityContentImg={feedback?.photos?.[0]?.filename}
                        description={
                            feedback?.audios?.length > 0 ? (
                                <div className={classes.history_log_container}>
                                    {feedback?.audios?.length > 0 && (
                                        <CommonCard className="activity-feed-card">
                                            <Heading1 text="Audio recording" customClass="comment-heading" />
                                            <StyledEngineProvider injectFirst>
                                                <ThemeProvider theme={muiTheme}>
                                                    <AudioPlayer src={feedback?.audios?.[0]?.filename} />
                                                </ThemeProvider>
                                            </StyledEngineProvider>
                                        </CommonCard>
                                    )}
                                </div>
                            ) : null
                        }
                        type={getFeedbackType(feedback?.type)}
                        classTitle={feedback?.className ?? null}
                        classDate={feedback?.logCreatedAt}>
                        {feedback?.type === READING ? (
                            getPupilFeedbackTitle(feedback)
                        ) : (
                            <div className="activity-feed-title">
                                <Paragraph className="mb2">
                                    <Link passHref href={`/pupil/${feedback?.pupil?.id}`}>
                                        <u>{feedback?.pupil?.fullname}</u>
                                    </Link>
                                    {feedback?.description ? (
                                        ' did their own activity'
                                    ) : (
                                        <>
                                            {' '}
                                            added comments to the <b>{feedback?.activity?.activity?.name}</b> activity in the{' '}
                                            {feedback?.activity?.topic?.classTopic?.class?.id ? (
                                                <Link
                                                    passHref
                                                    href={`/class/${feedback?.activity?.topic?.classTopic?.class?.id}/topic/${feedback?.activity?.topic?.classTopic?.id}`}>
                                                    <u>{feedback?.activity?.activity?.topic?.teacherTopicName}</u>
                                                </Link>
                                            ) : (
                                                <span>{feedback?.activity?.activity?.topic?.teacherTopicName}</span>
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
            {showStatus && (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'No liked activities to show'}
                />
            )}
        </div>
    );
};

export default LikedActivities;
