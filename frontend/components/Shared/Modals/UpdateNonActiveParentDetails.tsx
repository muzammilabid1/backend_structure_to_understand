import { gql, InternalRefetchQueriesInclude, useMutation } from '@apollo/client';
import { Alert } from '@mui/material';
import { Formik } from 'formik';
import { UserStatus } from 'lwp-shared';
import React, { useContext } from 'react';

import { getPupilForParentsAndCarersTableForTeacher } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { updateNonActiveParentDetailsValidation } from '../../../shared/validations';
import { ILwpUser } from '../../../types/entities/ILwpUser';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';

const UPDATE_NON_ACTIVE_PARENT_DETAILS_MUTATION = gql`
    mutation updateNonActiveParent($input: UpdateNonActiveParentInput!) {
        updateNonActiveParent(input: $input)
    }
`;

type UpdateNonActiveParentDetailsFormValues = {
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
};

interface UpdateNonActiveParentDetailsProps {
    open: boolean;
    setOpen: () => void;
    onUpdate?: (input: ILwpUser) => void;
    pupilId: string;
    parent: ILwpUser;
}

const UpdateNonActiveParentDetails = ({ open, setOpen, pupilId, parent, onUpdate }: UpdateNonActiveParentDetailsProps) => {
    const [updateNonActiveParentMutation, { loading }] = useMutation(UPDATE_NON_ACTIVE_PARENT_DETAILS_MUTATION);
    const { callSnackbar } = useContext(ThemeContext);

    const refetch: InternalRefetchQueriesInclude = [{ query: getPupilForParentsAndCarersTableForTeacher, variables: { id: pupilId } }];

    const updateNonActiveParentDetailsFormInitialValues: UpdateNonActiveParentDetailsFormValues = {
        firstname: parent?.firstname,
        lastname: parent?.lastname,
        email: parent?.email,
        phoneNumber: parent?.phoneNumber
    };

    return (
        <Formik
            initialValues={updateNonActiveParentDetailsFormInitialValues}
            validationSchema={updateNonActiveParentDetailsValidation}
            onSubmit={async (values: UpdateNonActiveParentDetailsFormValues, { resetForm }) => {
                try {
                    const { email, phoneNumber, firstname, lastname } = values;

                    const trimmedEmail = _removeWhiteSpace(email);
                    const trimmedPhoneNumber = _removeWhiteSpace(phoneNumber);
                    const trimmedFirstname = _removeWhiteSpace(firstname);
                    const trimmedLastname = _removeWhiteSpace(lastname);

                    await updateNonActiveParentMutation({
                        variables: {
                            input: {
                                id: parent?.id,
                                email: trimmedEmail,
                                phoneNumber: trimmedPhoneNumber,
                                firstname: trimmedFirstname,
                                lastname: trimmedLastname
                            }
                        },
                        refetchQueries: refetch,
                        awaitRefetchQueries: true
                    });
                    callSnackbar('Parent details updated successfully.', 'success');
                    resetForm();
                    setOpen();
                    if (onUpdate) {
                        onUpdate({
                            id: parent?.id,
                            firstname: trimmedFirstname,
                            lastname: trimmedLastname,
                            email: trimmedEmail,
                            phoneNumber: trimmedPhoneNumber,
                            userStatus: parent?.userStatus
                        });
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        open={open}
                        setOpen={setOpen}
                        cancelBtn
                        dialogFooter
                        primaryBtnText={'Update'}
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading}
                        contentWidth="580px"
                        heading="Edit parent details">
                        <div>
                            {parent.userStatus === UserStatus.INVITED || parent.userStatus === UserStatus.REJECTED ? (
                                <div className="missing-parent-alert">
                                    <Alert severity="warning">
                                        Updating the email or phone number will invalidate the existing invitation link sent to the parent.
                                    </Alert>
                                </div>
                            ) : null}
                            <form className="mt8">
                                <InputField
                                    lg={12}
                                    md={12}
                                    sm={12}
                                    xs={12}
                                    label="First name"
                                    value={values.firstname}
                                    name={'firstname'}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.firstname}
                                    touched={touched.firstname}
                                    dataTest="update-non-active-parent-firstname-input"
                                />
                                <InputField
                                    lg={12}
                                    md={12}
                                    sm={12}
                                    xs={12}
                                    label="Last name"
                                    value={values.lastname}
                                    name={'lastname'}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.lastname}
                                    touched={touched.lastname}
                                    dataTest="update-non-active-parent-lastname-input"
                                />
                                <InputField
                                    lg={12}
                                    md={12}
                                    sm={12}
                                    xs={12}
                                    label="Parent email address"
                                    value={values.email}
                                    name={'email'}
                                    onChange={(e) => {
                                        handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                                    }}
                                    onBlur={handleBlur}
                                    error={errors.email}
                                    touched={touched.email}
                                    dataTest="update-non-active-parent-email-input"
                                />

                                <InputField
                                    lg={12}
                                    md={12}
                                    sm={12}
                                    xs={12}
                                    label="Parent mobile number"
                                    value={values.phoneNumber}
                                    name={'phoneNumber'}
                                    onChange={(e) => {
                                        handleChange({ target: { name: 'phoneNumber', value: e.target.value.toLowerCase() } });
                                    }}
                                    onBlur={handleBlur}
                                    error={errors.phoneNumber}
                                    touched={touched.phoneNumber}
                                    dataTest="update-non-active-parent-phonenumber-input"
                                />
                            </form>
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default UpdateNonActiveParentDetails;
