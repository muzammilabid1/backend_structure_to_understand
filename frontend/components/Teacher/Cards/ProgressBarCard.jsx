import PropTypes from 'prop-types';
import React from 'react';

import CommonDot from './../../Shared/CommonDot';
import CommonPopOver from './../../Shared/CommonPopOver';
import CommonProgressBar from './../../Shared/CommonProgressBar';
import Heading3 from './../../Shared/Typography/Heading3';
import Paragraph from './../../Shared/Typography/Paragraph';

/**
 * ProgressBarCard takes statistics in the format `{ color: hex code including #, count: number }[]` and turns them
 * into an {@link CommonProgressBar},
 */
const ProgressBarCard = ({ heading, subHeading, statistics, footer = [], hover = true, className, showPopper = false }) => {
    return (
        <>
            {(heading || subHeading) && (
                <div className="progress_bar_card_text_header mb8">
                    <div>
                        <Heading3 text={heading} />
                        <Paragraph text={subHeading} />
                    </div>
                </div>
            )}
            <div className="mb6">
                <CommonProgressBar statistics={statistics} showPupil footer={footer} />
            </div>

            {hover ? (
                <div className={`progress_bar_card_text_container ${className}`}>
                    {(footer || []).map((text) => {
                        return !showPopper ? (
                            <div className="progress_bar_card_text_container">
                                <CommonDot color={text.color} />
                                <Paragraph text={text.text} customClass="pb2" />
                            </div>
                        ) : (
                            <CommonPopOver
                                hover
                                key={text.text}
                                text={
                                    <div className="progress_bar_card_text_container">
                                        <CommonDot color={text.color} />
                                        <Paragraph text={text.text} customClass="underline" />
                                    </div>
                                }>
                                <Paragraph text={text?.popOverText ? text?.popOverText : text?.text} />
                                {text?.childName?.map((childName) => (
                                    <div key={childName} className="pt4">
                                        <Paragraph text={childName} />
                                    </div>
                                ))}
                            </CommonPopOver>
                        );
                    })}
                </div>
            ) : (
                <div className="progress_bar_card_text_container_no_hover">
                    {(footer || []).map((text) => {
                        return (
                            <div key={text.text} className="progress_bar_card_text_container_no_hover">
                                <Paragraph text={text.text} />
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

ProgressBarCard.propTypes = {
    statistics: PropTypes.array.isRequired,
    texts: PropTypes.array,
    footer: PropTypes.array,
    heading: PropTypes.string,
    className: PropTypes.string,
    subHeading: PropTypes.string,
    isRegisterPage: PropTypes.bool,
    hover: PropTypes.bool,
    showPopper: PropTypes.bool
};

ProgressBarCard.defaultProps = {
    statistics: [],
    texts: [],
    isRegisterPage: false
};

export default ProgressBarCard;
