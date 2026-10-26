/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from './../../Shared/Divider';
import Paragraph from './../../Shared/Typography/Paragraph';

const HistoryCard = ({ title, date, type, starIcon, onClick }) => {
    return (
        <>
            <div className={`${type}-border history-card-container`} onClick={onClick}>
                <span>
                    <Paragraph text={title} customClass="topic-class" />
                    <p className="date-time">{date}</p>
                </span>
                {starIcon && (
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/star.png`}
                        alt="Star icon"
                        className="svg-icon"
                    />
                )}
            </div>
            <Divider />
        </>
    );
};

HistoryCard.propTypes = {
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    starIcon: PropTypes.bool,
    type: PropTypes.string,
    onClick: PropTypes.func
};
HistoryCard.defaultProps = {
    title: 'You completed an activity in this topic',
    date: 'Monday 12 June',
    type: 'OTHER'
};

export default HistoryCard;
