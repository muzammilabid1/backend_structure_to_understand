import { Grid } from '@mui/material';
import { SetByTeacherDataType } from 'lwp-shared';
import React from 'react';

import InputField from '../InputField/InputField';

interface SetByTeacherData {
    heading: string;
    subHeading: string;
    type: SetByTeacherDataType;
}

interface Step {
    setByTeacherData?: SetByTeacherData;
}

interface CommonSetByTeacherStepProps {
    step: Step;
    handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    handleBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    name: string;
}

const CommonSetByTeacherStep = ({ step, handleChange, handleBlur, name }: CommonSetByTeacherStepProps) => {
    return (
        <Grid sx={{ width: '100%' }}>
            <InputField
                name={`${name}.heading`}
                value={step?.setByTeacherData?.heading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!step?.setByTeacherData?.heading && 'This field is required.'}
                touched={true}
                label="Heading"
                md={12}
                lg={12}
            />
            <InputField
                name={`${name}.subHeading`}
                value={step?.setByTeacherData?.subHeading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!step?.setByTeacherData?.subHeading && 'This field is required.'}
                touched={true}
                label="Sub heading"
                md={12}
                lg={12}
            />
        </Grid>
    );
};

export default CommonSetByTeacherStep;
