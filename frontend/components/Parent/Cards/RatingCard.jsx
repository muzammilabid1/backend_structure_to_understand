import { Card, CardContent, Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import ActivityRatingStar from '../ActivityRatingStar';
import RatingStar from '../RatingStar';
import Heading3 from './../../Shared/Typography/Heading3';

const RatingCard = ({ value, setValue, title, isDemo, isActivity, dataTest }) => {
    return (
        <Grid xs={12} item className={`rating-card-container `}>
            <Card classes={{ root: 'rating-card' }}>
                <CardContent>
                    <Heading3 text={title} customClass="pb2" />
                    {isActivity ? (
                        <ActivityRatingStar value={value} setValue={setValue} isDemo={isDemo} dataTest={dataTest} />
                    ) : (
                        <RatingStar value={value} setValue={setValue} starPosition={2} isDemo={isDemo} />
                    )}
                </CardContent>
            </Card>
        </Grid>
    );
};

RatingCard.propTypes = {
    setValue: PropTypes.func.isRequired,
    value: PropTypes.number.isRequired,
    title: PropTypes.string,
    isDemo: PropTypes.bool,
    isActivity: PropTypes.bool,
    dataTest: PropTypes.string
};

RatingCard.defaultProps = {
    title: 'Did you enjoy the activity?',
    isActivity: false
};

export default RatingCard;
