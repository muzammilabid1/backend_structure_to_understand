/* eslint-disable @next/next/no-img-element */
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import CommonCheckBox from './../Shared/CommonCheckBox';
import InputField from './../Shared/InputField/InputField';
import Heading3 from './../Shared/Typography/Heading3';
import Paragraph from './../Shared/Typography/Paragraph';

const ActivityDescription = ({ values, errors, touched, handleChange, handleBlur }) => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <div className="activity-description">
            <aside className="activity-description-left-sec">
                <Heading3 text="Describe your activity" customClass="pb3" />
                <InputField
                    error={errors.description}
                    touched={touched.description}
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    name="description"
                    multiline
                    rows={8}
                    lg={12}
                    md={12}
                    label="What did you do? What did you learn?"
                    helperText={<span className="helper-text">e.g. &quot;We played shopkeeper and counted out our change.&quot;</span>}
                    textareaBackgroundImage={`${
                        matches
                            ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/parent-child-high-five.png`
                            : ''
                    }`}
                />
                <Paragraph text="Which subjects was this activity about?" customClass="pt8 pb4" />

                <div className="pb2">
                    <CommonCheckBox
                        name="isOther"
                        label="Other"
                        // classes={{ root: 'checkbox-container' }}
                        onClick={() => {
                            handleChange({ target: { name: 'isOther', value: !values.isOther } });
                        }}
                    />
                </div>
            </aside>
            <aside className="activity-description-right-sec">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/parent-child-high-five.png`}
                    alt=""
                    className="side-image"
                />
            </aside>
        </div>
    );
};

ActivityDescription.propTypes = {
    values: PropTypes.object,
    errors: PropTypes.object,
    touched: PropTypes.bool,
    handleChange: PropTypes.func,
    handleBlur: PropTypes.func
};

export default ActivityDescription;
