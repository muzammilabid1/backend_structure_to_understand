import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert } from '@mui/material';
import { FieldArray, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { getSchoolClassForActivateClass } from '../../../pages/class/[class_id]/activate';
import { unexpectedError } from '../../../shared/Constant';
import { getExternalResourcesLink, getPluralizedLabel, ThemeContext } from '../../../shared/Services/handler';
import { purchaseClassModalValidation } from '../../../shared/validations';
import CommonCheckBox from '../CommonCheckBox';
import CommonLoading from '../CommonLoading';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import Link from 'next/link';
import LWPButton from '../Button/LWPButton';
import { enableMoneySkillsForSchool } from '../../../graphQl/mutations';
import { getSchoolForSchoolOverviewPage } from '../../../graphQl/queries';

// Queries

const getSchoolForPurchaseClassModal = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            numOfTotalClassesAllowed
            numOfFullProgrammeClassesAllowed
            isReadyTeddyEnabled
            isReadyTeddyAvailable
            isMoneySkillsAvailable
        }
    }
`;

const getParameterByKeyForPurchaseClassModal = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

// Mutations

const purchaseAdditionalClassLicencesForPurchaseClassModal = gql`
    mutation purchaseAdditionalClassLicences($input: PurchaseAdditionalClassLicencesInput!) {
        purchaseAdditionalClassLicences(input: $input)
    }
