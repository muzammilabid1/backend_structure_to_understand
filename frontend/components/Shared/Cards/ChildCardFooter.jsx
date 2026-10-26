/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';

const ChildCardFooter = ({ primaryText, dateText, taskText, activeLeftBorder, activeTopBorder, leftBorderColor, rightBorderColor }) => {
    return (
        <div className="child-card-footer-contanier">
            {activeLeftBorder ? <div className="active-left-border" style={{ borderColor: leftBorderColor ? leftBorderColor : '' }} /> : ''}
            {activeTopBorder ? <div className="active-top-border" style={{ borderColor: rightBorderColor ? rightBorderColor : '' }} /> : ''}
            <div className="footer-contant">
                <p className="primary-text truncate_local" data-test='child-card-footer-primary-content' >{primaryText}</p>

                {taskText ? <p className="task-text">{taskText}</p> : ''}
                {dateText ? <p className="date-text">{dateText}</p> : ''}
            </div>
            <img
                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/RightArrow.svg`}
                alt="Right arrow icon"
                className="right-icon"
            />
        </div>
    );
};

ChildCardFooter.propTypes = {
    primaryText: PropTypes.string.isRequired,
    activeLeftBorder: PropTypes.bool,
    activeTopBorder: PropTypes.bool,
    dateText: PropTypes.string,
    taskText: PropTypes.string,
    leftBorderColor: PropTypes.string,
    rightBorderColor: PropTypes.string
};

export default ChildCardFooter;
