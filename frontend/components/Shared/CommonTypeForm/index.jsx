import { Widget } from '@typeform/embed-react';
import PropTypes from 'prop-types';
import React from 'react';

const CommonTypeForm = ({ formId, onSubmit, hiddenFields }) => {
    return (
        <div className="feedback_widget-section">
            <Widget hidden={hiddenFields} onSubmit={onSubmit} id={formId} className="feedback-form" />
        </div>
    );
};

CommonTypeForm.propTypes = {
    formId: PropTypes.string.isRequired,
    hiddenFields: PropTypes.object.isRequired,
    onSubmit: PropTypes.func
};

export default CommonTypeForm;
