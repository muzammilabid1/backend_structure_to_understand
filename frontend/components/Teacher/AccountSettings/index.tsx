import { gql, useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext, useEffect } from 'react';

import { getUser, getUserForCommonDrawer } from '../../../graphQl/queries';
import { TEACHER, teacherRole, unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { adminSettingValidation, leaderSettingValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import CommonLoginOptions from '../../Shared/CommonLoginOptions';
import InputField from '../../Shared/InputField/InputField';
import Heading1 from '../../Shared/Typography/Heading1';

// Queries

const getUserForAccountSettingsTeacher = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            firstname
            lastname
            email
            nameForChildren
            type
            isSchoolLeader
            school {
                id
            }
        }
    }
`;

// Mutations

const updateTeacher = gql`
    mutation updateTeacher($input: UpdateTeacherInput!) {
        updateTeacher(input: $input) {
            id
        }
    }
`;

const updateAdmin = gql`
    mutation updateAdmin($input: UpdateAdminInput!) {
        updateAdmin(input: $input) {
            id
        }
    }
`;

const AccountSettingsTeacher = () => {
    const { userId, callSnackbar } = useContext(ThemeContext);

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForAccountSettingsTeacher, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    const [updateTeacherMutation, { loading }] = useMutation(updateTeacher, {
        refetchQueries: [
            { query: getUser, variables: { id: user?.getUser?.id } },
            { query: getUserForCommonDrawer, variables: { id: user?.getUser?.id } }
        ],
        awaitRefetchQueries: true
    });
    const [updateAdminMutation, { loading: updateAdminLoading }] = useMutation(updateAdmin, {
        refetchQueries: [
            { query: getUser, variables: { id: user?.getUser?.id } },
            { query: getUserForCommonDrawer, variables: { id: user?.getUser?.id } }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (getUserError?.message) callSnackbar(getUserError, 'error');
    }, [getUserError]);

    if (getUserLoading) return <CommonLoading />;

    return (
        <Formik
            initialValues={
                user?.getUser?.type === TEACHER
                    ? {
                          firstname: user?.getUser?.firstname,
                          lastname: user?.getUser?.lastname,
                          email: user?.getUser?.email,
                          nameForChildren: user?.getUser?.nameForChildren ?? ''
                      }
                    : {
                          firstname: user?.getUser?.firstname,
                          lastname: user?.getUser?.lastname,
                          email: user?.getUser?.email
                      }
            }
            validationSchema={user?.getUser?.type === TEACHER ? leaderSettingValidation : adminSettingValidation}
            enableReinitialize
            onSubmit={async (values) => {
                try {
                    const { firstname, lastname, email, nameForChildren } = values;

                    if (user?.getUser?.type === TEACHER) {
                        await updateTeacherMutation({
                            variables: {
                                input: {
                                    role: user?.getUser.isSchoolLeader ? teacherRole[1].key : teacherRole[0].key,
                                    id: user?.getUser?.id,
                                    firstname: _removeWhiteSpace(firstname),
                                    lastname: _removeWhiteSpace(lastname),
                                    email,
                                    nameForChildren: _removeWhiteSpace(nameForChildren),
                                    schoolId: user?.getUser?.school?.id
                                }
                            }
                        });
                    } else {
                        await updateAdminMutation({
                            variables: {
                                input: {
                                    id: user?.getUser?.id,
                                    firstname: _removeWhiteSpace(firstname),
                                    lastname: _removeWhiteSpace(lastname),
                                    email
                                }
                            }
                        });
                    }

                    callSnackbar('Changes saved', 'success');
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
                    <Heading1 text="Account settings" customClass="account-setting-heading" />
                    <Form>
                        <InputField
                            label="First name"
                            type="text"
                            value={values.firstname}
                            md={6}
                            lg={4}
                            name={'firstname'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.firstname}
                            touched={touched.firstname}
                        />
                        <InputField
                            label="Last name"
                            type="text"
                            value={values.lastname}
                            md={6}
                            lg={4}
                            name={'lastname'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.lastname}
                            touched={touched.lastname}
                        />
                        <InputField
                            label="Email"
                            type="email"
                            value={values.email}
                            md={6}
                            lg={4}
                            name={'email'}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                        />
                        {user?.getUser?.type === TEACHER ? (
                            <InputField
                                label="Name for children"
                                type="text"
                                placeholder="e.g. Ms Smith"
                                md={6}
                                lg={4}
                                value={values.nameForChildren}
                                name={'nameForChildren'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.nameForChildren}
                                touched={touched.nameForChildren}
                            />
                        ) : null}
                        <LWPButton btnText="Update details" onClick={handleSubmit} loading={loading || updateAdminLoading} />
                    </Form>
                    {user?.getUser?.type === TEACHER && user?.getUser?.id ? <CommonLoginOptions userId={user?.getUser?.id} /> : null}
                </>
            )}
        </Formik>
    );
};

export default AccountSettingsTeacher;
