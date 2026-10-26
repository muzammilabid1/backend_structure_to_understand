import PropTypes from 'prop-types';
import { useContext } from 'react';

import { MINIO_PUBLIC_PATHS, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import Heading2 from '../Typography/Heading2';
import Paragraph from '../Typography/Paragraph';
import TextAndImageActivity from '../TextAndImageActivity';

const CommonSetByTeacherStepPreview = ({ step, mediaUrl, parentMessage, readOnly }) => {
    const { token } = useContext(ThemeContext);

    return (
        <div className="set-by-teacher-step-preview" data-test="set-by-teacher-step-preview">
            {step?.setByTeacherData?.heading && <Heading2 text={step.setByTeacherData.heading} />}
            {parentMessage && <Paragraph text={parentMessage} dataTest="set-by-teacher-parent-message" />}
            {/* Audio type support (step?.setByTeacherData?.type === 'AUDIO') will be handled in a later version of this feature */}
            {mediaUrl && <TextAndImageActivity image={mediaUrl} />}
            {!mediaUrl && readOnly && (
                <span className="img-container">
                    <div className="set-by-teacher-step-preview__placeholder">
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/image-placeholder-icon.svg`}
                            alt="Image placeholder"
                        />
                        {token?.userType === TEACHER && <p>Your uploaded picture will show here</p>}
                    </div>
                </span>
            )}
        </div>
    );
};

CommonSetByTeacherStepPreview.propTypes = {
    step: PropTypes.object.isRequired,
    mediaUrl: PropTypes.string,
    parentMessage: PropTypes.string,
    readOnly: PropTypes.bool
};

export default CommonSetByTeacherStepPreview;
