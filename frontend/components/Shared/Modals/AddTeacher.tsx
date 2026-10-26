import { InternalRefetchQueryDescriptor, useMutation } from '@apollo/client';
import { Formik } from 'formik';
import { InviteMode, UserStatus } from 'lwp-shared';
import React, { useContext, useState } from 'react';

import { addTeacher, updateTeacher } from '../../../graphQl/mutations';
import { getSchoolTeachers } from '../../../graphQl/queries';
import { teacherRole, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { buildInviteModeOptions } from '../../../shared/inviteModeOptions';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addTeacherValidation } from '../../../shared/validations';
import CommonCheckBox from './../CommonCheckBox';
import CommonRadioButton from './../CommonRadioButton';
import CommonSelectField from './../CommonSelectField';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';
import ConfirmationModal from './ConfirmationModal';

interface TeacherDefaultValues {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    nameForChildren: string;
    isSchoolLeader?: boolean;
    userStatus?: string;
}

interface TeacherFormValues {
    firstname: string;
    lastname: string;
    email: string;
    nameForChildren: string;
    role: string;
    inviteMode?: InviteMode;
    isDeactivated?: boolean | null;
}

interface AddTeacherModalProps {
    open?: boolean;
    setOpen?: () => void;
    defaultValues?: TeacherDefaultValues;
    schoolId?: string;
    refetchQueries?: InternalRefetchQueryDescriptor;
    isAdmin?: boolean;
}

const AddTeacherModal = ({
    open = false,
    setOpen = () => {},
    defaultValues,
    schoolId,
    refetchQueries,
    isAdmin = false
}: AddTeacherModalProps) => {
    const { callSnackbar, token } = useContext(ThemeContext);

    const [openConfirmationModal, setOpenConfirmationModal] = useState(false);

    // Non-admin contexts only offer Send now / Do not send; admins can also defer to the autumn window.
    const inviteModeOptions = buildInviteModeOptions({ isAdmin, dataTestPrefix: 'add-teacher-invite-mode' });

    const [add_teacher, { loading }] = useMutation(addTeacher, {
        refetchQueries: [{ query: getSchoolTeachers, variables: { schoolId } }, refetchQueries],
        awaitRefetchQueries: true
    });
    const [update_teacher, { loading: updateTeacherIsLoading }] = useMutation(updateTeacher, {
        refetchQueries: [{ query: getSchoolTeachers, variables: { schoolId } }, refetchQueries],
        awaitRefetchQueries: true
    });

    return (
        <>
            <Formik<TeacherFormValues>
                initialValues={
                    defaultValues
                        ? {
                              firstname: defaultValues.firstname,
                              lastname: defaultValues.lastname,
                              email: defaultValues.email,
                              nameForChildren: defaultValues.nameForChildren,
                              role: defaultValues.isSchoolLeader ? teacherRole[1].key : teacherRole[0].key,
                              isDeactivated:
                                  defaultValues?.userStatus === 'DEACTIVATED' ? true : defaultValues?.userStatus === 'ACTIVE' ? false : null
                          }
                        : formInitialStates['addTeacher']
                }
                enableReinitialize
                validationSchema={addTeacherValidation}
                onSubmit={async (values, { resetForm }) => {
                    try {
                        const defaultValuesRole = defaultValues?.isSchoolLeader ? teacherRole[1].key : teacherRole[0].key;

                        const { email, role, isDeactivated, inviteMode } = values;
                        const firstname = _removeWhiteSpace(values.firstname);
                        const lastname = _removeWhiteSpace(values.lastname);
                        const nameForChildren = _removeWhiteSpace(values.nameForChildren);

                        if (defaultValues) {
                            await update_teacher({
                                variables: {
                                    input: {
                                        firstname,
                                        lastname,
                                        email,
                                        nameForChildren,
                                        role,
                                        isDeactivated,
                                        id: defaultValues.id,
                                        schoolId
                                    }
                                }
                            });

                            if (values?.role !== defaultValuesRole && defaultValues?.userStatus === UserStatus?.ACTIVE) {
                                setOpenConfirmationModal(true);
                            }

                            setOpen();
                            resetForm({ values: '' as never });
                            callSnackbar('Changes saved', 'success');
                        } else {
                            await add_teacher({
                                variables: { input: { firstname, lastname, email, nameForChildren, role, schoolId, inviteMode } }
                            });
                            setOpen();
                            resetForm({ values: '' as never });
                            callSnackbar('A new teacher has been added', 'success');
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
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading || updateTeacherIsLoading}
                        dialogFooter
                        open={open}
                        setOpen={setOpen}
                        primaryBtnText={defaultValues ? 'Update teacher' : 'Add teacher'}
                        cancelBtn
                        contentWidth="750px"
                        heading={defaultValues ? 'Update a teacher' : 'Add a teacher'}>
                        <InputField
                            name="firstname"
                            value={values.firstname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.firstname}
                            touched={touched.firstname}
                            label="First name"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <InputField
                            name="lastname"
                            value={values.lastname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.lastname}
                            touched={touched.lastname}
                            label="Last name"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <InputField
                            name="nameForChildren"
                            value={values.nameForChildren}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.nameForChildren}
                            touched={touched.nameForChildren}
                            label="Name used by children"
                            placeholder="e.g. Ms Smith"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <InputField
                            name="email"
                            value={values.email}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                            label="Email address"
                            type="email"
                            md={12}
                            lg={12}
                        />
                        <CommonSelectField
                            label={'Role'}
                            xs={12}
                            sm={12}
                            md={12}
                            lg={12}
                            value={values.role}
                            options={teacherRole}
                            error={errors.role}
                            touched={touched.role}
                            onChange={(e) =>
                                handleChange({
                                    target: { name: 'role', value: e.target.value }
                                })
                            }
                            onBlur={(ev) =>
                                handleBlur({
                                    target: { name: 'role', value: ev.target.value }
                                })
                            }
                        />

                        {!defaultValues?.id ? (
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
                        ) : null}

                        {defaultValues &&
                            (defaultValues?.userStatus === 'ACTIVE' || defaultValues?.userStatus === 'DEACTIVATED') &&
                            defaultValues?.id !== token?.sub && (
                                <CommonCheckBox
                                    name="isDeactivated"
                                    checked={values.isDeactivated}
                                    error={errors.isDeactivated}
                                    touched={touched.isDeactivated}
                                    onChange={handleChange}
                                    label="Deactivated (prevents user from logging in)"
                                />
                            )}
                    </DialogWrapper>
                )}
            </Formik>

            <ConfirmationModal
                open={openConfirmationModal}
                onCancel={() => setOpenConfirmationModal(!openConfirmationModal)}
                onConfirm={() => setOpenConfirmationModal(!openConfirmationModal)}
                heading="User type changed"
                btnText="Ok"
                cancelBtn={false}>
                Please allow 5 minutes for this change to fully take effect.
            </ConfirmationModal>
        </>
    );
};

export default AddTeacherModal;
