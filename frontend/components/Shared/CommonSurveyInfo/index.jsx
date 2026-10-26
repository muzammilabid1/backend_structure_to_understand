/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Heading1 from '../Typography/Heading1';

const CommonSurveyInfo = ({ handleClick }) => {
    return (
        <div className="common-survey-info-container">
            <div className="common-survey-info-image-container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/exclamation_mark.png`} />
            </div>
            <div className="common-survey-info-text">
                <Heading1 text="There’s a survey available." />
                <Heading1 text=" Check it out!" customClass="common-survey-info-link-text" onClick={handleClick} />
            </div>
        </div>
    );
};

CommonSurveyInfo.propTypes = {
    handleClick: PropTypes.func
};

export default CommonSurveyInfo;
