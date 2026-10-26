import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addAdmin } from '../../../graphQl/mutations';
import { getAdmins } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addAdminValidation } from '../../../shared/validations';
import LWPButton from './../Button/LWPButton';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddAdminModal = ({ open, setOpen }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [addAdminMutation, { loading }] = useMutation(addAdmin, {
        refetchQueries: [{ query: getAdmins }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={{ ...formInitialStates['addAdmin'] }}
            validationSchema={addAdminValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { firstname, lastname, email } = values;

                    await addAdminMutation({
                        variables: {
                            input: {
                                firstname: _removeWhiteSpace(firstname),
                                lastname: _removeWhiteSpace(lastname),
                                email
                            }
                        }
                    });
                    callSnackbar('New admin created', 'success');
                    setOpen(false);
                    resetForm({ values: '' });
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
                <DialogWrapper contentWidth={'484px'} className="add_parent_modal" open={open} setOpen={setOpen} heading="Add an admin">
                    <InputField
                        md={12}
                        lg={12}
                        label="First name"
                        value={values.firstname}
                        name={'firstname'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.firstname}
                        touched={touched.firstname}
                    />
                    <InputField
                        md={12}
                        lg={12}
                        label="Last name"
                        value={values.lastname}
                        name={'lastname'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.lastname}
                        touched={touched.lastname}
                    />
                    <InputField
                        md={12}
                        lg={12}
                        label="Email"
                        type="email"
                        value={values.email}
                        name={'email'}
                        onChange={(e) => {
                            handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                        }}
                        onBlur={handleBlur}
                        error={errors.email}
                        touched={touched.email}
                    />

                    <div className="btn_group">
                        <LWPButton
                            customClass="cancel_btn"
                            variant="text"
                            onClick={() => setOpen(false)}
                            btnText="Cancel"
                            color="inherit"
                        />
                        <LWPButton btnText="Add admin" loading={loading} onClick={handleSubmit} />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddAdminModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired
};

export default AddAdminModal;
