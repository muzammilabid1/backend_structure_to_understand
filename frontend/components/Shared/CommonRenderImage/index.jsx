/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

const CommonRenderImage = ({ isSharingAllowed, src, alt = '...', className }) => {
    return src ? (
        <div className={`common_rander_image_container ${className}`} data-test='common-render-image-container' data-hj-suppress>
            <img src={src} alt={alt} />
            {isSharingAllowed && (
                <Link passHref href={src}>
                    <span className="material-icons">get_app</span>
                </Link>
            )}
        </div>
    ) : (
        ''
    );
};

CommonRenderImage.propTypes = {
    className: PropTypes.string,
    src: PropTypes.string,
    alt: PropTypes.string,
    isSharingAllowed: PropTypes.bool
};

export default CommonRenderImage;
