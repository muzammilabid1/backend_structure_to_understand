/* eslint-disable @next/next/no-img-element */
import { gql, useQuery } from '@apollo/client';
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, READING, TEACHER, TOPICACCESS } from '../../../shared/Constant';
import { _getDayFromDate, getDaysFromIndex, readingLogsType, showDate } from '../../../shared/Services/handler';
import ShowPupilsFeedback from '../../Class/ClassReading/ReadingGroup/ShowPupilsFeedback';
import AudioPlayer from '../AudioPlayer';
import LWPButton from '../Button/LWPButton';
import CommonActivityFeedCard from '../Cards/CommonActivityFeedCard';
import FeedbackCommentCard from '../Cards/CommonActivityFeedCard/FeedbackCommentCard';
import CommonLoading from '../CommonLoading';
import CommonPopOver from '../CommonPopOver';
import Heading1 from '../Typography/Heading1';
import Heading3 from '../Typography/Heading3';
import CommonIconButton from './../Button/CommonIconButton';
import CommonAccordion from './../CommonAccordion';
import Paragraph from './../Typography/Paragraph';

// Queries

const getSchoolClassForCommonReadingLog = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            readingStartDay
        }
    }
`;

// Component

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

const CommonReadingLog = ({ pupilReadingLogFeedbacks, pupil, classId, type }) => {
    const queryParams = useParams();
    const [expanded, setExpanded] = useState('');

    const { data: schoolClassData, loading: schoolClassLoading } = useQuery(getSchoolClassForCommonReadingLog, {
        variables: { id: queryParams?.class_id ? queryParams?.class_id : classId[0] }
    });

    const [activeAccordion, setActiveAccordion] = useState(-1);

    const classes = useStyles();

    const readingStartDay = schoolClassData?.schoolClass?.readingStartDay;

    const head = getDaysFromIndex(readingStartDay).map((item) => item.charAt(0));
    const daysArr = getDaysFromIndex(readingStartDay);

    const getComment = (readingLogFeedback, pupilName) => {
        const readAsGroup = readingLogFeedback?.pupilCount > 1 ? 'as part of a group' : '';

        const renderName = (children) => {
            return readingLogFeedback?.pupilCount > 1 ? (
                <CommonPopOver
                    text={`${readingLogFeedback?.pupilCount} pupils`}
                    childrenClass="total-students-popover"
                    hover
                    className={'show_pupil_count'}>
                    <ShowPupilsFeedback feedbackId={readingLogFeedback?.id} />
                </CommonPopOver>
            ) : (
                children
            );
        };

        const loggedByName = readingLogFeedback?.logCreatedBy?.nameForChildren || readingLogFeedback?.userName || '';

        if (readingLogFeedback?.isBookFinished) {
            return (
                <>
                    <b>{renderName(pupilName)}</b> read <b>{readingLogFeedback?.bookName}</b>
                    {readAsGroup ? ` ${readAsGroup}` : null}
                    {loggedByName ? (
                        <>
                            {' with '}
                            <b>{loggedByName}</b>
                        </>
                    ) : null}{' '}
                    and finished the book.
                </>
            );
        }

        return (
            <>
                <b>{renderName(pupilName)}</b> read <b>{readingLogFeedback?.bookName}</b>
                {readAsGroup ? ` ${readAsGroup}` : null}
                {loggedByName ? (
                    <>
                        {' with '}
                        <b>{loggedByName}</b>
                    </>
                ) : null}
                {readingLogFeedback?.pageNumber && ` and got to Page ${readingLogFeedback?.pageNumber}`}.
            </>
        );
    };

    const handleChange = (panel) => (event, newExpanded) => {
        setExpanded(newExpanded ? panel : false);
    };

    const isExpa = (panel) => [panel, 'ALL'].includes(expanded);

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <div className="reading-container" data-test={'reading-log-section'}>
            <div className="reading-top">
                <div className="reading-identification-icon">
                    <div className="reading-icons">
                        <CommonIconButton className="icon-home" disabled icon="home" />
                        <Paragraph customClass="">Read at home</Paragraph>
                    </div>
                    <div className="reading-icons">
                        <CommonIconButton className="icon-school" disabled icon="school" />
                        <Paragraph customClass="">Read at school with a teacher</Paragraph>
                    </div>
                </div>
                {pupil?.pupil?.currentReadingTopic?.id && type === 'pupil-detail' && (
                    <div className="reading-log-page-button">
                        <a href={`/pupil/${pupil?.pupil?.id}/reading?topicId=${pupil?.pupil?.currentReadingTopic?.id}`}>
                            <LWPButton btnText={`Go to ${pupil?.pupil?.firstname}'s reading log`} endIcon="arrow_forward" />
                        </a>
                    </div>
                )}
            </div>

            <div className="reading-down">
                <CommonAccordion
                    className="reading-tile"
                    summaryClass="reading-title"
                    headings={
                        type === 'reading-detail'
                            ? [
                                  'Child name',
                                  head,
                                  <div className="align-items-center" onClick={() => setExpanded((p) => (p !== 'ALL' ? 'ALL' : ''))}>
                                      <Heading3 text={expanded !== 'ALL' ? 'Expand all' : 'Collapse all'} />
                                      <ExpandMore className={expanded !== 'ALL' ? 'isExpanded' : 'isNotExpanded'} />
                                  </div>
                              ]
                            : ['Reading week', head]
                    }
                    expandIcon={<ExpandMore data-test="expand-reading-log-accordion-icon" className="expand-icon" />}
                    expanded>
                    {(pupilReadingLogFeedbacks || []).map((pupilReadingLogFeedback) => {
                        let groupedLogs = daysArr.reduce((groupedLogs, log) => {
                            const setArr = pupilReadingLogFeedback?.readingLogFeedbacks.filter(
                                (item) => _getDayFromDate(item?.bookReadAt) === log && !item?.originalFeedbackId
                            );

                            groupedLogs.push(setArr);

                            return groupedLogs;
                        }, []);

                        return (
                            <Accordion
                                key={pupilReadingLogFeedback.id}
                                // expanded={activeAccordion === pupilReadingLogFeedback.id}
                                expanded={
                                    activeAccordion === pupilReadingLogFeedback.id
                                        ? activeAccordion === pupilReadingLogFeedback.id
                                        : isExpa(pupilReadingLogFeedback.id)
                                }
                                onChange={(_, expanded) => {
                                    handleChange(pupilReadingLogFeedback?.id);

                                    if (pupilReadingLogFeedback?.readingLogFeedbacks?.length)
                                        setActiveAccordion(pupilReadingLogFeedback.id);
                                    if (!expanded) setActiveAccordion(-1);
                                }}>
                                <AccordionSummary
                                    expandIcon={<ExpandMore className="expand-icon" data-test="expand-reading-week-accordion-icon" />}>
                                    <div className="reading-column">
                                        {type === 'pupil-detail' ? (
                                            <a
                                                href={`/class/${queryParams?.class_id ? queryParams?.class_id : classId[0]}/readingweek/${
                                                    pupilReadingLogFeedback?.id
                                                }`}>
                                                <Paragraph customClass="reading-text">
                                                    Week beginning {showDate({ date: pupilReadingLogFeedback?.releaseDate, short: true })}
                                                </Paragraph>
                                            </a>
                                        ) : (
                                            <a href={`/pupil/${pupilReadingLogFeedback?.id}`}>
                                                <Paragraph customClass="reading-text">{pupilReadingLogFeedback?.pupilName}</Paragraph>
                                            </a>
                                        )}
                                    </div>
                                    <div className="reading-column reading-column-down">
                                        {(groupedLogs || []).map((item) => {
                                            let iconSrc;

                                            if (item.length > 1) {
                                                const userType = item?.map((type) => type?.userType);
                                                const logGroupType = readingLogsType(userType);

                                                iconSrc = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${
                                                    MINIO_PUBLIC_PATHS.SITEIMAGE
                                                }/${
                                                    logGroupType == PARENT
                                                        ? 'readingHomeIcon.png'
                                                        : logGroupType == TEACHER
                                                          ? 'readingSchoolIcon.png'
                                                          : 'readingHomeClassIcon.png'
                                                }`;
                                            } else if (!item.length) {
                                                iconSrc = '';
                                            } else {
                                                const userType = item[0]?.userType;

                                                iconSrc = [PARENT, TOPICACCESS, MAGICPARENT].includes(userType)
                                                    ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/readingHomeIcon.png`
                                                    : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/readingSchoolIcon.png`;
                                            }

                                            return (
                                                <div className="reading-icon">
                                                    <img src={iconSrc} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {activeAccordion !== pupilReadingLogFeedback.id && (
                                        <Paragraph text="Details" customClass="accordion-detail" />
                                    )}
                                </AccordionSummary>
                                <AccordionDetails className="secondary-accordion-details">
                                    {(pupilReadingLogFeedback?.readingLogFeedbacks || []).map((readingLogFeedback) => {
                                        return (
                                            <div>
                                                {/* {readingLogFeedback?.comment ? ( */}
                                                <CommonActivityFeedCard
                                                    feedback={readingLogFeedback}
                                                    customClass={'mt-5'}
                                                    displayEditIcon={true}
                                                    expandAll={false}
                                                    showSideImg={false}
                                                    activityContentImg={readingLogFeedback?.photos?.[0]?.filename}
                                                    classDate={readingLogFeedback?.bookReadAt}
                                                    type={READING}
                                                    description={
                                                        readingLogFeedback?.audios?.length > 0 ? (
                                                            <div className={classes.history_log_container}>
                                                                {readingLogFeedback?.audios?.length > 0 && (
                                                                    <FeedbackCommentCard>
                                                                        <Heading1 text="Audio recording" />
                                                                        <StyledEngineProvider injectFirst>
                                                                            <ThemeProvider theme={muiTheme}>
                                                                                <AudioPlayer
                                                                                    src={readingLogFeedback?.audios?.[0]?.filename}
                                                                                />
                                                                            </ThemeProvider>
                                                                        </StyledEngineProvider>
                                                                    </FeedbackCommentCard>
                                                                )}
                                                            </div>
                                                        ) : null
                                                    }>
                                                    {getComment(
                                                        readingLogFeedback,
                                                        `${pupilReadingLogFeedback?.pupilName || pupilReadingLogFeedback?.name}`
                                                    )}
                                                </CommonActivityFeedCard>
                                                {/* ) : null} */}
                                            </div>
                                        );
                                    })}
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </CommonAccordion>
            </div>
        </div>
    );
};

CommonReadingLog.propTypes = {
    pupilReadingLogFeedbacks: PropTypes.array.isRequired,
    type: PropTypes.string.isRequired,
    pupil: PropTypes.object,
    classId: PropTypes.array
};

CommonReadingLog.defaultProps = {
    pupilReadingLogFeedbacks: []
};

export default CommonReadingLog;
