import { gql, useLazyQuery } from '@apollo/client';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Chip, Grid, TablePagination } from '@mui/material';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import {
    capitalizeFirstLetter,
    handleErrorSnackbar,
    showDate,
    splitCamelCaseToString,
    ThemeContext
} from '../../../../shared/Services/handler';
import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonDraggableTable from '../../../Shared/CommonDraggableTable';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPopOver from '../../../Shared/CommonPopOver';
import CommonProgressBar from '../../../Shared/CommonProgressBar';
import DialogWrapper from '../../../Shared/DialogWrapper';
import InputField from '../../../Shared/InputField/InputField';
import Heading2 from '../../../Shared/Typography/Heading2';
import Heading3 from '../../../Shared/Typography/Heading3';
import Breadcrumb from './../../../../components/Parent/Breadcrumb';
import CommonIconButton from './../../../../components/Shared/Button/CommonIconButton';
import MesaageLogFilter from './MesaageLogFilter';
import StatusStats from './StatusStats';

const getMessageLogsCount = gql`
    query getMessageLogsCount($input: MessageLogFilterInput!) {
        getMessageLogsCount(input: $input) {
            clickedCount
            openedCount
            deliveredCount
            sentCount
            waitingQueuedCount
            failedRejectedCount
            totalMessage
        }
    }
`;

const getAllNotificationHistory = gql`
    query getAllNotificationHistory($limit: Float!, $offset: Float!, $input: MessageLogFilterInput) {
        getAllNotificationHistory(limit: $limit, offset: $offset, input: $input) {
            total
            page_total
            results {
                id
                recipient
                emailTemplateType
                badParams
                params
                error
                logCreatedAt
                statusHistory {
                    status
                    logCreatedAt
                }
            }
        }
    }
`;

const getNotificationPreview = gql`
    query getNotificationPreview($notifId: String!) {
        getNotificationPreview(notifId: $notifId) {
            html
            subject
        }
    }
`;

