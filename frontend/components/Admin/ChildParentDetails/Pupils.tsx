/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@apollo/client';
import { PupilParentStatus } from 'lwp-shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getAllPupils } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { capitalizeFirstLetter, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import Paragraph from './../../Shared/Typography/Paragraph';
import RejectInviteConfirmationModal from './modules/RejectInviteConfirmationModal';

export default function StudentOverview() {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const [modalsData, setModalsData] = useState<ModalsData>({ action: null });

    const {
        loading,
        error,
        data: parentPupils
    } = useQuery(getAllPupils, { variables: { parentId: queryParams?.parent_id }, fetchPolicy: 'network-only' });

    useEffect(() => {
        if (null == error?.message) {
            return;
        }

        callSnackbar(error, 'error');
    }, [error]);

    const head = [
        {
            accessor: 'col1',
            Header: 'Child name',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/child/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                </Link>
            )
        },
        { accessor: 'col2', Header: 'Pupil Status' },
        { accessor: 'col3', Header: 'Link Status' },
        {
            accessor: 'col4',
            Header: 'Last Log in',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col4, b.original?.col4)
        },

        {
            accessor: 'col5',
            Header: 'Last Link Status Change',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col5, b.original?.col5)
        },
        {
            accessor: 'col6',
            Header: 'Last Invitation Email Sent',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col6, b.original?.col6)
        },
        {
            accessor: 'actions',
            Header: ''
        }
    ];

    const row = (parentPupils?.getAllPupils || []).map((pupilParent) => {
        const actions = [];

        if (PupilParentStatus.INVITED === pupilParent.status) {
            actions.push(
                <CommonIconButton
                    toolTipTitle={'Reject invite'}
                    onClick={() => setModalsData({ action: ModalsAction.confirmRejectInvite, pupilParent: pupilParent })}
                    icon={'unsubscribe'}
                />
            );
        }

        return {
            id: pupilParent.pupil?.id,
            col1: pupilParent.pupil?.fullname,
            col2: capitalizeFirstLetter(pupilParent.pupil?.pupilStatus),
            col3: capitalizeFirstLetter(pupilParent.status),
            col4: pupilParent.pupil?.lastLogin,
            col5: pupilParent.logLastStatusChange,
            col6: pupilParent.lastInvitationEmailSent,
            actions: 0 < actions.length ? actions : '-'
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <>
            {ModalsAction.confirmRejectInvite === modalsData.action && (
                <RejectInviteConfirmationModal toggle={() => setModalsData({ action: null })} pupilParent={modalsData.pupilParent} />
            )}
            <CommonDraggableTable rows={row} columns={head} customClass="row-height" />
        </>
    );
}

enum ModalsAction {
    confirmRejectInvite
}

type ModalsData =
    | {
          action: null;

          // This line is not required, but strict = false, so I had to add it here too
          pupilParent?: never;
      }
    | {
          action: ModalsAction.confirmRejectInvite;
          pupilParent: any;
      };
