/* eslint-disable @next/next/no-img-element */
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Card, CardContent, CardMedia, Grid } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getCardBackgroundImageName, getTopicType } from '../../../shared/Services/handler';
import Heading1 from './../../Shared/Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';

const ActivityFeedCard = ({
    activityImg,
    classTitle,
    classDate,
    children,
    type,
    parentComment,
    childComment,
    activityContentImg,
    index
}) => {
    const [like, setLike] = useState(false);

    const [activeAccordians, setActiveAccordians] = useState({
        index: null,
        active: true
    });

    return (
        <Grid item xs={12} classes={{ root: 'grid-card' }}>
            <Card classes={{ root: 'activity-feed-container active-border' }}>
                <Accordion
                    expanded={index === activeAccordians.index ? activeAccordians.active : true}
                    onClick={(event) => {
                        event.stopPropagation();
                        setActiveAccordians({
                            index,
                            active: !activeAccordians.active
                        });
                    }}
                    className="activity-feed-accordion">
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon className="expand-icon" />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                        className="activity-feed-accordion-summary">
                        <div className="activity-feed-header-section" onClick={(event) => event.stopPropagation()}>
                            <div className="activity-feed-title-section">
                                <CardMedia image={activityImg} classes={{ root: 'side-img' }} />
                                <CardContent classes={{ root: 'activity-feed-content' }}>
                                    {children}

                                    <Paragraph text={`${classTitle} · ${classDate}`} customClass="activity-feed-paragraph" />
                                </CardContent>
                            </div>

                            <img
                                src={
                                    like
                                        ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/like.png`
                                        : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/un-like.png`
                                }
                                alt="Like"
                                className="like-icon"
                                onClick={() => setLike(!like)}
                            />
                        </div>
                    </AccordionSummary>
                    <AccordionDetails className="activity-feed-accordion-details" onClick={(event) => event.stopPropagation()}>
                        {parentComment || childComment ? (
                            <CardMedia
                                classes={{
                                    root: `${getTopicType(type)}-bg-ligth activity-feed-comment-bg`
                                }}
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${getCardBackgroundImageName(
                                    type
                                )}.png`}>
                                <CardContent classes={{ root: 'activity-feed-comment-section' }}>
                                    {activityContentImg ? <img src={activityContentImg} alt="acitity img" className="activity-img" /> : ''}
                                    {parentComment ? (
                                        <div className="family-comment">
                                            <Paragraph text="Family comment:" customClass="comment-heading" />
                                            <Heading1 text={parentComment} customClass="comment-text" />
                                        </div>
                                    ) : (
                                        ''
                                    )}
                                    {childComment ? (
                                        <div className="child-comment">
                                            <Paragraph text="Child comment:" customClass="comment-heading" />
                                            <Heading1 text={childComment} customClass="comment-text" />
                                        </div>
                                    ) : (
                                        ''
                                    )}
                                </CardContent>
                            </CardMedia>
                        ) : (
                            ''
                        )}
                    </AccordionDetails>
                </Accordion>
            </Card>
        </Grid>
    );
};

ActivityFeedCard.propTypes = {
    activityImg: PropTypes.string,
    classTitle: PropTypes.string,
    classDate: PropTypes.string,
    children: PropTypes.element,
    activityContentImg: PropTypes.string,
    parentComment: PropTypes.string,
    childComment: PropTypes.string,
    type: PropTypes.string,
    index: PropTypes.number
};
ActivityFeedCard.defaultProps = {
    activityImg: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`,
    classTitle: 'Class Name',
    classDate: 'Tuesday 28 July',
    type: 'general',
    children: (
        <p className="mb2">
            <strong>Miriam Cooper</strong> did the <strong>Counting</strong> activity in the <strong>Multiples of ten</strong> topic
        </p>
    )
};
export default ActivityFeedCard;
