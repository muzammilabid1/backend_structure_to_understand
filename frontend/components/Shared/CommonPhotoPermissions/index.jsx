import { useMutation, useQuery } from '@apollo/client';
import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { savePhotoPermissions } from '../../../graphQl/mutations';
import { getParameterByKey } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { getHtml, ThemeContext } from '../../../shared/Services/handler';
import { photoPermissionsValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import CommonCheckBox from './../CommonCheckBox';
import CommonLoading from './../CommonLoading';
import RenderHtml from './../CommonRenderHtml';
import CommonTooltipIcon from './../CommonTooltipIcon';
import DialogWrapper from './../DialogWrapper';

const CommonPhotoPermissions = ({ sharingAllowed, user }) => {
    const { setHeaderTitle, userId, callSnackbar } = useContext(ThemeContext);
    const [savePhotoPermissionsMutation, { loading }] = useMutation(savePhotoPermissions);
    const [permissionParam, setPermissionParam] = useState(null);
    const [paramsKey, setParamsKey] = useState('');
    const [showPolicy, setShowPolicy] = useState(false);

    const {
        loading: getPermissionParameterLoading,
        error: permissionParamError,
        data: permissionParameter
    } = useQuery(getParameterByKey, {
        variables: { key: 'COMMENT_PHOTO_PERMISSIONS' }
    });

    useEffect(() => {
        permissionParamError?.message && callSnackbar(permissionParamError, 'error');
    }, [permissionParamError]);

    useEffect(() => setHeaderTitle('Account settings'), []);

    useEffect(() => {
        if (permissionParameter?.getParameterByKey?.value) {
            setPermissionParam(JSON.parse(permissionParameter?.getParameterByKey?.value));
        }
    }, [permissionParameter]);

    const fetchData = () => {
        fetch('https://learningwithparents.com/wp-json/wp/v2/snippets')
            .then((response) => response.json())
            .then((data) => {
                setParamsKey(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    useEffect(() => {
        showPolicy && fetchData();
    }, [showPolicy]);

    const schoolOrganisations = user?.pupils?.[0]?.pupil?.school?.organisations ?? '';
    const privacyPolicy = user?.pupils?.[0]?.pupil?.school?.privacyPolicy;

    if (getPermissionParameterLoading) return <CommonLoading />;

    return (
        <Formik
            initialValues={{
                askConsent: sharingAllowed == null ? 'true' : 'false',
                allowSharing: sharingAllowed === true ? true : false,
                dontAllowSharing: sharingAllowed == null ? false : true
            }}
            validationSchema={photoPermissionsValidation}
            enableReinitialize
            onSubmit={async (values) => {
                try {
                    await savePhotoPermissionsMutation({
                        variables: { id: userId, sharingAllowed: values?.askConsent === 'true' ? null : values?.allowSharing }
                    });
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
            {({ values, errors, touched, handleChange, handleSubmit }) => {
                return (
                    <>
                        <Form>
                            <Heading1 text="Photo permissions" customClass="mt16 pb8 account-settings-heading" />
                            <FormControl component="fieldset" className="radio-formcontrol" classes={{ root: 'root' }}>
                                <RadioGroup name="radioGroup" value={values.askConsent} onChange={handleChange}>
                                    <FormControlLabel
                                        checked={values.askConsent === 'false' ? true : false}
                                        value={'false'}
                                        name="askConsent"
                                        onChange={() => {
                                            handleChange({ target: { name: 'askConsent', value: 'false' } });
                                        }}
                                        control={<Radio classes={{ root: 'radio-check' }} />}
                                        classes={{ root: 'form-radio-check' }}
                                        label={
                                            <Paragraph text="Automatically consent to these terms every time I share a new photo with Learning with Parents." />
                                        }
                                    />

                                    <div className="ml8 align-items-center">
                                        <CommonCheckBox
                                            disabled={values.askConsent === 'true' ? true : false}
                                            error={errors.dontAllowSharing}
                                            touched={touched.dontAllowSharing}
                                            onChange={() => {
                                                handleChange({
                                                    target: {
                                                        name: 'dontAllowSharing',
                                                        value: !values.dontAllowSharing
                                                    }
                                                });

                                                if (!values.dontAllowSharing) {
                                                    handleChange({
                                                        target: {
                                                            name: 'allowSharing',
                                                            value: false
                                                        }
                                                    });
                                                }
                                            }}
                                            checked={values.dontAllowSharing === true ? true : false}>
                                            {getHtml(permissionParam?.mandatory, {
                                                ORGANISATIONS: schoolOrganisations
                                            })}{' '}
                                            <u
                                                className="cp"
                                                onClick={() => {
                                                    setShowPolicy(!showPolicy);
                                                }}>
                                                {getHtml(permissionParam?.mandatory_privacy_text, {
                                                    ORGANISATIONS: schoolOrganisations
                                                })}
                                            </u>
                                        </CommonCheckBox>
                                        {permissionParam?.mandatory_info && (
                                            <CommonTooltipIcon
                                                text={getHtml(permissionParam?.mandatory_info, {
                                                    ORGANISATIONS: schoolOrganisations
                                                })}
                                                customIconClass="skip-toolTip"
                                            />
                                        )}
                                    </div>
                                    <div className="ml8 mt2 align-items-center">
                                        <CommonCheckBox
                                            disabled={
                                                values.askConsent === 'true' ||
                                                (values.askConsent === 'false' && values.dontAllowSharing === false)
                                                    ? true
                                                    : false
                                            }
                                            checked={values.allowSharing && values.dontAllowSharing === true ? true : false}
                                            onChange={() => {
                                                handleChange({
                                                    target: {
                                                        name: 'allowSharing',
                                                        value: !values.allowSharing
                                                    }
                                                });
                                            }}
                                            label={getHtml(permissionParam?.optional, {
                                                ORGANISATIONS: schoolOrganisations
                                            })}
                                        />
                                        {permissionParam?.optional_info && (
                                            <CommonTooltipIcon
                                                text={getHtml(permissionParam?.optional_info, {
                                                    ORGANISATIONS: schoolOrganisations
                                                })}
                                                customIconClass="skip-toolTip"
                                            />
                                        )}
                                    </div>

                                    <FormControlLabel
                                        checked={values.askConsent === 'true' ? true : false}
                                        value={'true'}
                                        onChange={() => {
                                            handleChange({ target: { name: 'askConsent', value: 'true' } });
                                            handleChange({ target: { name: 'allowSharing', value: null } });
                                            handleChange({ target: { name: 'dontAllowSharing', value: null } });
                                        }}
                                        name="askConsent"
                                        className="mt10"
                                        control={<Radio classes={{ root: 'radio-check' }} />}
                                        label={
                                            <Paragraph text="Ask for my consent every time I share a new comment or photo with Learning with Parents." />
                                        }
                                        classes={{ root: 'form-radio-check' }}
                                    />
                                </RadioGroup>
                            </FormControl>
                            <LWPButton btnText="Save photo permissions" onClick={handleSubmit} loading={loading} />
                        </Form>
                        <DialogWrapper open={showPolicy} setOpen={() => setShowPolicy(!showPolicy)}>
                            {paramsKey?.length ? (
                                <>
                                    <h1>Privacy Policy</h1>
                                    {privacyPolicy ? (
                                        <RenderHtml text={privacyPolicy} />
                                    ) : (
                                        <RenderHtml
                                            text={(paramsKey || [])
                                                .filter((data) => data?.title.rendered === 'Privacy and data protection')
                                                .map((data) => data?.content.rendered)}
                                        />
                                    )}
                                </>
                            ) : (
                                <CommonLoading />
                            )}
                        </DialogWrapper>
                    </>
                );
            }}
        </Formik>
    );
};

CommonPhotoPermissions.propTypes = {
    sharingAllowed: PropTypes.bool,
    user: PropTypes.object
};

export default CommonPhotoPermissions;
