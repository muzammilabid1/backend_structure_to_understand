/* eslint-disable @next/next/no-img-element */
import { useQuery } from '@apollo/client';
import { CircularProgress, TableCell, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { getLastAccess } from '../../../../graphQl/queries';
import { ADMIN, MINIO_PUBLIC_PATHS, PARENT } from '../../../../shared/Constant';
import { showDateTooltip } from '../../../../shared/Services/handler';
import CommonTable from '../../CommonTable';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';

const TableCollapse = ({ pupilParent, viewType }) => {
    const icon = pupilParent?.invitedBy?.type === PARENT ? 'readingHomeIcon.png' : 'readingSchoolIcon.png';

    let statusChange = [...(pupilParent?.logStatusChange ?? []), ...(pupilParent?.parent?.logStatusChange ?? [])];

    statusChange.sort(function (a, b) {
        return new Date(b.logCreatedAt) - new Date(a.logCreatedAt);
    });

    const firstStatus = pupilParent?.logStatusChange[0];

    const showName = {
        lwp_pupil_parent: 'Pupil parent link status',
        lwp_user: 'User status'
    };

    const getPupilParentLastAccessQuery = useQuery(getLastAccess, {
        variables: { pupilId: pupilParent.pupil.id, parentId: pupilParent.parent.id }
    });

    return (
        <div className="detail_history">
            <div className="history_top">
                <div className="text_nowarp">
                    <Heading3 text="Invitation requested by" />
                    <div className="invitation_requested">
                        {pupilParent?.invitedBy ? (
                            <>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${icon}`}
                                    alt="SITEIMAGE"
                                />
                                <Paragraph text={`${pupilParent?.invitedBy?.firstname} ${pupilParent?.invitedBy?.lastname},`} />
                                <Paragraph
                                    text={showDateTooltip(
                                        firstStatus?.previousStatus === 'IMPORTED' ? firstStatus?.logCreatedAt : pupilParent?.logCreatedAt,
                                        true
                                    )}
                                />
                            </>
                        ) : (
                            '-'
                        )}
                    </div>
                </div>
                <div className="text_nowarp">
                    <Heading3 text="Last reminder sent" />
                    <Paragraph text={showDateTooltip(pupilParent?.lastInvitationEmailSent)} />
                </div>
                <div className="text_nowarp">
                    <Heading3 text="Last accessed this pupil" />
                    {!getPupilParentLastAccessQuery.loading ? (
                        <Paragraph text={showDateTooltip(getPupilParentLastAccessQuery.data?.getLastAccess)} />
                    ) : (
                        <CircularProgress size={20} />
                    )}
                </div>
            </div>
            {viewType === ADMIN && statusChange?.length > 0 ? (
                <div className="history_table">
                    <Heading3 text="Status change history" />
                    <br />
                    <CommonTable head={['Status type', 'New status', 'Previous status', 'Timestamp']}>
                        {(statusChange || [])?.map((status) => {
                            return (
                                <TableRow key={status?.id}>
                                    <TableCell>
                                        <Paragraph text={showName[status?.entityType] ?? '-'} />
                                    </TableCell>
                                    <TableCell>
                                        <Paragraph text={status?.newStatus ?? '-'} />
                                    </TableCell>
                                    <TableCell>
                                        <Paragraph text={status?.previousStatus ?? '-'} />
                                    </TableCell>
                                    <TableCell>
                                        <Paragraph text={showDateTooltip(status?.logCreatedAt) ?? '-'} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </CommonTable>
                </div>
            ) : (
                ''
            )}
        </div>
    );
};

TableCollapse.propTypes = {
    pupilParent: PropTypes.object,
    viewType: PropTypes.stringt
};

export default TableCollapse;
