import DOMPurify from 'dompurify';
import PropTypes from 'prop-types';
import React from 'react';

const RenderHtml = ({ className, text, fontSize, dataTest }) => (
    <span
        className={className}
        data-test={dataTest}
        style={{ fontSize: fontSize }}
        dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(text, { ADD_TAGS: ['iframe'] })
        }}
    />
);

RenderHtml.propTypes = { className: PropTypes.string, text: PropTypes.string, fontSize: PropTypes.number, dataTest: PropTypes.string };

export default RenderHtml;
