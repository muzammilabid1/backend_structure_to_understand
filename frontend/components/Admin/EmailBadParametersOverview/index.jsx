import { gql, useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { TestEmailTypeOptions } from '../../../shared/Constant';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import DialogWrapper from './../../Shared/DialogWrapper';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';

// Queries

const getEmailTemplatesForEmailBadParametersOverview = gql`
    query getEmailTemplates {
        getEmailTemplates {
            id
            type
            logUpdatedAt
            badParams
            lwpNotification {
                id
                badParams
                recipient
                params
            }
        }
    }
`;

const EmailBadParametersOverview = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [emailTemplateLog, setEmailTemplateLog] = useState(null);
    const { loading, error: error, data: allEmailTemplates } = useQuery(getEmailTemplatesForEmailBadParametersOverview);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const getEmailTemplateType = (key) => {
        const template = TestEmailTypeOptions.find((template) => template?.key === key);

        return template ? template?.value : '-';
    };

    const showEmailTemplateLogDetails = (emailTemplateLog) => {
        setEmailTemplateLog(emailTemplateLog);
        setOpen(true);
    };

    const head = [
        {
            accessor: 'col1',
            Header: 'Type'
        },
        {
            accessor: 'col2',
            Header: 'Bad Parameters'
        },
        {
            accessor: 'col3',
            Header: 'Updated At',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col4, b.original?.col4)
        },
        {
            accessor: 'col4',
            Header: '',
            width: '200'
        }
    ];

    const row = (allEmailTemplates?.['getEmailTemplates'] || []).map((emailTemplate) => {
        return {
            id: emailTemplate?.id,
            col1: getEmailTemplateType(emailTemplate?.type),
            col2: emailTemplate?.badParams?.length > 0 ? emailTemplate?.badParams?.join(', ') : '-',
            col3: emailTemplate?.logUpdatedAt,
            col4: (
                <>
                    <CommonIconButton
                        toolTipTitle={'Click to view details'}
                        disabled={!emailTemplate?.lwpNotification}
                        onClick={() => showEmailTemplateLogDetails(emailTemplate?.lwpNotification)}
                        icon={!emailTemplate?.lwpNotification ? 'visibility_off' : 'visibility'}
                    />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'bad-email-parameters-page'}>
            <div className="header">
                <Heading2 text="Email Bad Parameters" />
            </div>

            <CommonDraggableTable rows={row} columns={head} />

            {open ? (
                <>
                    <DialogWrapper
                        className="email-bad-params-details"
                        contentWidth="750px"
                        open={open}
                        heading="Email Template Log Details"
                        setOpen={() => setOpen(false)}
                        onClose={() => {
                            setEmailTemplateLog(null);
                            setOpen(false);
                        }}
                        dialogFooter
                        cancelBtn>
                        <div>
                            <InputField label={'ID'} type="text" name="id" value={emailTemplateLog?.id} disabled />
                            <InputField label={'Recipient'} type="text" name="recipient" value={emailTemplateLog?.recipient} disabled />
                            <InputField
                                label={'Bad Parameters'}
                                type="text"
                                name="badParams"
                                value={emailTemplateLog?.badParams?.length > 0 ? emailTemplateLog?.badParams?.join(', ') : '-'}
                                disabled
                            />
                            <InputField
                                label={'Parameters'}
                                type="text"
                                name="params"
                                multiline
                                value={JSON.stringify(JSON.parse(emailTemplateLog?.params), null, 4)}
                                disabled
                            />
                        </div>
                    </DialogWrapper>
                </>
            ) : null}
        </div>
    );
};

export default EmailBadParametersOverview;
