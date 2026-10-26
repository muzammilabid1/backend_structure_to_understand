import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { sendNotification } from '../../../graphQl/mutations';
import { ThemeContext } from '../../../shared/Services/handler';
import { TestEmailForAdminValidation } from '../../../shared/validations';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';

const TestEmailTemplate = ({ open, setOpen, selectedValue }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [sendNotificationMutation, { loading }] = useMutation(sendNotification);

    return (
        <Formik
            initialValues={{
                sentTo: ''
            }}
            enableReinitialize
            validationSchema={TestEmailForAdminValidation}
            onSubmit={(values, { resetForm }) => {
                const input = {};

                if (values?.sentTo?.includes('@')) {
                    input['email'] = values?.sentTo;
                } else {
                    input['phoneNumber'] = values?.sentTo;
                }

                sendNotificationMutation({
                    variables: {
                        input: {
                            type: selectedValue?.type,
                            schoolIdOfTemplate: selectedValue?.school?.id,
                            ...input
                        }
                    }
                })
                    .then((res) => {
                        if (res?.data?.sendNotification) {
                            resetForm({
                                values: {
                                    sentTo: ''
                                }
                            });
                            setOpen();
                            callSnackbar('Email Sent successfully', 'success');
                        } else {
                            callSnackbar(
                                {
                                    graphQLErrors: [{ extensions: { exception: { status: 535 } } }],
                                    message: 'Email was not sent successfully'
                                },
                                'error'
                            );
                        }
                    })
                    .catch(({ ...err }) => {
                        setOpen();
                        callSnackbar(err, 'error');
                    });
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading}
                        dialogFooter
                        open={open}
                        setOpen={() => setOpen(!open)}
                        primaryBtnText={'Send Test Mail'}
                        primaryBtnDisabled={loading}
                        cancelBtn
                        heading={'Who is receiving this email?'}>
                        <InputField
                            type="sentTo"
                            label="Receiver's Email/Phone"
                            md={12}
                            lg={12}
                            name="sentTo"
                            value={values.sentTo}
                            onChange={(e) => {
                                handleChange({ target: { name: 'sentTo', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.sentTo}
                            touched={touched.sentTo}
                        />
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

TestEmailTemplate.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    selectedValue: PropTypes.object
};

TestEmailTemplate.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default TestEmailTemplate;
