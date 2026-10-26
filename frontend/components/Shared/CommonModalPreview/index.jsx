import PropTypes from 'prop-types';
import React from 'react';

import CommonActivityStepPreview from '../CommonActivityStepPreview';

const CommonModalPreview = ({ modal }) => {
    return (
        // <div className="activity-page-container">
        // <div className={`activity-page-card`} style={{ pointerEvents: readOnly ? 'none' : '' }}>
        <div>
            <CommonActivityStepPreview steps={modal?.steps?.legacySteps} />
        </div>
        // </div>
    );
};

CommonModalPreview.propTypes = { modal: PropTypes.object };

export default CommonModalPreview;
