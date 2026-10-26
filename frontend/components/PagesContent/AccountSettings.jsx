import { gql, useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext, useEffect } from 'react';

import { updateParent } from '../../graphQl/mutations';
import { getUser } from '../../graphQl/queries';
import { PARENT, unexpectedError } from '../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../shared/Services/handler';
import { parentSettingValidation } from '../../shared/validations';
import CommonLoading from '../Shared/CommonLoading';
import CommonLoginOptions from '../Shared/CommonLoginOptions';
import LWPButton from './../../components/Shared/Button/LWPButton';
import CommonCloseMyAccountButton from './../../components/Shared/CommonCloseMyAccountButton';
import CommonNotificationSettings from './../../components/Shared/CommonNotificationSettings';
import CommonPhotoPermissions from './../../components/Shared/CommonPhotoPermissions';
import InputField from './../../components/Shared/InputField/InputField';
import Heading1 from './../../components/Shared/Typography/Heading1';

// Queries

const getUserForAccountSettingsParent = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            firstname
            lastname
            email
            phoneNumber
            notificationPreference
            sharingAllowed
            pupils {
                pupil {
                    school {
                        organisations
                        privacyPolicy
                    }
                }
            }
        }
    }
`;

const AccountSettingsParent = () => {
    const { setHeaderTitle, userId, callSnackbar } = useContext(ThemeContext);
    // const [phoneError, setPhoneError] = useState('');
    const phoneError = '';

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForAccountSettingsParent, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    const [updateParentMutation, { loading }] = useMutation(updateParent, {
        refetchQueries: [{ query: getUser, variables: { id: user?.getUser?.id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => setHeaderTitle('Account settings'), []);

    useEffect(() => {
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [getUserError]);

    if (getUserLoading) return <CommonLoading />;

    return (
        <Formik
            initialValues={{
                firstname: user?.getUser?.firstname,
                lastname: user?.getUser?.lastname,
                email: user?.getUser?.email,
                phoneNumber: user?.getUser?.phoneNumber
            }}
            validationSchema={parentSettingValidation}
            enableReinitialize
            onSubmit={async (values) => {
                try {
                    if (!phoneError) {
                        const { firstname, lastname, email, phoneNumber } = values;

                        await updateParentMutation({
                            variables: {
                                input: {
                                    id: user?.getUser?.id,
                                    firstname: _removeWhiteSpace(firstname),
                                    lastname: _removeWhiteSpace(lastname),
                                    email: email?.trim().length ? email : null,
                                    phoneNumber
                                }
                            }
                        });
                        callSnackbar('Changes saved', 'success');
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
                    <div className="setting-container">
                        {/* <div className="desktop-btn">
                            <LWPButton
                                btnText="Go back"
                                startIcon="navigate_before"
                                color="inherit"
                                variant="text"
                                size="medium"
                                onClick={() => back()}
                            />
                        </div> */}
                        <Heading1 text="Account settings" centerText customClass="main-heading" />
                        <div className="setting-section">
                            <div className="setting-content parent-setting-content">
                                <Form>
                                    <InputField
                                        type="text"
                                        label="First name"
                                        md={8}
                                        lg={8}
                                        value={values.firstname}
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
                                        md={8}
                                        lg={8}
                                        name={'lastname'}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.lastname}
                                        touched={touched.lastname}
                                    />
                                    <InputField
                                        label="Email"
                                        type="email"
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
                                    <InputField
                                        label="Mobile number"
                                        md={8}
                                        lg={8}
                                        name="phoneNumber"
                                        value={values.phoneNumber}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.phoneNumber}
                                        touched={touched.phoneNumber}
                                    />

                                    <LWPButton btnText="Update details" onClick={handleSubmit} loading={loading} />
                                </Form>
                                <CommonLoginOptions userId={user?.getUser?.id} />
                                <CommonPhotoPermissions sharingAllowed={user?.getUser?.sharingAllowed} user={user?.getUser} />
                                <CommonNotificationSettings
                                    userId={user?.getUser?.id}
                                    notificationPreference={user?.getUser?.notificationPreference}
                                    viewType={PARENT}
                                />
                                <CommonCloseMyAccountButton />
                            </div>
                        </div>
                    </div>
                );
            }}
        </Formik>
    );
};

export default AccountSettingsParent;
