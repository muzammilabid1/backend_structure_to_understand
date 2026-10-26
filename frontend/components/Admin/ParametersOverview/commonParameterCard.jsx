import { gql, useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import { makeStyles } from '@mui/styles';
import { Formik } from 'formik';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { resetUsersSavedPermissions, updateParameter } from '../../../graphQl/mutations';
import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, showDate, ThemeContext } from '../../../shared/Services/handler';
import DateField from '../../Shared/InputField/DateField';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonSelectField from './../../Shared/CommonSelectField';
import CommonTooltipIcon from './../../Shared/CommonTooltipIcon';
import Divider from './../../Shared/Divider';
import InputField from './../../Shared/InputField/InputField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

// Queries

const allParametersForCommonParameterCard = gql`
    query allParameters {
        allParameters {
            key
            value
            logCreatedAt
            logUpdatedAt
        }
    }
`;

const useStyles = makeStyles({
    button: {
        marginTop: '10px'
    }
});

const CommonParameterCard = ({ parameterContent, heading }) => {
    const classes = useStyles();
    const [allParams, setAllParams] = useState({});
    const [openResetModal, setOpenResetModal] = useState(false);
    const [saveConfirmation, setSaveConfirmation] = useState({ key: null, open: false, message: 'Are you sure?' });
    const { callSnackbar } = useContext(ThemeContext);
    const formikRefs = useMemo(
        () =>
            Array(parameterContent?.length)
                .fill(0)
                .map(() => React.createRef()),
        []
    );

    const [updateParameterMutation, { loading: updateParameterLoading }] = useMutation(updateParameter, {
        refetchQueries: [{ query: allParametersForCommonParameterCard }],
        awaitRefetchQueries: true
    });

    const [ResetPermission, { loading: resetPermissionLoading }] = useMutation(resetUsersSavedPermissions);
    const { error: error, data: allParametersData } = useQuery(allParametersForCommonParameterCard);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (allParametersData?.['allParameters']?.length) {
            const paramsObj = {};

            allParametersData?.['allParameters']?.forEach((param) => {
                paramsObj[param?.key] = param;
            });
            setAllParams(paramsObj);
        }
    }, [allParametersData]);

    const handleUpdateParamSubmit = async (values, actions) => {
        try {
            let { key, value } = values;

            if (!value) {
                const {
                    mandatory,
                    optional,
                    mandatory_info,
                    optional_info,
                    mandatory_privacy_text,
                    opted_out_summary,
                    opted_in_summary,
                    teacher_permission
                } = values;

                value = JSON.stringify({
                    mandatory: mandatory,
                    optional: optional,
                    mandatory_info: mandatory_info,
                    optional_info: optional_info,
                    mandatory_privacy_text: mandatory_privacy_text,
                    opted_out_summary: opted_out_summary,
                    opted_in_summary: opted_in_summary,
                    teacher_permission: teacher_permission
                });
            }

            if (key === 'MAGIC_LINK_TIMEOUT') {
                const { RESETPASSWORD, INVITATION, TOPICACCESS, REJECT_INVITATION, READING, TROPHY, DEMOTOPIC, SCHOOL_IMPACT_REPORT } =
                    values;

                value = JSON.stringify({
                    RESETPASSWORD,
                    INVITATION,
                    TOPICACCESS,
                    REJECT_INVITATION,
                    READING,
                    TROPHY,
                    DEMOTOPIC,
                    SCHOOL_IMPACT_REPORT
                });
            }

            if (key === 'MIN_BAD_LOGIN_ALLOWED') {
                const { PARENT, TEACHER, ADMIN } = values;

                value = JSON.stringify({ PARENT, TEACHER, ADMIN });
            }

            if (key === 'USER_LOCKED_ACCOUNT_TIMEOUT') {
                const { PARENT, TEACHER, ADMIN } = values;

                value = JSON.stringify({ PARENT, TEACHER, ADMIN });
            }

            if (key === 'MIN_PASSWORD_LENGTH') {
                const { PARENT, TEACHER, ADMIN } = values;

                value = JSON.stringify({ PARENT, TEACHER, ADMIN });
            }

            if (key === 'CLASS_LICENCE_PRICE') {
                const { FULL_PROGRAM, READING, READY_TEDDY } = values;

                value = JSON.stringify({ FULL_PROGRAM, READING, READY_TEDDY });
            }

            if (key === 'SITE_QUOTA') {
                const { EMAIL, SMS } = values;

                value = JSON.stringify({ EMAIL, SMS });
            }

            if (key === 'ADMIN_SOCIAL_LOGIN_PERMISSIONS') {
                const { email, google, microsoft } = values;

                value = JSON.stringify({ email, google, microsoft });
            }

            if (key === 'PARENT_SOCIAL_LOGIN_PERMISSIONS') {
                const { google, microsoft } = values;

                value = JSON.stringify({ google, microsoft });
            }

            if (
                key === 'WEEKDAY_PARENT_NOTIFICATION_TIME' ||
                key === 'WEEKEND_PARENT_NOTIFICATION_TIME' ||
                key === 'TEACHER_NOTIFICATION_TIME'
            ) {
                const { startTime, endTime } = values;

                value = JSON.stringify({ startTime, endTime });
            }

            key = _removeWhiteSpace(key);
            value = _removeWhiteSpace(value);
            actions.setSubmitting(true);

            await updateParameterMutation({
                variables: {
                    input: {
                        key,
                        value: value?.toString()
                    }
                }
            });
            callSnackbar('Update parameter successfully', 'success');
            actions.setSubmitting(false);
        } catch (error) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError(error, { caught: true, handled: false });
                callSnackbar(unexpectedError, 'error');
            }

            actions.setSubmitting(false);
        }
    };

    return (
        <div>
            {Object.keys(allParams).length > 0 ? (
                <Card className="p-20 mb-15">
                    <Heading2 text={heading} />

                    {(parameterContent || []).map(({ key, infoText, title, selectFeild, option, list, multiline, text }, index) => {
                        let permissionsValues = {
                            key: allParams[key]?.key
                        };

                        list?.map(({ title }) => {
                            return (permissionsValues[title] = JSON.parse(allParams[key]?.value ?? '{}')?.[`${title}`]);
                        });

                        return (
                            <>
                                {text && index > 0 ? <Divider customClass="mtb-20" /> : null}
                                <Paragraph text={text} />
                                <Divider customClass="mtb-20" />
                                <Formik
                                    initialValues={
                                        !list?.length
                                            ? {
                                                  key: allParams[key]?.key,
                                                  value: allParams[key]?.value === '{}' ? '' : allParams[key]?.value
                                              }
                                            : permissionsValues
                                    }
                                    innerRef={formikRefs[index]}
                                    enableReinitialize
                                    onSubmit={handleUpdateParamSubmit}>
                                    {({ values, handleChange, handleSubmit, handleBlur, errors, touched, isSubmitting }) => (
                                        <>
                                            {list?.length ? (
                                                list?.map(({ title, infoText, key, multiline, isDate, selectField }) => {
                                                    if (selectField) {
                                                        return (
                                                            <CommonSelectField
                                                                label={title}
                                                                options={option}
                                                                value={values?.[`${title}`]}
                                                                error={errors?.[`${title}`]}
                                                                touched={touched?.[`${title}`]}
                                                                name={title}
                                                                onBlur={(e) =>
                                                                    handleBlur({
                                                                        target: { name: title, value: e.target.value }
                                                                    })
                                                                }
                                                                onChange={(e) =>
                                                                    handleChange({
                                                                        target: { name: title, value: e.target.value }
                                                                    })
                                                                }
                                                                infoText={infoText}
                                                            />
                                                        );
                                                    } else if (isDate) {
                                                        return (
                                                            <DateField
                                                                name={title}
                                                                id={title}
                                                                label={title}
                                                                md={12}
                                                                lg={12}
                                                                value={new Date(values[`${title}`])}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                isGridRoot
                                                                clearable={false}
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <InputField
                                                                md={12}
                                                                lg={12}
                                                                label={key}
                                                                multiline={multiline}
                                                                rows={3}
                                                                value={values[`${title}`]}
                                                                name={title}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                error={errors.value}
                                                                touched={touched.value}
                                                                endCommonTooltipIcon={
                                                                    infoText ? (
                                                                        <CommonTooltipIcon text={infoText} customIconClass="skip-toolTip" />
                                                                    ) : null
                                                                }
                                                            />
                                                        );
                                                    }
                                                })
                                            ) : selectFeild ? (
                                                <CommonSelectField
                                                    label={title}
                                                    options={option}
                                                    value={values.value}
                                                    error={errors.value}
                                                    touched={touched.value}
                                                    name={'value'}
                                                    onBlur={(e) =>
                                                        handleBlur({
                                                            target: { name: 'value', value: e.target.value }
                                                        })
                                                    }
                                                    onChange={(e) =>
                                                        handleChange({
                                                            target: { name: 'value', value: e.target.value }
                                                        })
                                                    }
                                                    infoText={infoText}
                                                />
                                            ) : (
                                                <InputField
                                                    md={12}
                                                    lg={12}
                                                    label={title}
                                                    multiline={multiline}
                                                    rows={3}
                                                    value={values.value}
                                                    name={'value'}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors.value}
                                                    touched={touched.value}
                                                    endCommonTooltipIcon={
                                                        <CommonTooltipIcon text={infoText} customIconClass="skip-toolTip" />
                                                    }
                                                />
                                            )}
                                            {allParams[key]?.logCreatedAt && moment(allParams[key]?.logCreatedAt).get('year') > 1999 ? (
                                                <Paragraph
                                                    text={`Created at: ${showDate({ date: allParams[key]?.logCreatedAt, time: true })}`}
                                                />
                                            ) : null}
                                            {allParams[key]?.logUpdatedAt && moment(allParams[key]?.logCreatedAt).get('year') > 1999 ? (
                                                <Paragraph
                                                    text={`Updated at: ${showDate({ date: allParams[key]?.logUpdatedAt, time: true })}`}
                                                />
                                            ) : null}
                                            {key === 'COMMENT_PHOTO_PERMISSIONS' ? (
                                                <CardActions>
                                                    <LWPButton
                                                        color="inherit"
                                                        btnText={'Reset saved permissions'}
                                                        loading={isSubmitting}
                                                        onClick={() => setOpenResetModal(true)}
                                                    />
                                                    <LWPButton
                                                        btnText={'Save'}
                                                        dataTest="comment-photo-permissions-save-button"
                                                        loading={isSubmitting}
                                                        onClick={handleSubmit}
                                                    />
                                                </CardActions>
                                            ) : (
                                                <LWPButton
                                                    customClass={`${classes.button} ${key}`}
                                                    dataTest={`${key}-save-button`}
                                                    btnText={'Save'}
                                                    loading={isSubmitting}
                                                    onClick={handleSubmit}
                                                />
                                            )}
                                        </>
                                    )}
                                </Formik>
                            </>
                        );
                    })}
                </Card>
            ) : null}
            {openResetModal && (
                <ConfirmationModal
                    open={openResetModal}
                    btnText="Reset"
                    onCancel={() => setOpenResetModal(!openResetModal)}
                    onConfirm={() => {
                        ResetPermission()
                            .then(() => {
                                callSnackbar('reset successfully!', 'success');
                                setOpenResetModal(!openResetModal);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenResetModal(!openResetModal);
                            });
                    }}
                    loading={resetPermissionLoading}
                    heading="Are you sure?">
                    This will reset feedback permissions of all users.
                </ConfirmationModal>
            )}
            {saveConfirmation?.open && (
                <ConfirmationModal
                    open={saveConfirmation?.open}
                    btnText="Save"
                    onCancel={() =>
                        setSaveConfirmation({ key: null, open: false, message: 'This will only take effect after the server is rebooted' })
                    }
                    onConfirm={() => {
                        const parameterIndex = parameterContent?.findIndex((param) => param?.key === saveConfirmation?.key);

                        if (formikRefs?.[parameterIndex]?.current) {
                            formikRefs?.[parameterIndex]?.current?.handleSubmit();
                        }

                        setSaveConfirmation({ key: null, open: false, message: 'This will only take effect after the server is rebooted' });
                    }}
                    loading={updateParameterLoading}
                    heading="Are you sure?">
                    {saveConfirmation?.message}
                </ConfirmationModal>
            )}
        </div>
    );
};

CommonParameterCard.propTypes = {
    parameterContent: PropTypes.array,
    heading: PropTypes.string
};

export default CommonParameterCard;
