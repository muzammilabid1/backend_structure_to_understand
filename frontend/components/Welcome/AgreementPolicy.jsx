/* eslint-disable @next/next/no-img-element */
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { welcomePageValidation } from '../../shared/validations';
import CommonCheckBox from '../Shared/CommonCheckBox';
import CommonLoading from '../Shared/CommonLoading';
import RenderHtml from '../Shared/CommonRenderHtml';
import DialogWrapper from '../Shared/DialogWrapper';

const AgreementPolicy = ({ onSubmitHandler, formikRef, termsAndConditions, privacyPolicy }) => {
    const [open, setOpen] = useState({ bool: false, key: '' });
    const [paramsKey, setParamsKey] = useState('');

    const toggle = (key) => {
        setOpen({ bool: true, key: key });
    };

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
        open.bool && fetchData();
    }, [open]);

    const renderContent = () => {
        let title = '';
        let filterCondition = () => false;

        if (open.key === 'TERMS_AND_CONDITIONS') {
            title = 'Terms and conditions';
            filterCondition = (data) => data?.title.rendered === 'Terms and conditions for users';
        } else if (open.key === 'PRIVATE_POLICY') {
            title = 'Privacy Policy';
            filterCondition = (data) => data?.title.rendered === 'Privacy and data protection';
        }

        if (termsAndConditions && open.key === 'TERMS_AND_CONDITIONS') {
            return (
                <>
                    <h1>{title}</h1>
                    <RenderHtml text={termsAndConditions} />
                </>
            );
        }

        if (privacyPolicy && open.key === 'PRIVATE_POLICY') {
            return (
                <>
                    <h1>{title}</h1>
                    <RenderHtml text={privacyPolicy} />
                </>
            );
        }

        return (
            <>
                <h1>{title}</h1>
                <RenderHtml text={(paramsKey || []).filter(filterCondition).map((data) => data?.content.rendered)} />
            </>
        );
    };

    return (
        <div className="interstitials-policy-container">
            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/parent-And-child-high-five.png`} />
            <Formik
                initialValues={{ policy: false }}
                innerRef={formikRef}
                validationSchema={welcomePageValidation}
                enableReinitialize
                onSubmit={onSubmitHandler}>
                {({ values, handleChange, errors, touched }) => {
                    return (
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="interstitials-policy">
                                <CommonCheckBox
                                    name="policy"
                                    checked={values.policy}
                                    error={errors.policy}
                                    touched={touched.policy}
                                    onChange={handleChange}
                                    dataTest={'interstitial-terms-checkbox'}>
                                    I agree to the Learning with Parents {''}
                                    <u onClick={() => toggle('TERMS_AND_CONDITIONS')}>terms and conditions</u> and{' '}
                                    <u onClick={() => toggle('PRIVATE_POLICY')}>privacy policy</u>.
                                </CommonCheckBox>
                            </div>
                        </form>
                    );
                }}
            </Formik>

            <DialogWrapper contentWidth="750px" open={open.bool} setOpen={() => setOpen({ bool: false })}>
                {paramsKey?.length ? renderContent() : <CommonLoading />}
            </DialogWrapper>
        </div>
    );
};

AgreementPolicy.propTypes = {
    onSubmitHandler: PropTypes.func,
    formikRef: PropTypes.object,
    termsAndConditions: PropTypes.string,
    privacyPolicy: PropTypes.string
};

export default AgreementPolicy;
