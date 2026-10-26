import PropTypes from 'prop-types';
import React from 'react';

import RenderHtml from '../CommonRenderHtml';
import Heading1 from './../Typography/Heading1';
import Heading2 from './../Typography/Heading2';
import Heading3 from './../Typography/Heading3';
import Paragraph from './../Typography/Paragraph';

const NameValue = ({ primaryText, secondaryText, customClass, headingClass, h2, h3, h1 }) => {
    return (
        <div className={customClass ? customClass : ''}>
            {h1 ? (
                <Heading1 customClass={headingClass} text={primaryText} />
            ) : h2 ? (
                <Heading2 customClass={headingClass} text={primaryText} />
            ) : h3 ? (
                <Heading3 customClass={headingClass} text={primaryText} />
            ) : (
                <Paragraph customClass={headingClass} text={primaryText} />
            )}
            <RenderHtml text={secondaryText} />
        </div>
    );
};

NameValue.propTypes = {
    customClass: PropTypes.string,
    primaryText: PropTypes.string.isRequired,
    secondaryText: PropTypes.string.isRequired,
    headingClass: PropTypes.string,
    h2: PropTypes.bool,
    h3: PropTypes.bool,
    h1: PropTypes.bool
};

export default NameValue;
