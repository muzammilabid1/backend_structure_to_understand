import { useMutation, useQuery } from '@apollo/client';
import { Autocomplete, CircularProgress, Grid, TextField } from '@mui/material';
import { FieldArray, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { addActivity } from '../../../graphQl/mutations';
import { getModalsForActivitySteps, getTopicActivitiesForAdmin } from '../../../graphQl/queries';
import formInitialStates from '../../../shared/formInitialStates';
import sharedJson from '../../../shared/json/index.json';
import {
    _getBase64ToFile,
    _removeWhiteSpace,
    generateFileName,
    generateHTMLStringForActivityErrors,
    isValid,
    PreSubmitStepWork,
    ThemeContext
} from '../../../shared/Services/handler';
import { addActivityFromAdminValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonFileUpload from '../CommonFileUpload';
import RenderHtml from '../CommonRenderHtml';
import CommonSelectField from '../CommonSelectField';
import CommonSnackbar from '../CommonSnackbar';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';
import CommonFieldArrayForActivitySteps from './../CommonFieldArrayForActivitySteps';

const AddActivityModal = ({ open, setOpen, topic_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [errorInfo, setErrorInfo] = useState(null);

    const [addActivityMutation, { loading }] = useMutation(addActivity, {
        refetchQueries: [
            {
                query: getTopicActivitiesForAdmin,
                variables: {
                    id: topic_id
                }
            }
        ],
        awaitRefetchQueries: true
    });

    const { data: modalsData, loading: modalsLoading } = useQuery(getModalsForActivitySteps);

    return (
        <Formik
            initialValues={{
                ...formInitialStates['addActivityFromAdmin'],
                addStepType: sharedJson?.activity_step_types[0].key,
                isHidden: false,
                hidePhotoUpload: false
            }}
            enableReinitialize
            validationSchema={addActivityFromAdminValidation}
            validateOnChange={false}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let {
                        name,
                        cardImage,
                        welcomeMessage,
                        rationaleModalId,
                        activityType,
                        order,
                        details,
                        steps,
                        isHidden,
                        resources,
                        hidePhotoUpload
                    } = values;
                    let files = [];
                    let activityResource = resources.map((resource) => resource?.value?.trim()).filter((x) => x?.trim());

                    [steps, files] = PreSubmitStepWork(steps, files);

                    const errorMessages = isValid(steps);

                    if (errorMessages?.length > 0) {
                        setErrorInfo({ open: true, message: <RenderHtml text={generateHTMLStringForActivityErrors(errorMessages)} /> });
                    } else {
                        let file = cardImage && _getBase64ToFile(cardImage, generateFileName(filename));

                        if (file) files.push(file);

                        await addActivityMutation({
                            variables: {
                                file: files,
                                input: {
                                    topicId: topic_id,
                                    name: _removeWhiteSpace(name),
                                    welcomeMessage: _removeWhiteSpace(welcomeMessage),
                                    rationaleModalId: rationaleModalId ?? null,
                                    activityType,
                                    order: +order,
                                    isHidden,
                                    hidePhotoUpload,
                                    details: JSON.stringify({ activityComponentName: details }),
                                    steps,
                                    resources: JSON.stringify(activityResource)
                                }
                            }
                        });
                        setOpen();
                        resetForm({ values: '' });
                        callSnackbar('New activity created', 'success');
                    }
                } catch (error) {
                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(
                            {
                                message: error?.message,
                                networkError: { statusCode: 535 }
                            },
                            'error'
                        );
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue, setFieldTouched }) => {
                return (
                    <>
                        <DialogWrapper
                            primaryBtnHandler={handleSubmit}
                            primaryBtnloading={loading}
                            dialogFooter
                            open={open}
                            setOpen={() => setOpen(!open)}
                            primaryBtnText={'Add activity'}
                            cancelBtn
                            className="add_activity_modal"
                            contentWidth="750px"
                            heading={'Add an activity'}>
                            <InputField
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.name}
                                touched={touched.name}
                                label="Activity name"
                                type="text"
                                md={12}
                                lg={12}
                            />
                            <InputField
                                name="welcomeMessage"
                                value={values.welcomeMessage}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.welcomeMessage}
                                touched={touched.welcomeMessage}
                                label="Welcome message"
                                type="text"
                                md={12}
                                lg={12}
                            />
                            <CommonSelectField
                                md={12}
                                lg={12}
                                displayEmpty
                                shrink
                                value={values.activityType}
                                label="Activity type"
                                options={sharedJson?.activity_types}
                                dataTest="activity-type-select"
                                onChange={(e) => {
                                    handleChange({
                                        target: { name: 'activityType', value: e.target.value }
                                    });
                                }}
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'activityType', value: e.target.value }
                                    })
                                }
                            />
                            {values.activityType === 'LEGACY' && (
                                <Grid item xs={12} md={12} lg={12} classes={{ root: 'root' }} className="rationale-modal-picker">
                                    <Autocomplete
                                        id="rationale-modal-option"
                                        data-test="rationale-modal-picker"
                                        loading={modalsLoading}
                                        disabled={modalsLoading}
                                        options={modalsData?.getModals || []}
                                        value={(modalsData?.getModals || []).find((modal) => modal?.id === values.rationaleModalId) ?? null}
                                        onChange={(_, value) => setFieldValue('rationaleModalId', value?.id ?? null)}
                                        getOptionLabel={(option) => option?.nameForContentDev ?? option?.name ?? ''}
                                        isOptionEqualToValue={(option, value) => option?.id === value?.id}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Rationale modal"
                                                variant="outlined"
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {modalsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    )
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}
                            <InputField
                                name="order"
                                value={values.order}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.order}
                                touched={touched.order}
                                label="Activity order"
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                md={12}
                                lg={12}
                            />
                            {values.activityType !== 'LEGACY' && (
                                <InputField
                                    name="details"
                                    value={values.details}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.details}
                                    touched={touched.details}
                                    label="Component name"
                                    md={12}
                                    lg={12}
                                />
                            )}
                            <FieldArray
                                name="resources"
                                render={(arrayHelpers) => {
                                    return (
                                        <div>
                                            {values.resources &&
                                                values.resources.map((resourceObj, index) => {
                                                    return (
                                                        <div key={index} className="add_activity_resources">
                                                            <InputField
                                                                name={resourceObj?.name}
                                                                value={resourceObj?.value}
                                                                onChange={(e) => {
                                                                    const updatedArray = values.resources.map((x, i) => {
                                                                        if (i === index) {
                                                                            return {
                                                                                name: x['name'],
                                                                                value: e.target.value
                                                                            };
                                                                        } else {
                                                                            return x;
                                                                        }
                                                                    });

                                                                    setFieldValue('resources', updatedArray);
                                                                }}
                                                                onBlur={handleBlur}
                                                                label={`Resource ${index + 1}`}
                                                                md={4}
                                                                lg={4}
                                                            />
                                                            <div className="add_activity_resource_button">
                                                                <LWPButton
                                                                    customClass="carousel-step-add-btn"
                                                                    btnText="+"
                                                                    onClick={() => {
                                                                        arrayHelpers.insert(index + 1, { name: index + 1, value: '' });
                                                                    }}
                                                                />
                                                                <LWPButton
                                                                    customClass="carousel-step-remove-btn"
                                                                    btnText="-"
                                                                    onClick={() => {
                                                                        if (values?.resources?.length === 1) {
                                                                            handleChange({
                                                                                target: { name: 'resources', value: [''] }
                                                                            });
                                                                        } else {
                                                                            arrayHelpers.remove(index);
                                                                        }
                                                                    }}
                                                                    // onClick={() => arrayHelpers.remove(index)}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    );
                                }}
                            />
                            <CommonCheckBox
                                name="isHidden"
                                checked={values.isHidden}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Hide Activity"
                                error={errors.isHidden}
                                touched={touched.isHidden}
                            />
                            <CommonCheckBox
                                name="hidePhotoUpload"
                                checked={values.hidePhotoUpload}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Hide Photo Upload"
                                error={errors.hidePhotoUpload}
                                touched={touched.hidePhotoUpload}
                            />
                            {values.activityType == 'LEGACY' && (
                                <CommonFieldArrayForActivitySteps
                                    values={values}
                                    handleChange={handleChange}
                                    handleBlur={handleBlur}
                                    setFieldTouched={setFieldTouched}
                                    setFieldValue={setFieldValue}
                                    showVisibilityRules
                                />
                            )}
                            <CommonFileUpload
                                name="cardImage"
                                previewImage={values.cardImage}
                                icon="folder"
                                heading="File"
                                setFileName={setFileName}
                                onClose={() => handleChange({ target: { name: 'cardImage', value: '' } })}
                                onSave={(croppedImage) => {
                                    handleChange({ target: { name: 'cardImage', value: croppedImage } });
                                }}
                            />
                        </DialogWrapper>
                        {errorInfo?.open && (
                            <CommonSnackbar
                                message={errorInfo?.message}
                                type={'error'}
                                open={errorInfo?.open}
                                onClose={() => setErrorInfo(null)}
                            />
                        )}
                    </>
                );
            }}
        </Formik>
    );
};

AddActivityModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    defaultValues: PropTypes.object,
    topic_id: PropTypes.number
};

AddActivityModal.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default AddActivityModal;
