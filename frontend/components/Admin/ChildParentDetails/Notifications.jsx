import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { TestEmailTypeOptions } from '../../../shared/Constant';
import { handleErrorSnackbar, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import DialogWrapper from './../../Shared/DialogWrapper';
import InputField from './../../Shared/InputField/InputField';

// Queries

const getUserNotificationHistoryForUserNotifications = gql`
    query getUserNotificationHistory($userId: String!, $limit: Float) {
        getUserNotificationHistory(userId: $userId, limit: $limit) {
            results {
                id
                recipient
                emailTemplateType
                params
                error
                badParams
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

const UserNotifications = ({ isParent }) => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [openPreview, setOpenPreview] = useState(false);
    const [userNotification, setUserNotification] = useState(null);

    const [getPreview, { data: previewResult, loading: previewLoading, error: previewError }] = useLazyQuery(getNotificationPreview);

    const {
        loading,
        error: error,
        data: userLogsData
    } = useQuery(getUserNotificationHistoryForUserNotifications, {
        variables: { userId: isParent ? queryParams?.parent_id : queryParams?.teacher_id, limit: 20 },
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, previewError);
    }, [error, previewError]);

    const getNotificationEmailType = (key) => {
        const template = TestEmailTypeOptions.find((template) => template?.key === key);

        return template ? template?.value : '-';
    };

    const showNotificationLogDetails = (failedLog) => {
        setUserNotification(failedLog);
        setOpen(true);
    };

    const showNotifPreview = (notif) => {
        getPreview({ variables: { notifId: notif?.id } });
        setOpenPreview(true);
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
            Header: 'Time queued',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        },
        {
            accessor: 'col4',
            Header: 'Time sent',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col4, b.original?.col4)
        },
        {
            accessor: 'col5',
            Header: '',
            width: '200'
        }
    ];

    const row = (userLogsData?.['getUserNotificationHistory']?.['results'] || []).map((userNotification) => {
        const sentAt = userNotification?.statusHistory?.find((status) => status?.status === 'SENT');

        return {
            id: userNotification?.id,
            col1: getNotificationEmailType(userNotification?.emailTemplateType),
            col2: userNotification?.recipient,
            col3: userNotification?.logCreatedAt,
            col4: sentAt?.logCreatedAt,
            col5: (
                <>
                    <CommonIconButton
                        toolTipTitle={'Click to view details'}
                        disabled={!userNotification?.params}
                        onClick={() => showNotificationLogDetails(userNotification)}
                        icon={!userNotification?.params ? 'visibility_off' : 'visibility'}
                        dataTest={`${userNotification?.emailTemplateType}-user-notification-history-details-button`}
                    />
                    <CommonIconButton
                        toolTipTitle={'Click to preview'}
                        disabled={!userNotification?.params}
                        onClick={() => showNotifPreview(userNotification)}
                        icon={'preview'}
                    />
                </>
            )
        };
    });

    const previewData = previewResult?.getNotificationPreview;

    const previewContent = previewLoading ? (
        <CommonLoading />
    ) : (
        <>
            <InputField label={'Subject'} type="text" name="subject" value={previewData?.subject} disabled normalDisabledCursorIcon />
            <iframe srcDoc={previewData?.html} title="Email preview"></iframe>
        </>
    );

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview">
            <CommonDraggableTable rows={row} columns={head} />

            {open ? (
                <>
                    <DialogWrapper
                        className="email-bad-params-details"
                        contentWidth="750px"
                        open={open}
                        heading="User Log Details"
                        setOpen={() => setOpen(false)}
                        onClose={() => {
                            setUserNotification(null);
                            setOpen(false);
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
                                dataTest="user-notification-history-params"
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

UserNotifications.propTypes = { isParent: PropTypes.bool.isRequired };

export default UserNotifications;
