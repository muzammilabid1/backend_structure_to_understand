import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addParameter, updateParameter } from '../../../graphQl/mutations';
import { allParameters } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../Button/LWPButton';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddParameterModal = ({ open, setOpen, updateValues, setUpdateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addParameterMutation, { loading }] = useMutation(addParameter, {
        refetchQueries: [{ query: allParameters }],
        awaitRefetchQueries: true
    });
    const [updateParameterMutation, { loading: updateLoading }] = useMutation(updateParameter, {
        refetchQueries: [{ query: allParameters }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={
                updateValues
                    ? {
                          key: updateValues.key,
                          value: updateValues.value
                      }
                    : formInitialStates['addParameter']
            }
            enableReinitialize
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { key, value } = values;

                    key = _removeWhiteSpace(key);
                    value = _removeWhiteSpace(value);

                    if (!updateValues) {
                        await addParameterMutation({
                            variables: {
                                input: {
                                    key,
                                    value
                                }
                            }
                        });
                        callSnackbar('Added parameter successfully', 'success');
                        setOpen(false);
                        resetForm({ values: '' });
                    } else {
                        await updateParameterMutation({
                            variables: {
                                input: {
                                    key,
                                    value
                                }
                            }
                        });
                        callSnackbar('Update parameter successfully', 'success');
                        setOpen(false);
                        resetForm({ values: '' });
                        setUpdateValues(null);
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <DialogWrapper
                    className="add_parent_modal"
                    open={open}
                    setOpen={setOpen}
                    heading={updateValues ? 'Update a Parameter' : 'Add a Parameter'}
                    onClose={() => {
                        setOpen(false);
                        setUpdateValues(null);
                    }}>
                    <InputField
                        md={12}
                        lg={12}
                        label="Key"
                        value={values.key}
                        name={'key'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.key}
                        touched={touched.key}
                    />

                    <InputField
                        md={12}
                        lg={12}
                        label="Value"
                        multiline
                        rows={3}
                        value={values.value}
                        name={'value'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.value}
                        touched={touched.value}
                    />

                    <div className="btn_group">
                        <LWPButton
                            customClass="cancel_btn"
                            variant="text"
                            onClick={() => {
                                setOpen(false);
                                setUpdateValues(null);
                            }}
                            btnText="Cancel"
                            color="inherit"
                        />
                        <LWPButton
                            btnText={updateValues ? 'Update Parameter' : 'Add Parameter'}
                            loading={loading || updateLoading}
                            onClick={handleSubmit}
                        />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddParameterModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.bool,
    setUpdateValues: PropTypes.func
};

export default AddParameterModal;
