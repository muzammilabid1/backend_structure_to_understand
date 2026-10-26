/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import CommonCard from '../Shared/Cards/CommonCard';
import Heading1 from '../Shared/Typography/Heading1';
import Paragraph from '../Shared/Typography/Paragraph';

const PreviousMathscot = ({ previousMathscotImage }) => {
    if (!previousMathscotImage) return null;

    return (
        <div className="interstitial-new-mathscot">
            <Heading1 text="It’s time for a new mathscot!" centerText />
            <CommonCard>
                <img src={previousMathscotImage} alt={'school logo'} width={244} height={244} />
            </CommonCard>
            <Paragraph
                text="We hope you enjoyed creating your mathscot last year. If your school or setting has assigned topics for your class or group, you will have the opportunity to create another mathscot for this year once you complete an activity. You can view your previous mathscots from the 'Awards' section on your homepage."
                centerText
            />
        </div>
    );
};

PreviousMathscot.propTypes = {
    previousMathscotImage: PropTypes.string
};

export default PreviousMathscot;
