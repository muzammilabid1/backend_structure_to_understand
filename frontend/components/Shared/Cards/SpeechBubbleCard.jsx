/* eslint-disable @next/next/no-img-element */
import { useMediaQuery, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import ReadMore from '../ReadMore';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const SpeechBubbleCard = ({ text, centerText, textClass, headingText, customClass, speechBubbleCustomClass }) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <div className={customClass ? customClass : 'speech-bubble-card-container'}>
            <div className={speechBubbleCustomClass ? `speech-bubble ${speechBubbleCustomClass}` : 'speech-bubble'}>
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/speech-bubble-arrow.svg`} />

                {headingText && <Heading3 text={headingText} />}
                {!smbp ? (
                    <Paragraph dataTest="speech-bubble-card-paragraph" text={text} centerText={centerText} customClass={textClass} />
                ) : (
                    <ReadMore
                        text={text}
                        slice={60}
                        showLess={false}
                        readMoreText="Click to read more"
                        lineBreak={true}
                        className={textClass}
                    />
                )}
            </div>
        </div>
    );
};

SpeechBubbleCard.propTypes = {
    text: PropTypes.string.isRequired,
    textClass: PropTypes.string,
    centerText: PropTypes.bool,
    customClass: PropTypes.string,
    speechBubbleCustomClass: PropTypes.string,
    headingText: PropTypes.string
};

export default SpeechBubbleCard;
