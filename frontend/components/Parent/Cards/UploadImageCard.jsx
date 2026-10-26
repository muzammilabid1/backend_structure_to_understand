import PropTypes from 'prop-types';
import React from 'react';

import UploadFile from '../UploadFile';
import CommonError from './../../Shared/CommonError';
import Heading3 from './../../Shared/Typography/Heading3';
import Paragraph from './../../Shared/Typography/Paragraph';

const UploadImageCard = ({
    customClass,
    type,
    setFileName,
    previewImage,
    onClose,
    onSave,
    child_name,
    error,
    touched,
    disabled,
    skipPresignedUrl
}) => {
    return (
        <div className={`upload-img-conatiner ${customClass} ${type}-bg`}>
            <aside className="upload-img-left-content">
                <Heading3 text="Upload a photo" />
                <Paragraph text={`Do you want to upload a photo of you and ${child_name} playing this activity together?`} />
            </aside>
            <aside className="upload-img-right-content">
                <UploadFile
                    feedbackType="ACTIVITY"
                    disabled={disabled}
                    onSave={onSave}
                    previewImage={previewImage}
                    onClose={onClose}
                    setFileName={setFileName}
                    skipPresignedUrl={skipPresignedUrl}
                />
                <CommonError error={error} touched={touched} />
            </aside>
        </div>
    );
};

UploadImageCard.propTypes = {
    customClass: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string,
    setFileName: PropTypes.string,
    previewImage: PropTypes.string,
    onClose: PropTypes.func,
    onSave: PropTypes.func,
    child_name: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    disabled: PropTypes.bool,
    skipPresignedUrl: PropTypes.bool
};
UploadImageCard.defaultProps = {
    type: 'general'
};

export default UploadImageCard;
