/* eslint-disable @next/next/no-img-element */
import { Card, CardContent, Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from './../../../shared/Constant';
import ProgressBar from './../../Shared/Loaders/ProgressBar';
import Heading3 from './../../Shared/Typography/Heading3';
import Paragraph from './../../Shared/Typography/Paragraph';

const ProgressCard = ({ totalActivity, doneActivity, activeBorder }) => {
    return (
        <Grid xs={12} item>
            <Card classes={{ root: 'progress-card-container' }} style={{ borderTop: activeBorder ? '8px solid #f28d00' : '' }}>
                <CardContent>
                    <div className="activity-content-section">
                        <Heading3 text="This week’s goal" />
                        <Paragraph text={`Finish ${totalActivity} activities`} />
                    </div>
                    <ProgressBar />
                    <div className="activity-goal-section">
                        <Paragraph text={`You’ve done ${doneActivity} activities this week`} />
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/goal.png`}
                            alt="Goal icon"
                            className="ml5"
                        />
                    </div>
                </CardContent>
            </Card>
        </Grid>
    );
};

ProgressCard.propTypes = {
    totalActivity: PropTypes.number.isRequired,
    doneActivity: PropTypes.number.isRequired,
    activeBorder: PropTypes.bool.isRequired
};

export default ProgressCard;
