/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

const TextAndImageActivity = ({ children, image, alt }) => (
    <>
        {children && <p className="activity-question">{children}</p>}
        {image && (
            <span className="img-container">
                <img src={image} className="activity-image" alt={alt} />
            </span>
        )}
    </>
);

TextAndImageActivity.propTypes = {
    image: PropTypes.string,
    alt: PropTypes.string,
    children: PropTypes.element
};
TextAndImageActivity.defaultProps = {
    type: 'general',
    alt: 'Activity image'
};

export default TextAndImageActivity;
