import { gql, useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonSelectField from '../../../components/Shared/CommonSelectField';
import DialogWrapper from '../../../components/Shared/DialogWrapper';
import InputField from '../../../components/Shared/InputField/InputField';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { schoolDataValidation } from '../../../shared/validations';

const updateDataQuery = gql`
    mutation updateDataQuery($input: UpdateDataQueryInput!) {
        updateDataQuery(input: $input) {
            id
        }
    }
`;

const EditSchoolDataModal = ({ updatedValues, setUpdatedValues, allAdminQueries }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [updateDataMutation, { loading: updateAdminQueryLoading }] = useMutation(updateDataQuery, {
        refetchQueries: [{ query: allAdminQueries }],
        awaitRefetchQueries: true
    });

    const getInitiateState = (updatedValues) => {
        return {
            id: updatedValues?.id,
            status: updatedValues?.status,
            description: updatedValues?.description,
            order: updatedValues?.order
        };
    };

    return (
        <Formik
            initialValues={getInitiateState(updatedValues)}
            validationSchema={schoolDataValidation}
            enableReinitialize
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { status, order, description, id } = values;

                    await updateDataMutation({
                        variables: {
                            input: {
                                id: id,
                                status,
                                description,
                                order: +order
                            }
                        }
                    });
                    callSnackbar('Query updated!', 'success');
                    setUpdatedValues(null);
                    resetForm();
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
                <DialogWrapper heading="Edit school data" className="add_parent_modal" open={updatedValues} setOpen={setUpdatedValues}>
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

                    <CommonSelectField
                        value={values.status}
                        label="Status"
                        options={[
                            { value: 'HIDDEN', key: 'HIDDEN' },
                            { value: 'PUBLISHED', key: 'PUBLISHED' }
                        ]}
                        onChange={(e) => {
                            handleChange({
                                target: { name: 'status', value: e.target.value }
                            });
                        }}
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'status', value: e.target.value }
                            })
                        }
                    />

                    <InputField
                        md={12}
                        lg={12}
                        label="Description"
                        value={values.description}
                        name={'description'}
                        inputComponent={'textarea'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.description}
                        touched={touched.description}
                        multiline
                        rows={4}
                        inputProps={{
                            style: { resize: 'vertical' }
                        }}
                    />

                    <div className="btn_group">
                        <LWPButton
                            customClass="cancel_btn"
                            variant="text"
                            onClick={() => {
                                setUpdatedValues(null);
                            }}
                            btnText="Cancel"
                            color="inherit"
                        />
                        <LWPButton btnText="Confirm" loading={updateAdminQueryLoading} onClick={handleSubmit} />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

EditSchoolDataModal.propTypes = {
    updatedValues: PropTypes.object,
    setUpdatedValues: PropTypes.func,
    allAdminQueries: PropTypes.func
};

export default EditSchoolDataModal;
