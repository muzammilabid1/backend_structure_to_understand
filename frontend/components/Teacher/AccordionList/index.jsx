import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

import { getTopicType } from '../../../shared/Services/handler';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import CommonAccordion from './../../Shared/CommonAccordion';
import Paragraph from './../../Shared/Typography/Paragraph';

const useStyles = makeStyles({
    column: {
        flexBasis: '33.33%'
    },
    doneIconColor: {
        color: '#65B32E'
    },
    removeIconColor: {
        color: '#00303C'
    },
    margin: {
        marginRight: '11px'
    }
});

const getActivityStatus = (activities, classes) => {
    return (
        <>
            {(activities || [])?.map((activity) => (
                <span
                    className={`material-icons ${activity?.earnedStar ? classes.doneIconColor : classes.removeIconColor} ${
                        classes.margin
                    }`}>
                    {activity?.earnedStar ? 'done' : 'remove'}
                </span>
            ))}
        </>
    );
};

const AccordionList = ({ topics }) => {
    const classes = useStyles();

    return (
        <CommonAccordion headings={['Topic', 'Video', 'Activities', '']} expanded>
            {(topics || []).map((topic) => {
                return (
                    <Accordion key={topic?.topic?.teacherTopicName}>
                        <AccordionSummary
                            expandIcon={<ExpandMore className="expand-icon" data-test="expand-topic-accordion-icon" />}>
                            <div className={classes.column}>
                                <Paragraph text={topic?.topic?.teacherTopicName} />
                            </div>

                            <div className={classes.column}>
                                {topic?.watchedVideo ? (
                                    <span className={`material-icons ${classes.doneIconColor}`}>done</span>
                                ) : (
                                    <span className={`material-icons ${classes.removeIconColor}`}>remove</span>
                                )}
                            </div>

                            <div className={classes.column}>{getActivityStatus(topic?.activities, classes)}</div>

                            <div className={classes.column} />
                        </AccordionSummary>

                        <AccordionDetails className="secondary-accordion-details">
                            {(topic?.activities || []).map((activity) =>
                                (activity?.feedbacks || []).map((feedback) => {
                                    return (
                                        <CommonActivityFeedCard
                                            expandAll={false}
                                            feedback={feedback}
                                            customClass={'mt-5'}
                                            activityContentImg={feedback?.photos?.[0]?.filename}
                                            classDate={feedback?.logCreatedAt}
                                            showSideImg={false}
                                            type={getTopicType(topic?.topic?.isReading)}>
                                            {feedback?.logCreatedBy?.firstname ? (
                                                <>
                                                    <b>{`${feedback?.logCreatedBy?.firstname} ${feedback?.logCreatedBy?.lastname}`}</b>{' '}
                                                    added comments/photos to the <b>{`${activity?.activity?.name}`}</b> activity.
                                                </>
                                            ) : (
                                                <>
                                                    <b>{'Another parent'}</b> added comments/photos to the{' '}
                                                    <b>{`${activity?.activity?.name}`}</b> activity.
                                                </>
                                            )}
                                        </CommonActivityFeedCard>
                                    );
                                })
                            )}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </CommonAccordion>
    );
};

AccordionList.propTypes = {
    topics: PropTypes.string,
    pupil: PropTypes.array
};

export default AccordionList;
