import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { addSchool } from '../../../graphQl/mutations';
import { getSchools } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { buildInviteModeOptions } from '../../../shared/inviteModeOptions';
import { _getBase64ToFile, _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addSchoolValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonFileUpload from '../CommonFileUpload';
import CommonInfoWithMessage from '../CommonInfoWithMessage';
import CommonRadioButton from '../CommonRadioButton';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';
import Heading2 from '../Typography/Heading2';

// Adding a school is admin-only, so all three invite modes are offered.
const inviteModeOptions = buildInviteModeOptions({ isAdmin: true, dataTestPrefix: 'add-school-invite-mode' });

const AddSchoolModal = ({ open, setOpen }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);

    const [addSchoolMutation, { loading: addSchoolLoading }] = useMutation(addSchool, {
        refetchQueries: [
            {
                query: getSchools,
                variables: {
                    filter: {
                        inactive: false,
                        isTestSchool: false,
                        needImpactReportGenerating: false
                    }
                }
            }
        ],
        awaitRefetchQueries: true
    });

    return (
        <DialogWrapper className="add_parent_modal add_school_modal" open={open} setOpen={setOpen} heading="Add a school">
            <Formik
                initialValues={{
                    ...formInitialStates['addSchool']
                }}
                validationSchema={addSchoolValidation}
                onSubmit={async (values, { resetForm }) => {
                    try {
                        const {
                            schoolName,
                            firstname,
                            lastname,
                            nameForChildren,
                            email,
                            inviteMode,
                            logo,
                            emailAndPassword,
                            google,
                            microsoft,
                            urn,
                            fullProgrammedClassesAllowed,
                            classesAllowed
                        } = values;

                        let files = [];

                        let newFile = logo && filename && _getBase64ToFile(logo, filename);

                        if (newFile) files.push(newFile);

                        const input = {
                            schoolName,
                            urn: urn?.trim() ? urn?.trim() : null,
                            email: emailAndPassword,
                            google,
                            microsoft,
                            leader: {
                                firstname: _removeWhiteSpace(firstname),
                                lastname: _removeWhiteSpace(lastname),
                                email,
                                inviteMode,
                                nameForChildren: _removeWhiteSpace(nameForChildren)
                            },
                            fullProgrammedClassesAllowed: +fullProgrammedClassesAllowed,
                            classesAllowed: +classesAllowed
                        };

                        await addSchoolMutation({
                            variables: {
                                file: files,
                                input
                            }
                        });
                        callSnackbar('New school created', 'success');
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
                    <>
                        <InputField
                            md={12}
                            lg={12}
                            label="School name"
                            value={values.schoolName}
                            name={'schoolName'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.schoolName}
                            touched={touched.schoolName}
                            dataTest={'add-school-name-input'}
                        />
                        <InputField
                            md={12}
                            lg={12}
                            label="URN"
                            value={values.urn}
                            name={'urn'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.urn}
                            touched={touched.urn}
                            dataTest={'add-school-urn-input'}
                        />
                        <InputField
                            md={12}
                            lg={12}
                            label="Leader first name"
                            value={values.firstname}
                            name={'firstname'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.firstname}
                            touched={touched.firstname}
                            dataTest={'add-school-leader-first-name-input'}
                        />
                        <InputField
                            md={12}
                            lg={12}
                            label="Leader last name"
                            value={values.lastname}
                            name={'lastname'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.lastname}
                            touched={touched.lastname}
                            dataTest={'add-school-leader-last-name-input'}
                        />
                        <InputField
                            md={12}
                            lg={12}
                            label="Email address"
                            type="email"
                            value={values.email}
                            name={'email'}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                            dataTest={'add-school-email-input'}
                        />
                        <InputField
                            md={12}
                            lg={12}
                            label="Alias"
                            value={values.nameForChildren}
                            name={'nameForChildren'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.nameForChildren}
                            touched={touched.nameForChildren}
                            dataTest={'add-school-alias-input'}
                        />
                        <InputField
                            md={4}
                            lg={4}
                            label="Full programme classes allowed"
                            value={values.fullProgrammedClassesAllowed}
                            name="fullProgrammedClassesAllowed"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            inputProps={{
                                inputMode: 'numeric',
                                pattern: '[0-9]*'
                            }}
                            error={errors.fullProgrammedClassesAllowed}
                            touched={touched.fullProgrammedClassesAllowed}
                            dataTest={'add-school-full-programme-classes-allowed-input'}
                        />
                        <InputField
                            md={4}
                            lg={4}
                            label="Total classes allowed"
                            value={values.classesAllowed}
                            name="classesAllowed"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                            error={errors.classesAllowed}
                            touched={touched.classesAllowed}
                            dataTest={'add-school-total-classes-allowed-input'}
                        />
                        <CommonRadioButton
                            bordered={false}
                            name="inviteMode"
                            value={values.inviteMode}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            options={inviteModeOptions}
                            error={errors.inviteMode}
                            touched={touched.inviteMode}
                        />
                        <CommonFileUpload
                            name="logo"
                            previewImage={values.logo}
                            customClass="add-resource-file-upload"
                            icon="folder"
                            error={errors.logo}
                            touched={touched.logo}
                            heading="Logo"
                            setFileName={setFileName}
                            onClose={() => handleChange({ target: { name: 'logo', value: '' } })}
                            onSave={(croppedImage) => {
                                handleChange({ target: { name: 'logo', value: croppedImage } });
                            }}
                            data-test={'add-school-logo-file'}
                        />
                        <div className="school-social-login-permissions-section">
                            <Heading2 text={'Allow teachers to log in through'} customClass="school-social-login-permissions-heading" />
                            <CommonCheckBox
                                label="Email and password"
                                name="emailAndPassword"
                                checked={values.emailAndPassword}
                                error={errors.emailAndPassword}
                                touched={touched.emailAndPassword}
                                onChange={handleChange}
                                dataTest={'add-school-allow-password-login-checkbox'}
                            />
                            <CommonCheckBox
                                label="Google"
                                name="google"
                                checked={values.google}
                                error={errors.google}
                                touched={touched.google}
                                onChange={handleChange}
                                dataTest={'add-school-allow-google-login-checkbox'}
                            />
                            <CommonCheckBox
                                label="Microsoft"
                                name="microsoft"
                                checked={values.microsoft}
                                error={errors.microsoft}
                                touched={touched.microsoft}
                                onChange={handleChange}
                                dataTest={'add-school-allow-microsoft-login-checkbox'}
                            />

                            <CommonInfoWithMessage
                                text={
                                    'Teachers will only be allowed to sign in from an account that matches the email address they have been invited with.'
                                }
                            />
                        </div>
                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                onClick={() => setOpen(false)}
                                btnText="Cancel"
                                color="inherit"
                                dataTest={'add-school-cancel-button'}
                            />
                            <LWPButton
                                btnText="Add school"
                                loading={addSchoolLoading}
                                onClick={handleSubmit}
                                dataTest={'add-school-submit-button'}
                            />
                        </div>
                    </>
                )}
            </Formik>
        </DialogWrapper>
    );
};

AddSchoolModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired
};

export default AddSchoolModal;
