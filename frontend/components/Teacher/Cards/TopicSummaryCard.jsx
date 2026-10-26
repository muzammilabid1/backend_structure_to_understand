import { Card, CardActions, CardContent, Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { showDate } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import Divider from './../../Shared/Divider';
import HtmlTooltip from './../../Shared/HtmlTooltip';
import Paragraph from './../../Shared/Typography/Paragraph';

const TopicSummaryCard = ({ previewHandler, selectHandler, name, yearGroup, teacherDescription, subject, classTopic, type }) => {
    return (
        <Grid item xs={12} sm={12} md={6} lg={4} classes={{ root: 'grid-card' }}>
            <Card
                className={`border-top-${type}`}
                classes={{ root: 'topic-summary-card-container' }}
                style={{ background: `${classTopic?.releaseDate ? '#F5F5F5' : ''}` }}>
                <CardContent classes={{ root: 'topic-summary-content-section' }}>
                    <HtmlTooltip title={name}>
                        <h3 data-test="topic-summary-card-topic-name" className={`heading-three typography-text truncate_local`}>
                            {name}
                        </h3>
                    </HtmlTooltip>
                    <Paragraph text={yearGroup && `${yearGroup} · ${subject}`} />
                    <div className={'topic-summary-discriptions'}>
                        <Paragraph text={teacherDescription} />
                    </div>
                    <Divider />
                </CardContent>
                <CardActions>
                    <div className="topic-summary-btn-container">
                        <LWPButton
                            btnText="Select topic"
                            variant="text"
                            onClick={selectHandler}
                            customClass="topic-summary-btn"
                            color="inherit"
                            dataTest={'topic-summary-card-select-topic-btn'}
                        />
                        <LWPButton
                            btnText="Preview"
                            variant="text"
                            onClick={previewHandler}
                            customClass="topic-summary-btn"
                            color="inherit"
                        />
                    </div>
                    {classTopic?.releaseDate && (
                        <Paragraph
                            customClass="previously_text"
                            text={`Previously set on ${showDate({ date: classTopic?.releaseDate, short: true })}`}
                        />
                    )}
                </CardActions>
            </Card>
        </Grid>
    );
};

TopicSummaryCard.propTypes = {
    previewHandler: PropTypes.func.isRequired,
    selectHandler: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    yearGroup: PropTypes.object.isRequired,
    teacherDescription: PropTypes.string.isRequired,
    subject: PropTypes.string,
    type: PropTypes.string,
    classTopic: PropTypes.object
};

export default TopicSummaryCard;
