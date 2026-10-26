/* eslint-disable @next/next/no-img-element */
import { gql, useQuery } from '@apollo/client';
import { Chip, Grid, Tooltip } from '@mui/material';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { EmailTemplateStatus, MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, showDate, splitCamelCaseToString, ThemeContext } from '../../../../shared/Services/handler';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPopOver from '../../../Shared/CommonPopOver';
import CommonProgressBar from '../../../Shared/CommonProgressBar';
import SendTestEmail from '../EditEmailTemplate/SendTestEmail';
import MessageStats from './MessageStats';

const getAllEmailTemplateTypes = gql`
    query getAllEmailTemplateTypes {
        getAllEmailTemplateTypes
    }
`;

export const getEmailTemplates = gql`
    query getEmailTemplates {
        getEmailTemplates {
            id
            type
            logUpdatedAt
            sendEmail
            sendSms
            status
            logUpdatedBy {
                firstname
            }
            draft {
                sendEmail
                sendSms
                status
            }
            messageLogCount {
                clickedCount
                deliveredCount
                sentCount
                waitingQueuedCount
                failedRejectedCount
            }
        }
    }
`;

// const deleteEmailTemplate = gql`
//     mutation deleteEmailTemplate($id: Float!) {
//         deleteEmailTemplate(id: $id) {
//             status
//             msg
//         }
//     }
// `;

