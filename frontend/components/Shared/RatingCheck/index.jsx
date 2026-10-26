/* eslint-disable @next/next/no-img-element */
import { range } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';

const RatingCheck = ({ target, rating, earnedGoldStar, silverStars, activities }) => {
    if (silverStars === 0 && earnedGoldStar) {
        return (
            <div className="rating_check_container">
                <span className={`material-icons icon`}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_check_star.svg`}
                        alt="gold_star"
                    />
                </span>
            </div>
        );
    }

    return (
        <div className="rating_check_container">
            {silverStars === 0 && !earnedGoldStar && !!activities?.length && (
                <>
                    <span className={`material-icons icon`}>
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/tv_lock.svg`}
                            alt="gold_star"
                        />
                    </span>
                    <span className={`material-icons icon`}>
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_uncheck_star.svg`}
                            alt="gold_star"
                        />
                    </span>
                    {range(activities?.length - 1).map(() => {
                        return (
                            <span className={`material-icons icon`}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/uncheck_star.svg`}
                                    alt="checkbox"
                                />
                            </span>
                        );
                    })}
                </>
            )}

            {range(target).map((_, index) => {
                return (
                    <span className={`material-icons icon ${index === target - 1 ? 'star' : ''}`}>
                        {index === target - 1 ? (
                            <img
                                src={
                                    rating >= target
                                        ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_check_star.svg`
                                        : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_uncheck_star.svg`
                                }
                                alt="gold_star"
                            />
                        ) : rating <= +index ? (
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/uncheck_star.svg`}
                                alt="unchecked_box"
                            />
                        ) : (
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/check_star.svg`}
                                alt="checkbox"
                            />
                        )}
                    </span>
                );
            })}

            {range(target < rating ? target - rating : 0).map(() => {
                return (
                    <span className={`material-icons icon`}>
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/check_star.svg`}
                            alt="checkbox"
                        />
                    </span>
                );
            })}

            {silverStars === 1 && !earnedGoldStar && !!activities?.length && (
                <span className={`material-icons icon`}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_uncheck_star.svg`}
                        alt="gold_star"
                    />
                </span>
            )}

            {!!silverStars && !!activities?.length && (
                <>
                    {range(activities?.length - silverStars > 0 ? activities?.length - silverStars : 0).map(() => {
                        return (
                            <span className={`material-icons icon`}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/uncheck_star.svg`}
                                    alt="checkbox"
                                />
                            </span>
                        );
                    })}
                </>
            )}
        </div>
    );
};

RatingCheck.defaultProps = {
    rating: 0,
    target: 5,
    earnedGoldStar: false
};

RatingCheck.propTypes = {
    rating: PropTypes.oneOfType[(PropTypes.string, PropTypes.number).isRequired],
    target: PropTypes.oneOfType[(PropTypes.string, PropTypes.number).isRequired],
    earnedGoldStar: PropTypes.bool,
    silverStars: PropTypes.number,
    activities: PropTypes.array
};

export default RatingCheck;
