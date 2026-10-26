import React from 'react';

import InputField from '../../../Shared/InputField/InputField';
import { EditEmailTemplateFormProps } from '.';
import ParameterInfo from './ParameterInfo';

const IsSms = ({ values, handleChange, handleBlur, errors, touched, notificationEmailType }: EditEmailTemplateFormProps) => {
    return (
        <div>
            <ParameterInfo type={notificationEmailType} preference="sms" />

            <br />
            <InputField
                label="SMS content"
                name="smsContent"
                value={values.smsContent}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.smsContent}
                touched={touched.smsContent}
                type="text"
                multiline
                rows={3}
                inputProps={{
                    style: { resize: 'both' }
                }}
            />
        </div>
    );
};

export default IsSms;
