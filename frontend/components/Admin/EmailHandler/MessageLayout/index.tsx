import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import CodeMirror from '@uiw/react-codemirror';
import React, { useContext, useEffect, useState } from 'react';

import CommonSnackbar from '../../../../components/Shared/CommonSnackbar';
import { handleErrorSnackbar, parseErrorDetails, ThemeContext } from '../../../../shared/Services/handler';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonLoading from '../../../Shared/CommonLoading';
import EmailTemplateButton from '../../../Shared/EmailTemplateButton';
import Paragraph from '../../../Shared/Typography/Paragraph';
import CodePreview from '../EditEmailTemplateForm/CodePreview';

const updateParameter = gql`
    mutation updateParameter($input: ParameterInput!) {
        updateParameter(input: $input) {
            key
            value
        }
    }
`;

const getParameterByKey = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

const emailTemplatePreview = gql`
    query emailTemplatePreview($input: EmailTemplatePreviewInput!) {
        emailTemplatePreview(input: $input)
    }
`;

const MessageLayout = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const [value, setValue] = useState('');
    const initialErrorMessage = { open: false, message: null };
    const [errorMessage, setErrorMessage] = useState(initialErrorMessage);

    const {
        data: getParameterData,
        loading: getParameterLoading,
        error: getParameterError
    } = useQuery(getParameterByKey, {
        variables: { key: 'DEFAULT_EMAIL_TEMPLATE_LAYOUT' },
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (getParameterError) {
            handleErrorSnackbar(callSnackbar, getParameterError);
        }
    }, [getParameterError]);

    const [updateParameterMutation, { loading: updateParameterLoading }] = useMutation(updateParameter);

    const [emailTemplatePreviewQuery, { data: emailTemplatePreviewData }] = useLazyQuery(emailTemplatePreview);

    const templatePreview = async (value: string) => {
        return new Promise((resolve, reject) => {
            return emailTemplatePreviewQuery({
                variables: {
                    input: {
                        wholeEmailContent: value,
                        emailOption: 'HTML'
                    }
                }
            })
                .then((result) => {
                    if (result.error) {
                        reject(result.error);
                    }

                    resolve(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    };

    useEffect(() => {
        if (getParameterData?.getParameterByKey) {
            setValue(getParameterData?.getParameterByKey?.value);
            templatePreview(getParameterData?.getParameterByKey?.value).catch((err) => callSnackbar(err, 'error'));
        }
    }, [getParameterData]);

    if (getParameterLoading) <CommonLoading />;

    return (
        <div>
            <CommonCard background="#F5F5F5">
                <>
                    <Paragraph
                        text={
                            'This is the default outline format for the emails created elsewhere in this section. You can use the following tags here (or conditionally use any others that may be supplied for a particular email):'
                        }
                    />
                    <br />
                    <EmailTemplateButton
                        list={['firstname', 'lastname', 'email', 'baseurl', 'heading', 'body', 'buttontext', 'link', 'previewline']}
                        preference="email"
                    />
                </>
            </CommonCard>
            <br />
            <CodePreview emailTemplatePreviewData={emailTemplatePreviewData?.emailTemplatePreview} noSms />
            <br />

            <CodeMirror
                placeholder="Layout code in HTML"
                onChange={(e) => setValue(e)}
                value={value}
                width="100%"
                className="resizable-editor"
                onBlur={() =>
                    templatePreview(value).catch((err) => {
                        setErrorMessage({
                            open: true,
                            message: parseErrorDetails(err)
                        });
                    })
                }
            />
            <br />

            <div style={{ display: 'flex', gap: 40, justifyContent: 'flex-end' }}>
                <LWPButton
                    btnText="Update"
                    loading={updateParameterLoading}
                    onClick={async () => {
                        try {
                            if (!value || value.trim() === '') {
                                setErrorMessage({
                                    open: true,
                                    message: 'Empty template is not allowed.'
                                });

                                return;
                            }

                            await templatePreview(value);
                            await updateParameterMutation({
                                variables: {
                                    input: {
                                        key: 'DEFAULT_EMAIL_TEMPLATE_LAYOUT',
                                        value: value
                                    }
                                }
                            });
                            callSnackbar('Updated', 'success');
                        } catch (err) {
                            setErrorMessage({
                                open: true,
                                message: parseErrorDetails(err)
                            });
                        }
                    }}
                />
            </div>
            <CommonSnackbar
                open={errorMessage?.open}
                type="error"
                autoHideDuration={30000}
                message={errorMessage?.message}
                onClose={() => setErrorMessage(initialErrorMessage)}
            />
        </div>
    );
};

export default MessageLayout;
