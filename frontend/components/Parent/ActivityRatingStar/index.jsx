import { StarBorderRounded, StarRounded } from '@mui/icons-material';
import { Rating } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

const ActivityRatingStar = ({ value, setValue, defaultValue, stars, customClass, readOnly, isDemo, dataTest }) => {
    return (
        <Rating
            name="card-rating"
            data-test={dataTest}
            value={value}
            size="large"
            classes={{ root: `${customClass ? customClass : 'rating-star'}` }}
            component="legend"
            defaultValue={defaultValue}
            max={stars}
            readOnly={readOnly}
            emptyIcon={<StarBorderRounded fontSize="inherit" className={`star-color-TOPIC`} />}
            icon={<StarRounded fontSize="inherit" className={`star-color-TOPIC`} />}
            color="primary"
            onChange={(event, newValue) => {
                isDemo ? setValue({ target: { name: 'rating', value: event.target.value } }) : setValue(newValue);
            }}
        />
    );
};

ActivityRatingStar.propTypes = {
    value: PropTypes.number.isRequired,
    setValue: PropTypes.func,
    defaultValue: PropTypes.number,
    stars: PropTypes.number,
    readOnly: PropTypes.bool,
    isDemo: PropTypes.bool,
    customClass: PropTypes.string,
    dataTest: PropTypes.string
};
ActivityRatingStar.defaultProps = {
    stars: 5,
    isDemo: false
};

export default ActivityRatingStar;
