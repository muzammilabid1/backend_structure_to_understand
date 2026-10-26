/* eslint-disable @next/next/no-img-element */
import { useMutation, useQuery } from '@apollo/client';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import { Form, Formik } from 'formik';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { addContact } from '../../../../graphQl/mutations';
import { getParameters, getTeacherFAQs } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, unexpectedError } from '../../../../shared/Constant';
import formInitialStates from '../../../../shared/formInitialStates';
import { _removeWhiteSpace, handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { askQuestionValidation } from '../../../../shared/validations';
import { IStaticLwpFAQ } from '../../../../types/entities/IStaticLwpFAQ';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonLoading from '../../../Shared/CommonLoading';
import DialogWrapper from '../../../Shared/DialogWrapper';
import InputField from '../../../Shared/InputField/InputField';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import FaqCard from './FaqCard';

const transformArray = (teacherFaqs: Array<IStaticLwpFAQ>) => {
    const col1: Array<IStaticLwpFAQ> = [];
    const col2: Array<IStaticLwpFAQ> = [];

    teacherFaqs.forEach((item, index) => {
        if (index % 2 === 0) col1.push(item);
        else col2.push(item);
    });

    return { col1, col2 };
};

const TeacherFaqs = () => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const [addContactMutation, { loading }] = useMutation(addContact);
    const [expandedFaqId, setExpandedFaqId] = useState<string>('');
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    const isMd = useMediaQuery(theme.breakpoints.down('md'));

    const {
        data: faqsData,
        loading: faqsLoading,
        error: faqsError
    } = useQuery(getTeacherFAQs, {
        skip: !token,
        variables: { forSchoolLeader: token?.isSchoolLeader }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, faqsError);
    }, [faqsError]);

    const { data: getParametersData, loading: getParametersLoading } = useQuery(getParameters, {
        variables: { keys: ['TEACHER_SUPPORT_EMAIL', 'TEACHER_SUPPORT_PHONE_NUMBER'] }
    });
    const [teacherSupportEmail, teacherSupportPhoneNumber] = getParametersData?.getParameters ?? [];

    const teacherFaqs: Array<IStaticLwpFAQ> = faqsData?.getTeacherFAQs || [];

    const mappedData = transformArray(teacherFaqs);

    return (
        <div className="teacher-faqs-container">
            <LWPButton
                btnText={'Help and resources'}
                startIcon="navigate_before"
                color="inherit"
                variant="text"
                size="medium"
                customClass="mb6"
                onClick={() => router?.push(`/school/${router?.query?.school_id}/resources`)}
            />
            <div className="teacher-faqs-content">
                <div className="faq-header">
                    <Heading1 text="Frequently Asked Questions" />
                    <LWPButton btnText="Ask a question" onClick={() => setOpen(true)} />
                </div>
                {faqsLoading || getParametersLoading ? (
                    <CommonLoading />
                ) : (
                    <>
                        {teacherFaqs?.length > 0 ? (
                            isMd ? (
                                <Grid container spacing={2} alignItems="stretch">
                                    {teacherFaqs.map((faq: IStaticLwpFAQ) => (
                                        <Grid key={faq.id} item xs={12} sm={6}>
                                            <FaqCard
                                                faq={faq}
                                                isExpaned={expandedFaqId === faq.id}
                                                onExpandChange={() => setExpandedFaqId(expandedFaqId === faq.id ? '' : faq.id)}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Grid container spacing={3}>
                                    <Grid item sm={6}>
                                        <Grid container spacing={2}>
                                            {mappedData?.col1?.map((faq: IStaticLwpFAQ) => (
                                                <Grid key={faq.id} item xs={12}>
                                                    <FaqCard
                                                        faq={faq}
                                                        isExpaned={expandedFaqId === faq.id}
                                                        onExpandChange={() => setExpandedFaqId(expandedFaqId === faq.id ? '' : faq.id)}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Grid>
                                    <Grid item sm={6}>
                                        <Grid container spacing={2}>
                                            {mappedData?.col2?.map((faq: IStaticLwpFAQ) => (
                                                <Grid key={faq.id} item xs={12}>
                                                    <FaqCard
                                                        faq={faq}
                                                        isExpaned={expandedFaqId === faq.id}
                                                        onExpandChange={() => setExpandedFaqId(expandedFaqId === faq.id ? '' : faq.id)}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Grid>
                                </Grid>
                            )
                        ) : null}

                        <div className="contact-info">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/question-icon.png`}
                            />
                            <div className="contact-info-details">
                                <Heading1 text="Contact us" />
                                <Paragraph>
                                    If you need help with something, you can email us at{' '}
                                    <Link passHref href={`mailto:${teacherSupportEmail?.value}`}>
                                        {teacherSupportEmail?.value}
                                    </Link>{' '}
                                    or phone us on <b>{teacherSupportPhoneNumber?.value}</b>.
                                </Paragraph>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {open ? (
                <DialogWrapper open={open} contentWidth="568px" onClose={() => setOpen(false)} setOpen={() => setOpen(false)}>
                    <Formik
                        initialValues={{ ...formInitialStates['askQuestion'] }}
                        validationSchema={askQuestionValidation}
                        onSubmit={async (values: { question: string }, { resetForm }) => {
                            try {
                                const { question } = values;

                                await addContactMutation({ variables: { input: { question: _removeWhiteSpace(question) } } });
                                resetForm();
                                setOpen(false);
                                callSnackbar('Thank you for contact us!', 'success');
                            } catch (error) {
                                const statusCode =
                                    error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                                if (statusCode) {
                                    callSnackbar(error, 'error');
                                } else {
                                    window.newrelic?.noticeError(error, { caught: true, handled: false });
                                    callSnackbar(unexpectedError, 'error');
                                }
                            }
                        }}>
                        {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                            <Form>
                                <div className="ask-question-dialog">
                                    <div className="ask-question-dialog-header">
                                        <Heading3 text="Ask a question" />
                                        <Paragraph text="If you don't see an answer to your question here, please let us know and we will get back to you." />
                                    </div>
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
                                    <div className="ask-question-dialog-footer">
                                        <LWPButton btnText="Cancel" color="inherit" disabled={loading} onClick={() => setOpen(false)} />
                                        <LWPButton btnText="Send question" onClick={handleSubmit} loading={loading} />
                                    </div>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </DialogWrapper>
            ) : null}
        </div>
    );
};

export default TeacherFaqs;
