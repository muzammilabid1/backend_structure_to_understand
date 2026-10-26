import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { resetUserPassword, updateAdmin } from '../../../graphQl/mutations';
import { getUserForAdmin } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { updateParentValidationForAdmin } from '../../../shared/validations';
import LWPButton from './../../../components/Shared/Button/LWPButton';
import CommonCheckBox from './../../../components/Shared/CommonCheckBox';
import CommonLoading from './../../../components/Shared/CommonLoading';
import InputField from './../../../components/Shared/InputField/InputField';
import ResetPasswordModal from './../../../components/Shared/Modals/ResetPassword';
import Heading2 from './../../../components/Shared/Typography/Heading2';
import Heading3 from './../../../components/Shared/Typography/Heading3';

const AdminOverviewAdmin = () => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const queryParams = useParams();

    const [teacherName, setTeacherName] = useState('Teacher name');

    const {
        loading,
        error: error,
        data: admin
    } = useQuery(getUserForAdmin, { variables: { id: queryParams?.admin_id }, skip: !queryParams?.admin_id });

    const [resetUserPasswordMutation, { loading: resetPwdLoading }] = useMutation(resetUserPassword);
    const [updateAdminMutation, { loading: updateAdminLoading }] = useMutation(updateAdmin, {
        refetchQueries: [{ query: getUserForAdmin, variables: { id: queryParams?.admin_id } }],
        awaitRefetchQueries: true
    });

    const [link, setLink] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (admin) {
            setTeacherName(`${admin?.getUser?.firstname} ${admin?.getUser?.lastname}`);
        }
    }, [admin]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _getLink = (email) => {
        resetUserPasswordMutation({ variables: { email } })
            .then(({ data }) => {
                setLink(data?.resetUserPassword?.link);
                setOpen(true);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    if (loading) return <CommonLoading />;

    return (
        <div className="child_parent_detials">
            <Heading2 text={teacherName} />
            <Formik
                initialValues={{
                    firstname: admin?.getUser?.firstname,
                    lastname: admin?.getUser?.lastname,
                    email: admin?.getUser?.email,
                    techToolKit: admin?.getUser?.adminRestrictions?.techToolKit ? true : false,
                    siteData: admin?.getUser?.adminRestrictions?.siteData ? true : false,
                    siteAdmins: admin?.getUser?.adminRestrictions?.siteAdmins ? true : false,
                    isDeactivated:
                        admin?.getUser?.userStatus === 'DEACTIVATED' ? true : admin?.getUser?.userStatus === 'ACTIVE' ? false : null
                }}
                enableReinitialize
                validationSchema={updateParentValidationForAdmin}
                onSubmit={async (values) => {
                    try {
                        const { firstname, lastname, email, isDeactivated, siteAdmins, siteData, techToolKit } = values;

                        await updateAdminMutation({
                            variables: {
                                input: {
                                    firstname,
                                    lastname,
                                    email,
                                    isDeactivated,
                                    id: admin?.getUser?.id,
                                    adminRestrictionsInput: {
                                        siteAdmins,
                                        siteData,
                                        techToolKit
                                    }
                                }
                            }
                        });
                        callSnackbar('Admin updated!', 'success');
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
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <InputField
                            label="First name"
                            md={8}
                            lg={8}
                            name="firstname"
                            value={values.firstname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.firstname}
                            touched={touched.firstname}
                        />
                        <InputField
                            label="Last name"
                            md={8}
                            lg={8}
                            name="lastname"
                            value={values.lastname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.lastname}
                            touched={touched.lastname}
                        />

                        <InputField
                            type="email"
                            label="Email address"
                            md={8}
                            lg={8}
                            name="email"
                            value={values.email}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                        />

                        <CommonCheckBox
                            name="techToolKit"
                            checked={values.techToolKit}
                            error={errors.techToolKit}
                            touched={touched.techToolKit}
                            onChange={handleChange}
                            label="Restrict Tech toolkit access"
                        />
                        <CommonCheckBox
                            name="siteData"
                            checked={values.siteData}
                            error={errors.siteData}
                            touched={touched.siteData}
                            onChange={handleChange}
                            label="Restrict Site data access"
                        />
                        <CommonCheckBox
                            name="siteAdmins"
                            checked={values.siteAdmins}
                            error={errors.siteAdmins}
                            touched={touched.siteAdmins}
                            onChange={handleChange}
                            label="Restrict Site admins access"
                        />

                        {admin?.getUser?.id !== token?.sub && (
                            <CommonCheckBox
                                name="isDeactivated"
                                checked={values.isDeactivated}
                                error={errors.isDeactivated}
                                touched={touched.isDeactivated}
                                onChange={handleChange}
                                label="Deactivated (prevents user from logging in)"
                            />
                        )}

                        <LWPButton btnText="Update details" onClick={handleSubmit} loading={updateAdminLoading} />
                    </Form>
                )}
            </Formik>

            <div className="reset_password">
                <Heading3 text={'Reset password'} />
                <LWPButton btnText="Reset password" loading={resetPwdLoading} onClick={() => _getLink(admin?.getUser?.email)} />
            </div>
            {open && <ResetPasswordModal name={teacherName} link={link} open={open} setOpen={setOpen} />}
        </div>
    );
};

export default AdminOverviewAdmin;
