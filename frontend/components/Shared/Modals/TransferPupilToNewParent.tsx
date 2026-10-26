import { gql, InternalRefetchQueriesInclude, useMutation } from '@apollo/client';
import { Alert } from '@mui/material';
import { Formik } from 'formik';
import React, { useContext } from 'react';

import { getPupilForParentsAndCarersTableForTeacher } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { transferPupilToNewParentValidation } from '../../../shared/validations';
import { ILwpUser } from '../../../types/entities/ILwpUser';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';
import Heading3 from '../Typography/Heading3';

const TRANSFER_PUPIL_TO_NEW_PARENT_MUTATION = gql`
    mutation transferPupilToNewParent($input: TransferPupilParentInput!) {
        transferPupilToNewParent(input: $input)
    }
`;

type TransferPupilToNewParentFormValues = {
    originalFirstname: string;
    originalLastname: string;
    originalEmail: string;
    originalPhoneNumber: string;
    newFirstname: string;
    newLastname: string;
    newEmail: string;
    newPhoneNumber: string;
};

interface LwpUserWithPupilParentStatus extends ILwpUser {
    pupilParentId: string;
}

interface TransferPupilToNewParentProps {
    open: boolean;
    setOpen: () => void;
    pupilId: string;
    parent: LwpUserWithPupilParentStatus;
}

const TransferPupilToNewParent = ({ open, setOpen, pupilId, parent }: TransferPupilToNewParentProps) => {
    const [transferPupilToNewParentMutation, { loading }] = useMutation(TRANSFER_PUPIL_TO_NEW_PARENT_MUTATION);
    const { callSnackbar } = useContext(ThemeContext);

    const refetch: InternalRefetchQueriesInclude = [{ query: getPupilForParentsAndCarersTableForTeacher, variables: { id: pupilId } }];

    const transferPupilToNewParentFormInitialValues: TransferPupilToNewParentFormValues = {
        originalFirstname: parent?.firstname,
        originalLastname: parent?.lastname,
        originalEmail: parent?.email,
        originalPhoneNumber: parent?.phoneNumber,
        newFirstname: '',
        newLastname: '',
        newEmail: '',
        newPhoneNumber: ''
    };

    return (
        <Formik
            initialValues={transferPupilToNewParentFormInitialValues}
            validationSchema={transferPupilToNewParentValidation}
            onSubmit={async (values: TransferPupilToNewParentFormValues, { resetForm }) => {
                try {
                    const { newFirstname, newLastname, newEmail, newPhoneNumber } = values;

                    const trimmedEmail = _removeWhiteSpace(newEmail);
                    const trimmedPhoneNumber = _removeWhiteSpace(newPhoneNumber);
                    const trimmedFirstname = _removeWhiteSpace(newFirstname);
                    const trimmedLastname = _removeWhiteSpace(newLastname);

                    await transferPupilToNewParentMutation({
                        variables: {
                            input: {
                                email: trimmedEmail,
                                phoneNumber: trimmedPhoneNumber,
                                firstname: trimmedFirstname,
                                lastname: trimmedLastname,
                                pupilParentId: parent?.pupilParentId
                            }
                        },
                        refetchQueries: refetch,
                        awaitRefetchQueries: true
                    });
                    callSnackbar('New parent created successfully.', 'success');
                    resetForm();
                    setOpen();
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
                        primaryBtnText={'Detach and add new parent'}
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading}
                        contentWidth="1193px"
                        className="transfer-pupil-to-new-parent-modal"
                        heading="Edit parent details">
                        <div className="transfer-pupil-to-new-parent-modal-container">
                            <div className="missing-parent-alert">
                                <Alert severity="warning">
                                    This parent’s account details can only be updated by the parent themselves. Instead, we can detach the
                                    existing parent account from this pupil and create a new one with updated details.
                                </Alert>
                            </div>
                            <div className="transfer-pupil-to-new-parent-modal-content">
                                <div className="transfer-pupil-to-new-parent-modal-content-disabled">
                                    <div className="transfer-pupil-to-new-parent-modal-content-disabled-heading">
                                        <Heading3 text="Unlink from the pupil" />
                                    </div>
                                    <div className="transfer-pupil-to-new-parent-modal-content-disabled-form">
                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="First name"
                                            value={values.originalFirstname}
                                            name={'originalFirstname'}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.originalFirstname}
                                            touched={touched.originalFirstname}
                                            disabled
                                        />
                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="Last name"
                                            value={values.originalLastname}
                                            name={'originalLastname'}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.originalLastname}
                                            touched={touched.originalLastname}
                                            disabled
                                        />
                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="Parent email address"
                                            value={values.originalEmail}
                                            name={'originalEmail'}
                                            onChange={(e) => {
                                                handleChange({ target: { name: 'originalEmail', value: e.target.value.toLowerCase() } });
                                            }}
                                            onBlur={handleBlur}
                                            error={errors.originalEmail}
                                            touched={touched.originalEmail}
                                            disabled
                                        />

                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="Parent mobile number"
                                            value={values.originalPhoneNumber}
                                            name={'originalPhoneNumber'}
                                            onChange={(e) => {
                                                handleChange({
                                                    target: { name: 'originalPhoneNumber', value: e.target.value.toLowerCase() }
                                                });
                                            }}
                                            onBlur={handleBlur}
                                            error={errors.originalPhoneNumber}
                                            touched={touched.originalPhoneNumber}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="transfer-pupil-to-new-parent-modal-content-new">
                                    <div className="transfer-pupil-to-new-parent-modal-content-new-heading">
                                        <Heading3 text="Adding new parent" />
                                    </div>
                                    <div className="transfer-pupil-to-new-parent-modal-content-new-form">
                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="First name"
                                            value={values.newFirstname}
                                            name={'newFirstname'}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.newFirstname}
                                            touched={touched.newFirstname}
                                            dataTest="transfer-pupil-to-new-parent-firstname-input"
                                        />
                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="Last name"
                                            value={values.newLastname}
                                            name={'newLastname'}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.newLastname}
                                            touched={touched.newLastname}
                                            dataTest="transfer-pupil-to-new-parent-lastname-input"
                                        />
                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="Parent email address"
                                            value={values.newEmail}
                                            name={'newEmail'}
                                            onChange={(e) => {
                                                handleChange({ target: { name: 'newEmail', value: e.target.value.toLowerCase() } });
                                            }}
                                            onBlur={handleBlur}
                                            error={errors.newEmail}
                                            touched={touched.newEmail}
                                            dataTest="transfer-pupil-to-new-parent-email-input"
                                        />

                                        <InputField
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            label="Parent mobile number"
                                            value={values.newPhoneNumber}
                                            name={'newPhoneNumber'}
                                            onChange={(e) => {
                                                handleChange({ target: { name: 'newPhoneNumber', value: e.target.value.toLowerCase() } });
                                            }}
                                            onBlur={handleBlur}
                                            error={errors.newPhoneNumber}
                                            touched={touched.newPhoneNumber}
                                            dataTest="transfer-pupil-to-new-parent-phonenumber-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default TransferPupilToNewParent;
