/* eslint-disable @next/next/no-img-element */
import { StarRounded } from '@mui/icons-material';
import Rating from '@mui/material/Rating';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import RatingCheck from '../../Shared/RatingCheck';

const RatingStar = ({
    value,
    setValue,
    defaultValue,
    stars,
    customClass,
    readOnly,
    isDemo,
    starPosition,
    watchedVideo,
    silverStars,
    earnedGoldStar,
    activities
}) => {
    const customIcons = {
        1: {
            icon: (
                <img
                    src={
                        watchedVideo
                            ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/tv_filled_tick.svg`
                            : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/tv_gray.svg`
                    }
                    style={{ fontSize: 47, marginTop: 8, marginRight: 4 }}
                    className={`star-color-TOPIC`}
                />
            )
        },

        2: {
            icon: <StarRounded fontSize="inherit" className={`star-color-TOPIC`} />
        },

        3: {
            icon: <StarRounded fontSize="inherit" className={`star-color-TOPIC`} />
        },

        4: {
            icon: <StarRounded fontSize="inherit" className={`star-color-TOPIC`} />
        },

        5: {
            icon: <StarRounded fontSize="inherit" className={`star-color-TOPIC`} />
        }
    };

    return !(silverStars >= 0) ? (
        <Rating
            name="card-rating"
            value={value}
            size="large"
            classes={{ root: `${customClass ? customClass : 'rating-star'}` }}
            component="legend"
            defaultValue={defaultValue}
            max={stars}
            readOnly={readOnly}
            IconContainerComponent={({ value, ...other }) => (
                <span {...other}>{customIcons[starPosition ? starPosition : value]?.icon}</span>
            )}
            color="primary"
            onChange={(event, newValue) => {
                isDemo ? setValue({ target: { name: 'rating', value: event.target.value } }) : setValue(newValue);
            }}
        />
    ) : (
        !!activities.length && (
            <RatingCheck
                target={earnedGoldStar ? 2 : 0}
                rating={earnedGoldStar ? silverStars + 1 : silverStars}
                silverStars={silverStars}
                earnedGoldStar={earnedGoldStar}
                activities={activities}
            />
        )
    );
};

RatingStar.propTypes = {
    value: PropTypes.number.isRequired,
    setValue: PropTypes.func,
    defaultValue: PropTypes.number,
    stars: PropTypes.number,
    readOnly: PropTypes.bool,
    customClass: PropTypes.string,
    isDemo: PropTypes.bool,
    watchedVideo: PropTypes.bool,
    starPosition: PropTypes.number,
    earnedGoldStar: PropTypes.bool,
    silverStars: PropTypes.number,
    activities: PropTypes.array
};

RatingStar.defaultProps = {
    stars: 5,
    isDemo: false,
    watchedVideo: false
};

export default RatingStar;
