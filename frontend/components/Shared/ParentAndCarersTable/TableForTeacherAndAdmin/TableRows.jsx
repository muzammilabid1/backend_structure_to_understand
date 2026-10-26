import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Collapse, IconButton, TableCell, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { getAccountBadgeClassName, getAccountBadgeContent, getAccountBadgeDescription } from '../../../../lib/statuses/pupilParentStatus';
import { TEACHER } from '../../../../shared/Constant';
import CommonIconButton from '../../Button/CommonIconButton';
import CommonPopOver from '../../CommonPopOver';
import Paragraph from '../../Typography/Paragraph';
import TableCollapse from './TableCollapse';

const TableRows = ({ pupilParent, index, getOptions, removeParentConfirmation, viewType }) => {
    const [open, setOpen] = useState(false);

    const parent = pupilParent?.parent;

    return (
        <React.Fragment>
            <TableRow
                key={index}
                style={{
                    backgroundColor: pupilParent?.status === 'REJECTED' || parent?.userStatus === 'DEACTIVATED' ? '#FCE9E5' : ''
                }}
                sx={{ '& > *': { borderBottom: 'unset !important' } }}>
                <TableCell width={300}>
                    <Paragraph
                        dataTest={`parents-carer-parent-name`}
                        isTruncate
                        text={parent ? `${parent.firstname} ${parent.lastname}` : '-'}
                    />
                </TableCell>
                <TableCell width={300}>
                    {parent?.email && parent.phoneNumber ? (
                        <>
                            <Paragraph isTruncate dataTest="parents-carer-parent-email" text={parent?.email} />
                            <br />
                            <Paragraph isTruncate dataTest="parents-carer-parent-phone" text={parent?.phoneNumber} />
                        </>
                    ) : (
                        <Paragraph isTruncate dataTest="parents-carer-parent-contact-details" text={parent?.email || parent?.phoneNumber} />
                    )}
                </TableCell>
                <TableCell>
                    <div className="parent-status-badge-container">
                        <CommonPopOver
                            hover
                            key={parent?.id}
                            element={
                                <div className={getAccountBadgeClassName(parent?.userStatus, pupilParent.status)}>
                                    <Paragraph dataTest={`parents-carer-badge-name`}>
                                        {getAccountBadgeContent(
                                            parent.userStatus,
                                            pupilParent.status,
                                            pupilParent?.lastInvitationEmailSent
                                        )}
                                    </Paragraph>
                                </div>
                            }>
                            <Paragraph
                                text={getAccountBadgeDescription(
                                    parent.userStatus,
                                    pupilParent.status,
                                    pupilParent?.lastInvitationEmailSent
                                )}
                                style={{ maxWidth: '258px' }}
                            />
                        </CommonPopOver>
                    </div>
                </TableCell>

                <TableCell align="right">
                    <div className={`icons-cell class-overview-table-action `}>
                        {viewType === TEACHER ? (
                            <CommonPopOver
                                bold
                                className="parents-carer-parent-options"
                                dataTest={`parents-carer-parent-options`}
                                icon="more_horiz">
                                {(
                                    getOptions(
                                        parent?.userStatus,
                                        pupilParent?.status,
                                        pupilParent?.id,
                                        pupilParent?.lastInvitationEmailSent,
                                        parent?.numSchoolsWithPupils
                                    ) || []
                                ).map((item, index) => {
                                    return (
                                        <div
                                            className="parent-carers-table-actions-container"
                                            data-test={'parents-carer-parent-option'}
                                            key={index}
                                            onClick={() => item.onClick(parent)}>
                                            <span className="material-icons">{item.icon}</span>
                                            <span>{item.name}</span>
                                        </div>
                                    );
                                })}
                            </CommonPopOver>
                        ) : (
                            <CommonIconButton
                                toolTipTitle="delete"
                                onClick={() => removeParentConfirmation(pupilParent?.parent)}
                                icon="delete"
                            />
                        )}
                        <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                    </div>
                </TableCell>
            </TableRow>
            <TableRow className="detail-BG">
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <TableCollapse pupilParent={pupilParent} viewType={viewType} />
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

TableRows.propTypes = {
    pupilParent: PropTypes.object,
    index: PropTypes.number,
    getOptions: PropTypes.func,
    removeParentConfirmation: PropTypes.func,
    viewType: PropTypes.string
};

export default TableRows;
