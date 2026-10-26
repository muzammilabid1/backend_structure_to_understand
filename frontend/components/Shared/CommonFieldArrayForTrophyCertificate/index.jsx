import { Divider, Grid, Paper } from '@mui/material';
import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React from 'react';

import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import CommonSelectField from '../CommonSelectField';
import InputField from '../InputField/InputField';
import Heading3 from '../Typography/Heading3';

const CommonFieldArrayForTrophyCertificate = ({ values, handleChange, handleBlur, errors }) => {
    const getTrophyCertificateFieldDataOptions = () => {
        const options = sharedJson?.trophy_certificate_fieldData_types?.filter(
            (field) => !values?.fieldData?.some((fD) => fD?.fieldName === field?.key)
        );

        return options;
    };

    return (
        <FieldArray name="fieldData">
            {({ remove, push }) => (
                <div className="fieldData-field-array">
                    {getTrophyCertificateFieldDataOptions().length > 0 && (
                        <>
                            <Divider customClass="fieldData-divider" />
                            <div className="add-fieldData-dropdown">
                                <CommonSelectField
                                    md={6}
                                    lg={6}
                                    displayEmpty
                                    shrink
                                    touched={true}
                                    error={values?.fieldData?.length === 0 && 'Select Field Data'}
                                    value={values.addFieldDataType}
                                    label="Add Field Data"
                                    options={getTrophyCertificateFieldDataOptions()}
                                    onChange={(e) => {
                                        handleChange({
                                            target: { name: 'addFieldDataType', value: e.target.value }
                                        });
                                    }}
                                    onBlur={(e) =>
                                        handleBlur({
                                            target: { name: 'addFieldDataType', value: e.target.value }
                                        })
                                    }
                                />
                                <LWPButton
                                    btnText="Add Field Data"
                                    onClick={() =>
                                        push({
                                            xValue: null,
                                            yValue: null,
                                            fontSize: null,
                                            fieldName: values.addFieldDataType
                                        })
                                    }
                                />
                            </div>
                        </>
                    )}

                    {values?.fieldData?.length > 0 && <Divider customClass="fieldData-divider" />}

                    {values?.fieldData?.length > 0 &&
                        values?.fieldData?.map((field, index) => {
                            return (
                                <Paper className="fieldData-card" key={index}>
                                    <Heading3 customClass="field-card-heading" text={`${field?.fieldName}`} />
                                    {field.fieldName === 'childName' && (
                                        <>
                                            <Grid spacing={2} container>
                                                <InputField
                                                    name={`fieldData.${index}.xValue`}
                                                    value={field?.['xValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.xValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="X Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.yValue`}
                                                    value={field?.['yValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.yValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Y Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.fontSize`}
                                                    value={field?.['fontSize']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.fontSize}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Font Size"
                                                    md={6}
                                                    lg={6}
                                                />
                                            </Grid>
                                            <LWPButton customClass="field-remove-btn" btnText="Remove" onClick={() => remove(index)} />
                                        </>
                                    )}
                                    {field.fieldName === 'date' && (
                                        <>
                                            <Grid spacing={2} container>
                                                <InputField
                                                    name={`fieldData.${index}.xValue`}
                                                    value={field?.['xValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.xValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="X Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.yValue`}
                                                    value={field?.['yValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.yValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Y Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.fontSize`}
                                                    value={field?.['fontSize']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.fontSize}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Font Size"
                                                    md={6}
                                                    lg={6}
                                                />
                                            </Grid>
                                            <LWPButton customClass="field-remove-btn" btnText="Remove" onClick={() => remove(index)} />
                                        </>
                                    )}
                                    {field.fieldName === 'totalStars' && (
                                        <>
                                            <Grid spacing={2} container>
                                                <InputField
                                                    name={`fieldData.${index}.xValue`}
                                                    value={field?.['xValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.xValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="X Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.yValue`}
                                                    value={field?.['yValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.yValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Y Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.fontSize`}
                                                    value={field?.['fontSize']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.fontSize}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Font Size"
                                                    md={6}
                                                    lg={6}
                                                />
                                            </Grid>
                                            <LWPButton customClass="field-remove-btn" btnText="Remove" onClick={() => remove(index)} />
                                        </>
                                    )}
                                    {field.fieldName === 'teacherName' && (
                                        <>
                                            <Grid spacing={2} container>
                                                <InputField
                                                    name={`fieldData.${index}.xValue`}
                                                    value={field?.['xValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.xValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="X Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.yValue`}
                                                    value={field?.['yValue']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.yValue}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Y Value"
                                                    md={6}
                                                    lg={6}
                                                />
                                                <InputField
                                                    name={`fieldData.${index}.fontSize`}
                                                    value={field?.['fontSize']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors?.fieldData?.[index]?.fontSize}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    touched={true}
                                                    label="Font Size"
                                                    md={6}
                                                    lg={6}
                                                />
                                            </Grid>
                                            <LWPButton customClass="field-remove-btn" btnText="Remove" onClick={() => remove(index)} />
                                        </>
                                    )}
                                </Paper>
                            );
                        })}
                </div>
            )}
        </FieldArray>
    );
};

CommonFieldArrayForTrophyCertificate.propTypes = {
    values: PropTypes.array.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    errors: PropTypes.object
};

export default CommonFieldArrayForTrophyCertificate;
