import PropTypes from 'prop-types';
import React, { useState } from 'react';

const ReadMore = ({
    text,
    slice = 150,
    showLess = true,
    readMoreText = 'Read more...',
    lineBreak = false,
    showSpread = true,
    className,
    showLessText = ' ...show less'
}) => {
    const [isReadMore, setIsReadMore] = useState(true);
    const toggleReadMore = () => {
        setIsReadMore(!isReadMore);
    };

    return (
        <p className={`common-read-more ${className}`}>
            {isReadMore ? `${text.slice(0, slice)} ${text.length > slice ? (showSpread ? '...' : '') : ''}` : text}
            {lineBreak
                ? text.length > slice && (
                      <p onClick={toggleReadMore} style={{ marginTop: 8 }}>
                          <span>{isReadMore ? ` ${readMoreText} ` : showLess ? showLessText : ''}</span>
                      </p>
                  )
                : text.length > slice && (
                      <span onClick={toggleReadMore}>{isReadMore ? ` ${readMoreText} ` : showLess ? showLessText : ''}</span>
                  )}
        </p>
    );
};

ReadMore.propTypes = {
    text: PropTypes.string,
    className: PropTypes.string,
    showLessText: PropTypes.string,
    readMoreText: PropTypes.string,
    slice: PropTypes.number,
    showLess: PropTypes.bool,
    lineBreak: PropTypes.bool,
    showSpread: PropTypes.bool,
    isRead: PropTypes.bool
};

export default ReadMore;
