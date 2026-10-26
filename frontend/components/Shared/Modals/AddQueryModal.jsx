import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addAdminQuery, updateAdminQuery } from '../../../graphQl/mutations';
import { allAdminQueries } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { addQueryValidation } from '../../../shared/validations';
import LWPButton from './../Button/LWPButton';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddQueryModal = ({ open, setOpen, updatedValues, setUpdatedValues }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [addAdminQueryMutation, { loading }] = useMutation(addAdminQuery, {
        refetchQueries: [{ query: allAdminQueries }],
        awaitRefetchQueries: true
    });

    const [updateAdminQueryMutation, { loading: updateAdminQueryLoading }] = useMutation(updateAdminQuery, {
        refetchQueries: [{ query: allAdminQueries }],
        awaitRefetchQueries: true
    });

    const getInitiateState = (updatedValues) => {
        if (updatedValues?.id) {
            return {
                id: updatedValues?.id,
                name: updatedValues?.name,
                sqlQuery: updatedValues?.sqlQuery,
                order: updatedValues?.order
            };
        }

        return {
            id: null,
            name: '',
            sqlQuery: '',
            order: 1
        };
    };

    return (
        <Formik
            initialValues={getInitiateState(updatedValues)}
            validationSchema={addQueryValidation}
            enableReinitialize
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { name, sqlQuery, order, id } = values;

                    if (updatedValues?.id) {
                        await updateAdminQueryMutation({
                            variables: {
                                input: {
                                    id: id,
                                    name,
                                    sqlQuery,
                                    order: +order
                                }
                            }
                        });
                        callSnackbar('Query updated!', 'success');
                        resetForm({ values: '' });
                        setUpdatedValues({});
                        setOpen(false);
                    } else {
                        await addAdminQueryMutation({
                            variables: {
                                input: {
                                    name,
                                    sqlQuery,
                                    order: +order
                                }
                            }
                        });
                        callSnackbar('New query created!', 'success');
                        setOpen(false);
                        resetForm({ values: '' });
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
                <DialogWrapper className="add_parent_modal" open={open} setOpen={setOpen} heading="Add a Query">
                    <InputField
                        md={12}
                        lg={12}
                        label="Query Name"
                        value={values.name}
                        name={'name'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.name}
                        touched={touched.name}
                    />

                    <InputField
                        md={12}
                        lg={12}
                        label="Order"
                        value={values.order}
                        name={'order'}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.order}
                        touched={touched.order}
                    />

                    <InputField
                        customClass="admin-query-textarea"
                        md={12}
                        lg={12}
                        label="SQL Query"
                        value={values.sqlQuery}
                        name={'sqlQuery'}
                        inputComponent={'textarea'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.sqlQuery}
                        touched={touched.sqlQuery}
                    />

                    <div className="btn_group">
                        <LWPButton
                            customClass="cancel_btn"
                            variant="text"
                            onClick={() => {
                                setUpdatedValues({});
                                setOpen(false);
                            }}
                            btnText="Cancel"
                            color="inherit"
                        />
                        <LWPButton btnText="Confirm" loading={loading || updateAdminQueryLoading} onClick={handleSubmit} />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddQueryModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updatedValues: PropTypes.object,
    setUpdatedValues: PropTypes.func
};

export default AddQueryModal;
