import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import LWPButton from '../Button/LWPButton';

const DownloadPDFBtn = ({ url, onClick, color, btnText }) => {
    return (
        <span className="download_PDF_btn">
            <div className="btn_container">
                <Link passHref href={url} target="_blank">
                    <LWPButton btnText={btnText} onClick={onClick} color={color} />
                </Link>
            </div>
        </span>
    );
};

DownloadPDFBtn.propTypes = {
    url: PropTypes.string,
    btnText: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired
};

DownloadPDFBtn.defaultProps = {
    btnText: 'Printable version (PDF)',
    color: 'primary',
    onClick: () => {}
};

export default DownloadPDFBtn;
