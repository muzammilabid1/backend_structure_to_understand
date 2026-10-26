import PropTypes from 'prop-types';
import React from 'react';

import DownloadPDFBtn from '../DownloadPDFBtn';

const DownloadAlphabetsPDF = ({ array, url, onClick, textTransform, fontFamily }) => {
    return (
        <div className="download_alphabets_PDF">
            {(array || []).map((item) => {
                return (
                    <span style={{ fontFamily, textTransform }} className="text_span">
                        {item?.text}
                    </span>
                );
            })}

            <div className="btn_container">
                <DownloadPDFBtn url={url} onClick={onClick} />
            </div>
        </div>
    );
};

DownloadAlphabetsPDF.propTypes = {
    array: PropTypes.array,
    onClick: PropTypes.func,
    url: PropTypes.string,
    textTransform: PropTypes.string,
    fontFamily: PropTypes.string
};

DownloadAlphabetsPDF.defaultProps = {
    url: '/assets/pdf-files/LetterFormation.pdf'
};

export default DownloadAlphabetsPDF;
