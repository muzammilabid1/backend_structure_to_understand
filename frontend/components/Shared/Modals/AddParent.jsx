import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import gql from 'graphql-tag';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import {
    getClassPupilsForClassPupilsPage,
    getPupilForParentsAndCarersTableForParent,
    getPupilForParentsAndCarersTableForTeacher,
    getPupilForTeacher
} from '../../../graphQl/queries';
import { PARENT, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _phoneValidationRegex, _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addParentValidationWithEmail, addParentValidationWithPhone } from '../../../shared/validations';
import LWPButton from './../Button/LWPButton';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

// Queries

const getPupilbyIdForAddParent = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            firstname
            lastname
        }
    }
`;

// Mutations

const inviteParentForPupilForAddParent = gql`
    mutation inviteParentForPupil($input: InviteParentForPupilInput!) {
        inviteParentForPupil(input: $input) {
            firstname
        }
    }
`;

const AddParent = ({ open, setOpen, child_id, viewType }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const query = useParams();

    const [_email, _setEmail] = useState('');
    const isPhoneNumber = _phoneValidationRegex(_email);

    const [inviteParentForPupilMutation, { loading }] = useMutation(inviteParentForPupilForAddParent, {
        awaitRefetchQueries: true,
        refetchQueries:
            viewType === PARENT
                ? [
                      { query: getPupilbyIdForAddParent, variables: { id: child_id } },
                      { query: getPupilForParentsAndCarersTableForParent, variables: { id: child_id } }
                  ]
                : [
                      { query: getPupilForTeacher, variables: { id: child_id } },
                      { query: getPupilForParentsAndCarersTableForTeacher, variables: { id: child_id } },
                      ...(query?.class_id ? [{ query: getClassPupilsForClassPupilsPage, variables: { id: query.class_id } }] : [])
                  ]
    });

    return (
        <Formik
            initialValues={{ ...formInitialStates['addParent'] }}
            validationSchema={isPhoneNumber ? addParentValidationWithPhone : addParentValidationWithEmail}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { firstname, lastname, email } = values;

                    await inviteParentForPupilMutation({
                        variables: {
                            input: {
                                firstname: _removeWhiteSpace(firstname),
                                lastname: _removeWhiteSpace(lastname),
                                email: isPhoneNumber ? null : email,
                                phoneNumber: isPhoneNumber ? email : null,
                                pupilId: child_id
                            }
                        }
                    });
                    callSnackbar(`An invite has been sent to ${email}`, 'success');
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                _setEmail(values.email);

                return (
                    <DialogWrapper
                        className="add_parent_modal"
                        open={open}
                        setOpen={setOpen}
                        heading="Add a parent"
                        dataTest={'add-parent-modal'}>
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
                            dataTest="add-parent-firstname-input"
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
                            dataTest="add-parent-lastname-input"
                        />
                        <InputField
                            md={12}
                            lg={12}
                            label="Email address or mobile number"
                            value={values.email}
                            name={'email'}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                            dataTest="add-parent-email-or-phone-input"
                        />

                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                onClick={() => setOpen(false)}
                                btnText="Cancel"
                                color="inherit"
                                dataTest={'dialog-cancel-btn'}
                            />
                            <LWPButton btnText="Add parent" loading={loading} onClick={handleSubmit} />
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AddParent.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    child_id: PropTypes.number.isRequired,
    viewType: PropTypes.string
};

export default AddParent;
