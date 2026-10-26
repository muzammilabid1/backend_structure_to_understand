import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addModal, updateModal } from '../../../graphQl/mutations';
import { getModals } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { _removeWhiteSpace, getStepsValue, isValid, PreSubmitStepWork, ThemeContext } from '../../../shared/Services/handler';
import { addModalFromAdminValidation } from '../../../shared/validations';
import CommonFieldArrayForActivitySteps from '../CommonFieldArrayForActivitySteps';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddStaticModal = ({ open, setOpen, updateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addModalMutation, { loading }] = useMutation(addModal, {
        refetchQueries: [{ query: getModals }],
        awaitRefetchQueries: true
    });

    const [updateModalMutation, { loading: updateModalLoading }] = useMutation(updateModal, {
        refetchQueries: [{ query: getModals }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={{
                name: updateValues ? updateValues?.name : null,
                nameForContentDev: updateValues ? updateValues?.nameForContentDev : null,
                steps: updateValues ? getStepsValue(updateValues?.steps?.legacySteps ?? []) : [],
                addStepType: sharedJson?.activity_step_types?.[0]?.key
            }}
            // enableReinitialize
            validateOnChange={false}
            validationSchema={addModalFromAdminValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { name, steps, nameForContentDev } = values;

                    let files = [];

                    if (updateValues) {
                        [steps, files] = PreSubmitStepWork(steps, files, true);
                    } else {
                        [steps, files] = PreSubmitStepWork(steps, files);
                    }

                    const updatedSteps = steps.map((item) => {
                        return {
                            ...item,
                            fontSize: +item?.fontSize
                        };
                    });

                    if (isValid(steps)) {
                        if (updateValues) {
                            await updateModalMutation({
                                variables: {
                                    file: [...files],
                                    input: {
                                        id: updateValues?.id,
                                        name: _removeWhiteSpace(name),
                                        steps: updatedSteps
                                    }
                                }
                            });
                            setOpen();
                            resetForm({ values: '' });
                            callSnackbar('Modal updated', 'success');
                        } else {
                            await addModalMutation({
                                variables: {
                                    file: [...files],
                                    input: {
                                        name: _removeWhiteSpace(name),
                                        nameForContentDev: _removeWhiteSpace(nameForContentDev),
                                        steps: updatedSteps
                                    }
                                }
                            });
                            setOpen();
                            resetForm({ values: '' });
                            callSnackbar('New modal created', 'success');
                        }
                    }
                } catch (error) {
                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, setFieldValue, setFieldTouched }) => {
                return (
                    <DialogWrapper
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading || updateModalLoading}
                        dialogFooter
                        open={open}
                        setOpen={() => setOpen(!open)}
                        primaryBtnText={updateValues ? 'Update Modal' : 'Add Modal'}
                        cancelBtn
                        className="add_activity_modal"
                        contentWidth="750px"
                        heading={'Add a Modal'}>
                        <InputField
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.name}
                            touched={true}
                            label="Modal Name"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <InputField
                            name="nameForContentDev"
                            value={values.nameForContentDev}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.nameForContentDev}
                            touched={true}
                            label="Name for content developers"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <CommonFieldArrayForActivitySteps
                            values={values}
                            handleChange={handleChange}
                            handleBlur={handleBlur}
                            setFieldTouched={setFieldTouched}
                            setFieldValue={setFieldValue}
                            errors={errors}
                        />
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AddStaticModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.object
};

AddStaticModal.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default AddStaticModal;