const AutomatedMessages = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const initialmodalState = { testEmail: false, type: null, hasTemplate: null };
    const [openConfirmationModal, setConfirmationModal] = useState(initialmodalState);

    const { error: getAllEmailError, data: getAllEmailData, loading: getAllEmailLoading } = useQuery(getAllEmailTemplateTypes);
    const { error: getEmailError, data: getEmailData, loading: getEmailLoading } = useQuery(getEmailTemplates);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, getAllEmailError);
        handleErrorSnackbar(callSnackbar, getEmailError);
    }, [getAllEmailError, getEmailError]);

    const emailListActions = (emailData) => {
        const hasTemplate = {
            sendEmail: emailData?.sendEmail,
            sendSms: emailData?.sendSms,
            status: emailData?.status
        };

        return [
            {
                text: 'Test mail',
                icon: 'mail',
                disabled: !emailData?.status || emailData?.draft,
                onClick: () => {
                    setConfirmationModal({ testEmail: true, type: emailData?.type, hasTemplate });
                }
            },

            {
                text: hasTemplate ? 'Edit' : 'Add',
                icon: hasTemplate ? 'edit' : 'add',
                onClick: () =>
                    router?.push(
                        emailData?.id
                            ? `/admin/email-templates/edit-email/${emailData?.id}`
                            : `/admin/email-templates/edit-email?type=${emailData?.type}`
                    )
            }
        ]?.filter((item) => !item?.disabled);
    };

    const header = [
        {
            Header: 'Type',
            accessor: 'col1',
            width: 250,
            minWidth: 100,
            maxWidth: 300
        },

        {
            Header: '',
            accessor: 'col2',
            Cell: (params) => {
                const isDraftTemplate = params?.value?.draft;

                const isSendSms = isDraftTemplate ? params?.value?.draft?.sendSms : params?.value?.sendSms;

                const isSendEmail = isDraftTemplate ? params?.value?.draft?.sendEmail : params?.value?.sendEmail;

                return (
                    <div className="template_type">
                        {isSendEmail && (
                            <span className={isDraftTemplate ? 'draft-icon' : ''}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/emailIcon.svg`}
                                    alt="sendEmail"
                                />
                            </span>
                        )}
                        {isSendSms && (
                            <span className={isDraftTemplate ? 'draft-icon' : ''}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/smsIcon.svg`}
                                    alt="sendSms"
                                />
                            </span>
                        )}
                    </div>
                );
            },
            width: 110,
            minWidth: 100,
            maxWidth: 300
        },

        {
            Header: 'Last updated',
            accessor: 'col3',
            sortType: (a, b) => {
                const dateA = a.original.id ? new Date(a.original.id) : new Date(0);
                const dateB = b.original.id ? new Date(b.original.id) : new Date(0);

                return dateA.getTime() - dateB.getTime();
            },
            width: 200,
            minWidth: 100,
            maxWidth: 300
        },
        {
            Header: 'Stats this month',
            accessor: 'col4',
            width: 100,
            minWidth: 100,
            maxWidth: 300
        },
        {
            Header: '',
            accessor: 'col5',
            width: 0,
            minWidth: 30,
            maxWidth: 30
        }
    ];

    const getAllEmailTypes = useMemo(() => {
        if (!getAllEmailData?.getAllEmailTemplateTypes || !getEmailData?.getEmailTemplates) return [];

        const emailTypes = getAllEmailData?.getAllEmailTemplateTypes ?? [];
        const emailContent = getEmailData?.getEmailTemplates ?? [];

        const draftEmailTemplates = emailContent?.reduce((acc, curr) => {
            const hasCurrentWithDraft = emailContent.find(
                (item) => item?.type === curr?.type && item?.status === EmailTemplateStatus.CURRENT && item?.draft
            );

            if (acc.some((item) => item?.type === curr?.type)) return acc;

            if (hasCurrentWithDraft || curr?.draft) {
                acc.push(hasCurrentWithDraft || curr);
            }

            return acc;
        }, []);

        const currentEmailTemplates = emailTypes
            .map((type: string) => {
                const currentTemplate = emailContent?.find(
                    (template) => template.type == type && template?.status == EmailTemplateStatus.CURRENT
                );

                const draftTemplate = emailContent?.find(
                    (template) => template.type == type && template?.status == EmailTemplateStatus.DRAFT
                );

                if (!currentTemplate && !draftTemplate) return { type };

                return { ...(currentTemplate ?? draftTemplate), type, draft: null };
            })
            ?.filter((item) => item?.status == EmailTemplateStatus.CURRENT || !item?.logUpdatedAt);

        return [...currentEmailTemplates, ...draftEmailTemplates];
    }, [getAllEmailData, getEmailData]);

    const getAllEmail = getAllEmailTypes.map((emailData) => {
        const sumOfAllMessageCount =
            emailData?.messageLogCount?.clickedCount +
            emailData?.messageLogCount?.deliveredCount +
            emailData?.messageLogCount?.sentCount +
            emailData?.messageLogCount?.waitingQueuedCount +
            emailData?.messageLogCount?.failedRejectedCount;

        return {
            id: emailData?.logUpdatedAt,
            col1: (
                <Link
                    passHref
                    style={{ color: '#000' }}
                    href={{
                        pathname: '/admin/email-templates/message-logs',
                        query: { emailType: emailData?.type, open: true }
                    }}>
                    {splitCamelCaseToString(emailData?.type)}
                </Link>
            ),
            col2: emailData,
            col3: (
                <span>
                    {emailData?.logUpdatedAt
                        ? `${showDate({ date: emailData?.logUpdatedAt, time: true })} by ${emailData?.logUpdatedBy?.firstname}`
                        : '-'}

                    {emailData?.draft ? <Chip label={`Draft`} size="small" style={{ background: '#FDC300' }} /> : null}
                </span>
            ),
            col4: sumOfAllMessageCount ? (
                <Tooltip
                    className="message-stats-tooltip"
                    componentsProps={{
                        tooltip: {
                            sx: {
                                backgroundColor: '#ffff',
                                borderRadius: '5px',
                                padding: '20px 10px',
                                width: 'auto',
                                maxWidth: 'none',
                                whiteSpace: 'normal',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                            }
                        }
                    }}
                    title={<MessageStats notificationCount={emailData?.messageLogCount} type={emailData?.type} />}>
                    <Grid container>
                        <CommonProgressBar
                            statistics={[
                                {
                                    color: '#E8492A',
                                    count: emailData?.messageLogCount?.failedRejectedCount
                                },
                                {
                                    color: '#F28D00',
                                    count: emailData?.messageLogCount?.waitingQueuedCount
                                },
                                {
                                    color: '#FDC300',
                                    count: emailData?.messageLogCount?.sentCount
                                },
                                {
                                    color: '#C6DD84',
                                    count: emailData?.messageLogCount?.deliveredCount
                                },
                                {
                                    color: '#7F972A',
                                    count: emailData?.messageLogCount?.clickedCount
                                }
                            ]}
                        />
                    </Grid>
                </Tooltip>
            ) : (
                ''
            ),
            col5: (
                <CommonPopOver bold icon="more_horiz">
                    <CommonListWithIcon list={emailListActions(emailData)} />
                </CommonPopOver>
            ),
            rowClassName: emailData?.logUpdatedAt ? `${emailData?.draft ? 'row_draft' : ''}` : 'row_grey'
        };
    });

    if (getAllEmailLoading || getEmailLoading) return <CommonLoading />;

    return (
        <div>
            <Grid container direction="row" justifyContent="end" alignItems="center">
                <LWPButton
                    btnText="Go to message logs"
                    onClick={() => router?.push('/admin/email-templates/message-logs')}
                    endIcon="schedule"
                    variant="text"
                    color="inherit"
                />
            </Grid>
            <br />
            <div className="email_template_Table">
                <CommonDraggableTable columns={header} rows={getAllEmail} loading={getAllEmailLoading || getEmailLoading} />
            </div>

            <SendTestEmail
                open={openConfirmationModal?.testEmail}
                input={{
                    type: openConfirmationModal?.type
                }}
                hasTemplate={openConfirmationModal?.hasTemplate}
                setConfirmationModal={setConfirmationModal}
                initialmodalState={initialmodalState}
                automated={true}
            />
        </div>
    );
};

export default AutomatedMessages;
