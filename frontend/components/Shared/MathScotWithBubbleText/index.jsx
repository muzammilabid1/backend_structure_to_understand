/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import SpeechBubbleCard from './../Cards/SpeechBubbleCard';
import Heading1 from './../Typography/Heading1';
import Paragraph from './../Typography/Paragraph';

const MathScotWithBubbleText = ({
    heading,
    subHeading,
    image = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/teacher-img.png`,
    bubbleText,
    headingClass,
    paragraphClass,
    headingText
}) => (
    <div className="mathscot-with-bubble-text">
        {heading && <Heading1 dataTest="mathscot-with-bubble-text-heading" text={heading} centerText customClass={headingClass} />}
        {subHeading && (
            <Paragraph dataTest="mathscot-with-bubble-text-paragraph" text={subHeading} centerText customClass={`mt3 ${paragraphClass}`} />
        )}
        {bubbleText && (
            <div className="preview-topic-img">
                <>
                    <div className="img_container">
                        <img src={image} alt="icon" />
                    </div>
                    <SpeechBubbleCard
                        headingText={headingText}
                        text={bubbleText}
                        textClass="speech-bubble-text"
                        customClass="speech-bubble-class"
                        speechBubbleCustomClass="speech-bubble"
                    />
                </>
            </div>
        )}
    </div>
);

MathScotWithBubbleText.propTypes = {
    heading: PropTypes.string,
    subHeading: PropTypes.string,
    image: PropTypes.string,
    bubbleText: PropTypes.string,
    headingClass: PropTypes.string,
    paragraphClass: PropTypes.string,
    headingText: PropTypes.string
};

export default MathScotWithBubbleText;