`;

const PurchaseClassModal = ({ open, setOpen, className, schoolId, classId, isAdminSide, onMoneySkillsActivated }) => {
    const [classLicensePrices, setclassLicensePrices] = useState({ fullProgramme: 0, readingOnly: 0, readyTeddy: 0 });
    // Local flag to immediately reflect activation after a successful mutation,
    // preventing a stale in-flight useQuery response from overwriting the cache
    // and causing the UI to flicker back to "not activated".
    const [isMoneySkillsActivatedLocally, setIsMoneySkillsActivatedLocally] = useState(false);
    const { callSnackbar, token } = useContext(ThemeContext);
    const {
        error: error,
        data: schoolData,
        loading: getSchoolLoading
    } = useQuery(getSchoolForPurchaseClassModal, {
        variables: { id: schoolId?.toString() }
    });
    const {
        loading: classLicensePriceLoading,
        error: classLicensePriceParamError,
        data: classLicensePriceParameter
    } = useQuery(getParameterByKeyForPurchaseClassModal, {
        variables: { key: 'CLASS_LICENCE_PRICE' }
    });
    const isReadyTeddyEnabledForPurchaseLicence =
        (schoolData?.getSchool?.isReadyTeddyEnabled || isAdminSide) && !schoolData?.getSchool?.isReadyTeddyAvailable;

    const refetchQueries = [{ query: getSchoolForSchoolOverviewPage, variables: { id: schoolId } }];

    if (classId) refetchQueries.push({ query: getSchoolClassForActivateClass, variables: { id: classId } });

    let [purchaseAdditionalClassLicencesMutation, { loading: purchaseAdditionalClassLicencesLoading }] = useMutation(
        purchaseAdditionalClassLicencesForPurchaseClassModal,
        {
            refetchQueries,
            awaitRefetchQueries: true
        }
    );

    const [activateMoneySkillsLicenceInSchoolMutation, { loading: activateMoneySkillsLoading }] = useMutation(enableMoneySkillsForSchool);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        classLicensePriceParamError?.message && callSnackbar(classLicensePriceParamError, 'error');
    }, [error?.message, classLicensePriceParamError?.message]);

    useEffect(() => {
        if (classLicensePriceParameter?.getParameterByKey?.value) {
            const classLicensePriceParsed = JSON.parse(classLicensePriceParameter?.getParameterByKey?.value);

            setclassLicensePrices({
                fullProgramme: +classLicensePriceParsed?.FULL_PROGRAM,
                readingOnly: +classLicensePriceParsed?.READING,
                readyTeddy: +classLicensePriceParsed?.READY_TEDDY
            });
        }
    }, [classLicensePriceParameter?.getParameterByKey?.value]);

    const schoolDetails = useMemo(() => schoolData?.getSchool ?? null, [schoolData]);

    // Combine the server-sourced flag with the local one so that a successful
    // activation is reflected immediately and cannot be reversed by a stale
    // in-flight network response overwriting the Apollo cache.
    const isMoneySkillsAvailable = isMoneySkillsActivatedLocally || schoolDetails?.isMoneySkillsAvailable;

    const calculateTotalCost = (values) => {
        const fullProgrammeTotal = values?.fullProgrammeCount * classLicensePrices?.fullProgramme;
        const readingLogTotal = values?.readingLogCount * classLicensePrices?.readingOnly;
        const readyTeddyTotal = isReadyTeddyEnabledForPurchaseLicence ? values?.readyTeddyCount * classLicensePrices?.readyTeddy : 0;
        const upgradeTotal =
            values?.upgradeExistingReadingClassCount * (classLicensePrices?.fullProgramme - classLicensePrices?.readingOnly);

        return fullProgrammeTotal + readingLogTotal + upgradeTotal + readyTeddyTotal;
    };

    const handleChangeAndCalculate = (handleChange, name, value) => {
        handleChange({ target: { name, value: parseInt(value) ? parseInt(value) : 0 } });
    };

    const fullProgramClassCount = schoolDetails?.numOfFullProgrammeClassesAllowed;
    const readingLogClassCount = schoolDetails?.numOfTotalClassesAllowed - fullProgramClassCount;

    const handleActivate = async () => {
        try {
            await activateMoneySkillsLicenceInSchoolMutation({
                variables: { schoolId: schoolId },
                awaitRefetchQueries: true,
                refetchQueries: [
                    {
                        query: getSchoolForPurchaseClassModal,
                        variables: { id: schoolId }
                    }
                ]
            });

            setIsMoneySkillsActivatedLocally(true);
            if (onMoneySkillsActivated) onMoneySkillsActivated();
            callSnackbar('Money Skills programme activated', 'success');
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    if (getSchoolLoading || classLicensePriceLoading) return <CommonLoading />;

    return (
        <div>
            <Formik
                initialValues={{
                    emails: [token?.email],
                    fullProgrammeCount: 0,
                    readingLogCount: 0,
                    readyTeddyCount: 0,
                    upgradeExistingReadingClassCount: 0,
                    authorizationCheckbox: false,
                    atLeastOneFieldRequired: '',
                    upgradeClassCount: schoolDetails?.numOfTotalClassesAllowed - schoolDetails?.numOfFullProgrammeClassesAllowed
                }}
                validationSchema={purchaseClassModalValidation}
                onSubmit={async (values) => {
                    try {
                        const fullProgrammeClassesCount =
                            +values?.fullProgrammeCount +
                            +values?.upgradeExistingReadingClassCount +
                            +schoolDetails?.numOfFullProgrammeClassesAllowed;

                        const totalClassCount =
                            +schoolDetails?.numOfTotalClassesAllowed + +values?.fullProgrammeCount + +values?.readingLogCount;

                        const totalPrice = calculateTotalCost(values);

                        const input = {
                            schoolId: schoolId,
                            fullProgrammeClassesCount,
                            totalClassCount,
                            requestedFullProgrammeClassCount: +values?.fullProgrammeCount,
                            requestedReadingOnlyClassCount: +values?.readingLogCount,
                            requestedUpgradeClassCount: +values?.upgradeExistingReadingClassCount,
                            fullProgrammeClassPrice: classLicensePrices?.fullProgramme,
                            readingOnlyClassPrice: classLicensePrices?.readingOnly,
                            totalPrice,
                            emails: values?.emails
                        };

                        if (isReadyTeddyEnabledForPurchaseLicence) {
                            input.readyTeddyClassesCount = +values?.readyTeddyCount;
                            input.requestedReadyTeddyClassCount = +values?.readyTeddyCount;
                            input.readyTeddyClassPrice = classLicensePrices?.readyTeddy;
                        }

                        await purchaseAdditionalClassLicencesMutation({
                            variables: {
                                input
                            }
                        });
                        callSnackbar('Class licence purchase successful!', 'success');
                        setOpen();
                    } catch (error) {
                        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(error, 'error');
                        } else {
                            window.newrelic?.noticeError(error, { caught: true, handled: false });
                            callSnackbar(unexpectedError, 'error');
                        }

                        setOpen();
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    return (
                        <DialogWrapper
                            open={open}
                            setOpen={setOpen}
                            dialogFooter
                            cancelBtn
                            scroll="body"
                            primaryBtnText="Submit"
                            primaryBtnloading={purchaseAdditionalClassLicencesLoading}
                            primaryBtnDisabled={purchaseAdditionalClassLicencesLoading}
                            heading="Purchase additional class licences"
                            className={`purchase-additional-class-modal-container ${className}`}
                            contentWidth="700px"
                            primaryBtnHandler={handleSubmit}>
                            <div className="purchase-additional-class-modal">
                                <Paragraph
                                    text={
                                        'Please fill out this form for additional class licences. You will be able to use the additional licences immediately, and an invoice will be sent by email.'
                                    }
                                    style={{ marginBottom: '24px' }}
                                />
                                <form>
                                    <div className="purchase-additional-class-email">
                                        <FieldArray name="emails">
                                            {(arrayHelpers) => (
                                                <div>
                                                    {values.emails.map((email, index) => {
                                                        return (
                                                            <div
                                                                key={index}
                                                                style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                                                <InputField
                                                                    md={12}
                                                                    lg={12}
                                                                    type="text"
                                                                    label={`Email`}
                                                                    name={`emails.${index}`}
                                                                    value={values.emails[index]}
                                                                    disabled={index === 0 ? true : false}
                                                                    onChange={handleChange(`emails.${index}`)}
                                                                    onBlur={handleBlur(`emails.${index}`)}
                                                                    error={errors.emails && errors.emails[index]}
                                                                    touched={touched.emails && touched.emails[index]}
                                                                    helperText={
                                                                        index === 0 &&
                                                                        'This is the email address Learning with Parents will use for contacting and sending invoice'
                                                                    }
                                                                />
                                                                {index !== 0 && (
                                                                    <span
                                                                        className="material-icons cp"
                                                                        style={{ marginTop: '15px', color: '#00303C' }}
                                                                        onClick={() => arrayHelpers.remove(index)}>
                                                                        delete
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    <div
                                                        className="align-items-center cp"
                                                        onClick={() => {
                                                            if (values.emails[0] && !errors.emails) {
                                                                arrayHelpers.push('');
                                                            }
                                                        }}>
                                                        <span className="material-icons" style={{ color: '#00303C' }}>
                                                            add
                                                        </span>
                                                        <Paragraph
                                                            text="Add additional email address to be notified"
                                                            style={{ marginBottom: '0', fontWeight: '700', fontSize: '14px' }}
                                                            customClass="ml2"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </FieldArray>
                                        <div className="mt6">
                                            <Alert severity="info">
                                                You currently have licences for{' '}
                                                <b style={{ color: '#000' }}>
                                                    {fullProgramClassCount} {getPluralizedLabel(fullProgramClassCount, 'class', 'es')} using
                                                    the full programme
                                                </b>
                                                {' and '}
                                                <b style={{ color: '#000' }}>
                                                    {readingLogClassCount} {getPluralizedLabel(readingLogClassCount, 'class', 'es')} using
                                                    digital reading log only
                                                </b>
                                                .
                                            </Alert>
                                        </div>
                                        <div className="purchase-additional-class-price-field-container">
                                            <div className="purchase-additional-class-price-field">
                                                <div className="purchase-additional-class-price-field-error">
                                                    <Paragraph>
                                                        Additional class: Full programme (£{classLicensePrices?.fullProgramme} + VAT per
                                                        class per academic year)
                                                    </Paragraph>
                                                    {errors.fullProgrammeCount && touched.fullProgrammeCount && (
                                                        <div className="purchase-additional-class-price-field-error-text">
                                                            <span className="material-icons">error_outline</span>
                                                            <Paragraph>
                                                                {errors.atLeastOneFieldRequired
                                                                    ? errors.atLeastOneFieldRequired
                                                                    : errors.fullProgrammeCount}
                                                            </Paragraph>
                                                        </div>
                                                    )}
                                                </div>
                                                <InputField
                                                    md={12}
                                                    lg={12}
                                                    name={`fullProgrammeCount`}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    value={values.fullProgrammeCount}
                                                    onChange={(e) =>
                                                        handleChangeAndCalculate(handleChange, 'fullProgrammeCount', e.target.value)
                                                    }
                                                    onBlur={handleBlur}
                                                />
                                            </div>
                                            <div className="purchase-additional-class-price-field">
                                                <div className="purchase-additional-class-price-field-error">
                                                    <Paragraph>
                                                        Additional class: Digital reading log only (£{classLicensePrices?.readingOnly} + VAT
                                                        per class per academic year)
                                                    </Paragraph>
                                                    {errors.readingLogCount && touched.readingLogCount && (
                                                        <div className="purchase-additional-class-price-field-error-text">
                                                            <span className="material-icons">error_outline</span>
                                                            <Paragraph>{errors.readingLogCount}</Paragraph>
                                                        </div>
                                                    )}
                                                </div>
                                                <InputField
                                                    md={12}
                                                    lg={12}
                                                    name={`readingLogCount`}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    value={values.readingLogCount}
                                                    onChange={(e) =>
                                                        handleChangeAndCalculate(handleChange, 'readingLogCount', e.target.value)
                                                    }
                                                    onBlur={handleBlur}
                                                />
                                            </div>
                                            <div className="purchase-additional-class-price-field">
                                                <div className="purchase-additional-class-price-field-error">
                                                    <Paragraph>
                                                        Upgrade existing digital reading log only class to full programme (£
                                                        {classLicensePrices?.fullProgramme - classLicensePrices?.readingOnly} + VAT per
                                                        class per academic year)
                                                    </Paragraph>
                                                    {errors.upgradeClassCount && touched.upgradeClassCount && (
                                                        <div className="purchase-additional-class-price-field-error-text">
                                                            <span className="material-icons">error_outline</span>
                                                            <Paragraph>{errors.upgradeClassCount}</Paragraph>
                                                        </div>
                                                    )}
                                                </div>
                                                <InputField
                                                    md={12}
                                                    lg={12}
                                                    name={`upgradeExistingReadingClassCount`}
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    value={values.upgradeExistingReadingClassCount}
                                                    onChange={(e) =>
                                                        handleChangeAndCalculate(
                                                            handleChange,
                                                            'upgradeExistingReadingClassCount',
                                                            e.target.value
                                                        )
                                                    }
                                                    onBlur={handleBlur}
                                                    // error={errors.upgradeExistingReadingClassCount}
                                                    // touched={touched.upgradeExistingReadingClassCount}
                                                />
                                            </div>
                                            {isReadyTeddyEnabledForPurchaseLicence ? (
                                                <div className="purchase-additional-class-price-field">
                                                    <div className="purchase-additional-class-price-field-error">
                                                        <Paragraph>
                                                            Ready Teddy: How many reception classes will you have next year? (£
                                                            {classLicensePrices?.readyTeddy} + VAT per class per academic year, includes the
                                                            full programme)
                                                        </Paragraph>
                                                        {errors.readyTeddyCount && touched.readyTeddyCount && (
                                                            <div className="purchase-additional-class-price-field-error-text">
                                                                <span className="material-icons">error_outline</span>
                                                                <Paragraph>{errors.readyTeddyCount}</Paragraph>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <InputField
                                                        md={12}
                                                        lg={12}
                                                        name={`readyTeddyCount`}
                                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                        value={values.readyTeddyCount}
                                                        onChange={(e) =>
                                                            handleChangeAndCalculate(handleChange, 'readyTeddyCount', e.target.value)
                                                        }
                                                        onBlur={handleBlur}
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="money-skills-container">
                                                <Paragraph>
                                                    {isMoneySkillsAvailable ? (
                                                        'The Money Skills programme is available in all classes at no extra cost.'
                                                    ) : (
                                                        <>
                                                            The Money Skills programme can be activated for all classes using the digital
                                                            reading log or Maths and English at no extra cost.{' '}
                                                            <Link href={getExternalResourcesLink(token)} target="_blank">
                                                                Find out more
                                                            </Link>
                                                        </>
                                                    )}
                                                </Paragraph>

                                                {!isMoneySkillsAvailable ? (
                                                    <LWPButton
                                                        btnText="Activate Money Skills"
                                                        onClick={handleActivate}
                                                        loading={activateMoneySkillsLoading}
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
                                        <Heading3>Additional cost this year: {`£ ${calculateTotalCost(values)}`} + VAT</Heading3>
                                        <div className="purchase-additional-class-checkbox">
                                            <CommonCheckBox
                                                name="authorizationCheckbox"
                                                checked={values.authorizationCheckbox}
                                                error={errors.authorizationCheckbox}
                                                touched={touched.authorizationCheckbox}
                                                onChange={handleChange}
                                                label="I am authorised to sign up for this service on behalf of the school"
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </DialogWrapper>
                    );
                }}
            </Formik>
        </div>
    );
};

PurchaseClassModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    schoolId: PropTypes.number.isRequired,
    classId: PropTypes.number,
    className: PropTypes.string,
    isAdminSide: PropTypes.bool,
    onMoneySkillsActivated: PropTypes.func
};

export default PurchaseClassModal;
