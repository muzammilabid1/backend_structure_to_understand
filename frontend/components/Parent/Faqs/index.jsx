import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import gql from 'graphql-tag';
import Link from 'next/link';
import React, { useContext, useEffect } from 'react';

import { addContact } from '../../../graphQl/mutations';
import { getParameters } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { ThemeContext } from '../../../shared/Services/handler';
import { askQuestionValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import InputField from './../../Shared/InputField/InputField';
import NameValue from './../../Shared/NameValue';
import Heading1 from './../../Shared/Typography/Heading1';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

// Queries

const getParentFAQs = gql`
    query getParentFAQs {
        getParentFAQs {
            id
            answer
            question
        }
    }
`;

const ParentFaqs = () => {
    const { setHeaderTitle, callSnackbar } = useContext(ThemeContext);
    const { error, data: faqs } = useQuery(getParentFAQs);
    const [addContactMutation, { loading }] = useMutation(addContact);

    const { data: getParametersData } = useQuery(getParameters, {
        variables: { keys: ['PARENT_SUPPORT_EMAIL', 'GENERAL_SUPPORT_PHONE_NUMBER'] }
    });
    const [generalSupportEmail, generalSupportPhoneNumber] = getParametersData?.getParameters ?? [];

    useEffect(() => setHeaderTitle('FAQs'), []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <>
            <Heading1 text="Frequently Asked Questions" centerText customClass="main-heading" />
            {(faqs?.getParentFAQs || []).map((faq) => (
                <NameValue
                    key={faq.id}
                    primaryText={faq.question}
                    headingClass={'paragraph-bold'}
                    secondaryText={faq.answer}
                    customClass="mb12"
                />
            ))}

            <NameValue
                h2
                primaryText="Ask a question"
                secondaryText={"If you don't see an answer to your question here, please let us know and we will get back to you."}
                customClass="mb8"
            />

            <Formik
                initialValues={{ ...formInitialStates['askQuestion'] }}
                validationSchema={askQuestionValidation}
                onSubmit={async (values, { resetForm }) => {
                    try {
                        const { question } = values;

                        await addContactMutation({ variables: { input: { question } } });
                        resetForm({ values: '' });
                        callSnackbar('Question submitted', 'success');
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
                    <Form className="faq-container">
                        <InputField
                            placeholder="Your question goes here."
                            label="Ask a question"
                            type="text"
                            multiline
                            rows={4}
                            md={8}
                            lg={8}
                            name="question"
                            value={values.question}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.question}
                            touched={touched.question}
                        />
                        <LWPButton btnText="Send question" onClick={handleSubmit} loading={loading} />
                    </Form>
                )}
            </Formik>

            <div className="mt14 contact-container">
                <Heading2 text={'Contact us'} />
                <Paragraph>
                    If you need help with something, you can email us at{' '}
                    <Link passHref href={`mailto:${generalSupportEmail?.value}`}>
                        {generalSupportEmail?.value}
                    </Link>{' '}
                    or phone us on <b>{generalSupportPhoneNumber?.value}</b>.
                </Paragraph>
            </div>
        </>
    );
};

export default ParentFaqs;
