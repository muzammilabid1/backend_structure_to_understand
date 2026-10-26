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

const getFailedNotificationHistoryForFailedEmailsOverview = gql`
    query getFailedNotificationHistory($limit: Float) {
        getFailedNotificationHistory(limit: $limit) {
            results {
                id
                recipient
                emailTemplateType
                params
                error
                badParams
                logCreatedAt
            }
        }
    }
`;

const FailedEmailsOverview = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [failedEmailLog, setFailedEmailLog] = useState(null);

    const { loading, error: error, data: failedEmails } = useQuery(getFailedNotificationHistoryForFailedEmailsOverview);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const getFailedEmailType = (key) => {
        const template = TestEmailTypeOptions.find((template) => template?.key === key);

        return template ? template?.value : '-';
    };

    const showFailedEmailLogDetails = (failedLog) => {
        setFailedEmailLog(failedLog);
        setOpen(true);
    };

    const head = [
        {
            accessor: 'col1',
            Header: 'Type'
        },
        {
            accessor: 'col2',
            Header: 'Recipient'
        },
        {
            accessor: 'col3',
            Header: 'Log created at',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        },
        {
            accessor: 'col4',
            Header: '',
            width: '200'
        }
    ];

    const row = (failedEmails?.['getFailedNotificationHistory']?.['results'] || []).map((failedEmail) => {
        return {
            id: failedEmail?.id,
            col1: getFailedEmailType(failedEmail?.emailTemplateType),
            col2: failedEmail?.recipient,
            col3: failedEmail?.logCreatedAt,
            col4: (
                <>
                    <CommonIconButton
                        toolTipTitle={'Click to view details'}
                        disabled={!failedEmail?.params}
                        onClick={() => showFailedEmailLogDetails(failedEmail)}
                        icon={!failedEmail?.params ? 'visibility_off' : 'visibility'}
                    />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'failed-emails-page'}>
            <div className="header">
                <Heading2 text="Failed Emails" />
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
                            setFailedEmailLog(null);
                            setOpen(false);
                        }}
                        dialogFooter
                        cancelBtn>
                        <div>
                            <InputField label={'ID'} type="text" name="id" value={failedEmailLog?.id} disabled />
                            <InputField label={'Recipient'} type="text" name="recipient" value={failedEmailLog?.recipient} disabled />
                            <InputField
                                label={'Bad Parameters'}
                                type="text"
                                name="badParams"
                                value={failedEmailLog?.badParams?.length > 0 ? failedEmailLog?.badParams?.join(', ') : '-'}
                                disabled
                            />
                            <InputField
                                label={'Error'}
                                type="text"
                                name="error"
                                multiline
                                value={JSON.stringify(JSON.parse(failedEmailLog?.error), null, 4)}
                                disabled
                            />
                            <InputField
                                label={'Parameters'}
                                type="text"
                                name="params"
                                multiline
                                value={JSON.stringify(JSON.parse(failedEmailLog?.params), null, 4)}
                                disabled
                            />
                        </div>
                    </DialogWrapper>
                </>
            ) : null}
        </div>
    );
};

export default FailedEmailsOverview;
