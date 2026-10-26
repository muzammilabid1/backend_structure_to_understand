import React from 'react';

import InputField from '../../../Shared/InputField/InputField';
import { EditEmailTemplateFormProps } from '.';
import ParameterInfo from './ParameterInfo';

const IsNotifications = ({ values, handleChange, handleBlur, errors, touched, notificationEmailType }: EditEmailTemplateFormProps) => {
    return (
        <div>
            <ParameterInfo type={notificationEmailType} />

            <br />
            <InputField
                name="notificationTitle"
                value={values.notificationTitle}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.notificationTitle}
                touched={touched.notificationTitle}
                label="Notification title"
                type="text"
                helperText="The optimal title length is around 25-50 characters and the maximum limit is 65 characters"
            />

            <InputField
                label="Notification description"
                name="notificationDescription"
                value={values.notificationDescription}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.notificationDescription}
                touched={touched.notificationDescription}
                type="text"
                multiline
                rows={3}
                helperText="The optimal description length for description is up to 150 characters"
            />

            <InputField
                name="notificationUrl"
                value={values.notificationUrl}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.notificationUrl}
                touched={touched.notificationUrl}
                label="Notification URL"
                type="text"
            />
        </div>
    );
};

export default IsNotifications;
