/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const CommonInterstitialHeader = ({ schoolLogo, schoolName, headerText, pupilName }) => {
    return (
        <div className="interstitial-header-container">
            {schoolLogo && (
                <div className="image-container">
                    <img src={schoolLogo} alt="school-logo" />
                </div>
            )}
            <Paragraph text={schoolName} customClass="interstitial-schoolName-text" centerText />
            <Heading1 text={headerText} centerText />
            {pupilName && <Paragraph text={pupilName} centerText />}
        </div>
    );
};

CommonInterstitialHeader.propTypes = {
    schoolLogo: PropTypes.string,
    schoolName: PropTypes.string,
    headerText: PropTypes.string,
    pupilName: PropTypes.string
};

export default CommonInterstitialHeader;