const MessageLogs = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentLimit = 100;

    const [page, setPage] = useState(0);
    const [userNotification, setUserNotification] = useState(null);
    const [openPreview, setOpenPreview] = useState(false);

    const parsedStatus = JSON.parse(searchParams.get('status') ?? '[]');
    const parsedRecipient = JSON.parse(searchParams.get('recipient') ?? '[]');

    const from = searchParams.get('from') ? searchParams.get('from') : null;
    const until = searchParams.get('until') ? searchParams.get('until') : null;
    const status = parsedStatus?.map((key: string) => sharedJson?.statusOption.find((option) => option.key === key)).filter(Boolean);
    const recipient = parsedRecipient?.map((key: string) => ({ value: key, key }));
    const emailType = searchParams.get('emailType')?.length > 0 ? searchParams.get('emailType') : null;
    const messageType = searchParams.get('messageType')?.length > 0 ? searchParams.get('messageType') : null;
    const search = searchParams.get('search')?.length > 0 ? searchParams.get('search') : null;

    const input = {
        from,
        until,
        emailType,
        status,
        recipient,
        messageType,
        search
    };

    const [messageLogsCountQuery, { error: notificationCountError, data: notificationCountData, loading: notificationCountLoading }] =
        useLazyQuery(getMessageLogsCount);

    const [
        allNotificationHistoryQuery,
        { error: allNotificationHistoryError, data: allNotificationHistoryData, loading: allNotificationHistoryLoading }
    ] = useLazyQuery(getAllNotificationHistory);

    const [getPreview, { loading: notificationLoading, data: notificationPreviewData }] = useLazyQuery(getNotificationPreview, {});

    useEffect(() => {
        if (router?.isReady) {
            onFilterSearch(input, false);
        }
    }, [router?.isReady]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, notificationCountError);
        handleErrorSnackbar(callSnackbar, allNotificationHistoryError);
    }, [notificationCountError, allNotificationHistoryError]);

    const onFilterSearch = async (value, pushToRoute = true) => {
        const input = {
            from: value?.afterDate ? moment(value?.afterDate).format('YYYY-MM-DD') : null,
            until: value?.beforeDate ? moment(value?.beforeDate).format('YYYY-MM-DD') : null,
            statuses: value?.status?.length > 0 ? value?.status?.map((item) => item?.key) : null,
            recipient: value?.recipient?.length > 0 ? value?.recipient?.map((item) => item?.key) : null,
            emailType: value?.emailType?.length > 0 ? value?.emailType : null,
            messageType: value?.messageType?.length > 0 ? value?.messageType : null,
            search: value?.search?.length > 0 ? value?.search : null
        };

        messageLogsCountQuery({
            variables: {
                input
            }
        });
        allNotificationHistoryQuery({
            variables: {
                limit: currentLimit,
                offset: 0,
                input
            }
        });
        setPage(0);

        if (!pushToRoute) return;

        router?.push(
            {
                pathname: `/admin/email-templates/message-logs`,
                query: {
                    ...input,
                    status: JSON.stringify(input?.statuses),
                    recipient: JSON.stringify(input?.recipient),
                    messageType: input.messageType,
                    open: !!value?.open
                }
            },
            undefined,
            { scroll: false }
        );
    };

    const handleChangePage = async (_, newPage) => {
        setPage(newPage);

        const offset = newPage === 0 ? 0 : newPage * currentLimit;

        allNotificationHistoryQuery({ variables: { limit: currentLimit, offset } });
    };

    const showNotifPreview = (notif) => {
        getPreview({ variables: { notifId: notif?.id } });
        setOpenPreview(true);
    };

    const selectColorChip = (type) => {
        switch (type) {
            case 'WAITING':
                return '#F28D00';

            case 'QUEUED':
                return '#F28D00';

            case 'SENT':
                return '#FDC300';

            case 'DELIVERED':
                return '#D4E5AB';

            case 'OPENED':
                return '#D4E5AB';

            case 'CLICKED':
                return '#9BC53D';

            case 'FAILED':
                return '#E8492A';

            case 'REJECTED':
                return '#E8492A';

            default:
                return '#D6D1CB ';
        }
    };

    const setPriority = (stats) => {
        const priority = ['WAITING', 'SENT', 'QUEUED', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'REJECTED'];

        return [...stats]
            .sort((a, b) => {
                return priority.indexOf(a.status) - priority.indexOf(b.status);
            })
            ?.at(-1)?.status;
    };

    const breadcrumbLists = [
        {
            route: '/',
            homeIcon: true
        },
        {
            label: 'Email handling',
            route: `/admin/email-templates`
        },
        {
            label: 'Message logs'
        }
    ];

    const getAllEmail = (allNotificationHistoryData?.getAllNotificationHistory?.results || [])?.map((item) => {
        return {
            id: 1,
            col1: item?.recipient,
            col2: splitCamelCaseToString(item?.emailTemplateType),
            col3: item?.logCreatedAt ? `${showDate({ date: item?.logCreatedAt, time: true })}` : '-',
            col4: item?.statusHistory,
            col5: (
                <>
                    <CommonIconButton
                        toolTipTitle={'Click to view details'}
                        onClick={() => setUserNotification(item)}
                        icon="visibility"
                        dataTest="view-details-button"
                    />
                    <CommonIconButton toolTipTitle={'Click to preview'} onClick={() => showNotifPreview(item)} icon={'preview'} />
                </>
            )
        };
    });

    const header = [
        {
            Header: 'Recipient',
            accessor: 'col1',
            disableSortBy: true
        },

        {
            Header: 'Email template type',
            accessor: 'col2',
            disableSortBy: true
        },

        {
            Header: 'Scheduled at',
            accessor: 'col3',
            disableSortBy: true
        },

        {
            Header: 'Status',
            accessor: 'col4',
            disableSortBy: true,
            Cell: (params) => {
                const stats = params?.row?.original?.col4;

                return (
                    <Grid container gap={1} alignItems={'center'}>
                        <Chip
                            label={capitalizeFirstLetter(setPriority(stats))}
                            sx={{
                                background: selectColorChip(setPriority(stats))
                            }}
                        />
                        <CommonPopOver key={stats} hover element={<AccessTimeIcon />}>
                            <StatusStats stats={stats} />
                        </CommonPopOver>
                    </Grid>
                );
            }
        },
        {
            Header: '',
            accessor: 'col5',
            width: 0,
            minWidth: 50,
            maxWidth: 50
        }
    ];

    const notificationCounts = [
        {
            color: '#E8492A',
            count: notificationCountData?.getMessageLogsCount?.failedRejectedCount
        },
        {
            color: '#F28D00',
            count: notificationCountData?.getMessageLogsCount?.waitingQueuedCount
        },
        {
            color: '#FDC300',
            count: notificationCountData?.getMessageLogsCount?.sentCount
        },
        {
            color: '#C6DD84',
            count: notificationCountData?.getMessageLogsCount?.deliveredCount
        },
        {
            color: '#7F972A',
            count: notificationCountData?.getMessageLogsCount?.clickedCount
        }
    ];

    const previewContent = notificationLoading ? (
        <CommonLoading />
    ) : (
        <>
            <InputField
                label={'Subject'}
                type="text"
                name="subject"
                value={notificationPreviewData?.getNotificationPreview?.subject}
                disabled
                normalDisabledCursorIcon
            />
            <iframe srcDoc={notificationPreviewData?.getNotificationPreview?.html} title="Email preview"></iframe>
        </>
    );

    return (
        <div>
            <Breadcrumb breadcrumbLists={breadcrumbLists} allowOnAdmin />
            <br />
            <Heading2 text="Message logs" />
            <br />
            <MesaageLogFilter
                onFilterSearch={onFilterSearch}
                input={{
                    from: input?.from ? new Date(input?.from) : null,
                    until: input?.until ? new Date(input?.until) : null,
                    emailType: input.emailType,
                    status: input.status,
                    recipient: input.recipient,
                    messageType: input.messageType,
                    search: input.search
                }}
            />
            <br />
            {allNotificationHistoryLoading && notificationCountLoading ? (
                <CommonLoading />
            ) : (
                <>
                    <CommonCard>
                        <br />
                        <Heading3
                            text={`Total message - ${
                                notificationCountLoading ? 0 : notificationCountData?.getMessageLogsCount?.totalMessage
                            }`}
                        />
                        <br />
                        {notificationCountLoading ? (
                            <CommonLoading />
                        ) : (
                            <>
                                <CommonProgressBar statistics={notificationCounts} />
                                <br />
                                <div style={{ display: 'flex', gap: 40 }}>
                                    {notificationCounts?.map((item, i) => (
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <div style={{ background: item?.color, height: 12, width: 12, borderRadius: '50%' }} />
                                            {i === 0
                                                ? `Failed/rejected (${item?.count})`
                                                : i === 1
                                                  ? `Waiting/queued (${item?.count})`
                                                  : i === 2
                                                    ? `Sent (${item?.count})`
                                                    : i === 3
                                                      ? `Delivered (${item?.count})`
                                                      : `Clicked (${item?.count})`}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <br />
                    </CommonCard>

                    <br />
                    <br />

                    <div className="email_template_Table">
                        {allNotificationHistoryLoading ? <CommonLoading /> : <CommonDraggableTable columns={header} rows={getAllEmail} />}
                        <TablePagination
                            component="div"
                            count={allNotificationHistoryData?.getAllNotificationHistory?.total}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={currentLimit}
                            rowsPerPageOptions={[]}
                        />
                    </div>
                </>
            )}

            {userNotification ? (
                <>
                    <DialogWrapper
                        className="email-bad-params-details"
                        contentWidth="750px"
                        open={userNotification}
                        heading="User Log Details"
                        setOpen={() => setUserNotification(null)}
                        onClose={() => {
                            setUserNotification(null);
                        }}
                        dialogFooter
                        cancelBtn>
                        <div>
                            <InputField label={'ID'} type="text" name="id" value={userNotification?.id} disabled normalDisabledCursorIcon />
                            <InputField
                                label={'Recipient'}
                                type="text"
                                name="recipient"
                                value={userNotification?.recipient}
                                disabled
                                normalDisabledCursorIcon
                            />
                            <InputField
                                label={'Bad Parameters'}
                                type="text"
                                name="badParams"
                                value={userNotification?.badParams?.length > 0 ? userNotification?.badParams?.join(', ') : '-'}
                                disabled
                                normalDisabledCursorIcon
                            />
                            <InputField
                                label={'Parameters'}
                                type="text"
                                name="params"
                                multiline
                                value={JSON.stringify(JSON.parse(userNotification?.params), null, 4)}
                                disabled
                                normalDisabledCursorIcon
                            />
                            <InputField
                                label={'Error'}
                                type="text"
                                name="error"
                                multiline
                                value={userNotification?.error ? JSON.stringify(JSON.parse(userNotification?.error), null, 4) : ''}
                                disabled
                                normalDisabledCursorIcon
                            />
                        </div>
                    </DialogWrapper>
                </>
            ) : null}

            {openPreview ? (
                <>
                    <DialogWrapper
                        className="email-preview"
                        contentWidth="750px"
                        open={openPreview}
                        heading="Email preview"
                        setOpen={() => setOpenPreview(false)}
                        onClose={() => {
                            setOpenPreview(false);
                        }}
                        dialogFooter
                        cancelBtn>
                        <div>{previewContent}</div>
                    </DialogWrapper>
                </>
            ) : null}
        </div>
    );
};

export default MessageLogs;
