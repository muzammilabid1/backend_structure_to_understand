import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Divider } from '@mui/material';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { getAccountBadgeClassName, getAccountBadgeContent, getAccountBadgeDescription } from '../../../lib/statuses/pupilParentStatus';
import { adminPath } from '../../../shared/Constant';
import { _checkIfDateIsAmonthAgo, showDate } from '../../../shared/Services/handler';
import CommonIconButton from '../Button/CommonIconButton';
import CommonAccordion from '../CommonAccordion';
import CommonBadge from '../CommonBadge';
import CommonPopOver from '../CommonPopOver';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const ParentsAndCarersTableForAdmin = ({ pupil, removeParentConfirmation, inviteParentConfirmation, handleSignupLinkModal }) => {
    return (
        <div>
            <CommonAccordion
                headings={['Parent name', 'Email/phone', 'Last accessed this child', 'Status']}
                expanded
                bold
                summaryClass="admin-parent-detail-table-header">
                {(pupil?.parents || []).map((pupilParent) => {
                    return (
                        <>
                            <Divider />
                            <Accordion key={pupilParent?.parent?.id}>
                                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                                    <div className="admin-parent-detail-summary">
                                        <div className="admin-parent-detail-summary-content">
                                            <Paragraph isTruncate>
                                                <Link passHref href={`${adminPath}/parent/${pupilParent?.parent?.id}`}>
                                                    {pupilParent?.parent?.firstname}
                                                </Link>{' '}
                                                <Link passHref href={`${adminPath}/parent/${pupilParent?.parent?.id}`}>
                                                    {pupilParent?.parent?.lastname}
                                                </Link>
                                            </Paragraph>
                                        </div>
                                        <div className="admin-parent-detail-summary-content">
                                            {pupilParent?.parent?.email && pupilParent?.parent?.phoneNumber ? (
                                                <>
                                                    <Paragraph text={pupilParent?.parent?.email} isTruncate />
                                                    <br />
                                                    <Paragraph text={pupilParent?.parent?.phoneNumber} isTruncate />
                                                </>
                                            ) : (
                                                <Paragraph
                                                    text={
                                                        pupilParent?.parent?.email
                                                            ? pupilParent?.parent?.email
                                                            : pupilParent?.parent?.phoneNumber
                                                    }
                                                    isTruncate
                                                />
                                            )}
                                        </div>
                                        <div className="admin-parent-detail-summary-content">
                                            <Paragraph
                                                text={
                                                    pupilParent?.lastAccess ? showDate({ date: pupilParent?.lastAccess, time: true }) : '-'
                                                }
                                                isTruncate
                                            />
                                        </div>
                                        <div className="admin-parent-detail-summary-content">
                                            <div className="admin-parent-detail-badge">
                                                <CommonPopOver
                                                    hover
                                                    key={pupilParent?.parent?.id}
                                                    text={
                                                        <CommonBadge
                                                            className={getAccountBadgeClassName(
                                                                pupilParent?.parent?.userStatus,
                                                                pupilParent?.status
                                                            )}
                                                            badgeContent={getAccountBadgeContent(
                                                                pupilParent?.parent?.userStatus,
                                                                pupilParent?.status,
                                                                pupilParent?.lastInvitationEmailSent
                                                            )}
                                                        />
                                                    }>
                                                    <Paragraph
                                                        text={getAccountBadgeDescription(
                                                            pupilParent?.parent?.userStatus,
                                                            pupilParent?.status,
                                                            pupilParent?.lastInvitationEmailSent
                                                        )}
                                                        style={{ maxWidth: '258px' }}
                                                    />
                                                </CommonPopOver>
                                            </div>
                                        </div>
                                        <div className="admin-parent-detail-summary-content">
                                            <CommonIconButton
                                                toolTipTitle="delete"
                                                onClick={() => removeParentConfirmation(pupilParent?.parent)}
                                                icon="delete"
                                            />
                                            {(pupilParent?.parent?.userStatus !== UserStatus.ACTIVE &&
                                                pupilParent?.parent?.userStatus !== UserStatus.DEACTIVATED) ||
                                            pupilParent?.status === PupilParentStatus.IMPORTED ||
                                            pupilParent?.status === PupilParentStatus.INVITED ||
                                            pupilParent?.status === PupilParentStatus.REJECTED ? (
                                                <CommonIconButton
                                                    toolTipTitle="mail"
                                                    onClick={() => inviteParentConfirmation(pupilParent)}
                                                    icon="mail"
                                                />
                                            ) : (
                                                ''
                                            )}
                                            {pupilParent?.parent?.userStatus === 'INVITED' &&
                                                pupilParent?.status === PupilParentStatus.INVITED && (
                                                    <CommonIconButton
                                                        toolTipTitle="Signup link"
                                                        onClick={() => handleSignupLinkModal(pupilParent?.parent)}
                                                        icon="exit_to_app"
                                                    />
                                                )}
                                        </div>
                                    </div>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <div className="admin-parent-accordion-summary-detail">
                                        <div className="admin-parent-accordion-summary-detail-content">
                                            <Heading3 text="Recent invited by" />
                                            <br />
                                            <Paragraph
                                                text={
                                                    pupilParent?.invitedBy
                                                        ? `${pupilParent?.invitedBy?.firstname} ${pupilParent?.invitedBy?.lastname}`
                                                        : '-'
                                                }
                                            />
                                        </div>
                                        <div className="admin-parent-accordion-summary-detail-content">
                                            <Heading3 text="Invitation email sent" />
                                            <br />
                                            <Paragraph
                                                text={
                                                    pupilParent?.lastInvitationEmailSent
                                                        ? _checkIfDateIsAmonthAgo(pupilParent?.lastInvitationEmailSent)
                                                            ? showDate({ date: pupilParent?.lastInvitationEmailSent, time: true })
                                                            : 'A month ago'
                                                        : '-'
                                                }
                                            />
                                        </div>
                                        <div className="admin-parent-accordion-summary-detail-content">
                                            <Heading3 text="Last status change" />
                                            <br />
                                            <Paragraph
                                                text={
                                                    pupilParent?.logLastStatusChange
                                                        ? _checkIfDateIsAmonthAgo(pupilParent?.logLastStatusChange)
                                                            ? showDate({ date: pupilParent?.logLastStatusChange, time: true })
                                                            : 'A month ago'
                                                        : '-'
                                                }
                                            />
                                        </div>
                                    </div>
                                </AccordionDetails>
                            </Accordion>
                        </>
                    );
                })}
            </CommonAccordion>
        </div>
    );
};

ParentsAndCarersTableForAdmin.propTypes = {
    pupil: PropTypes.object,
    removeParentConfirmation: PropTypes.func,
    inviteParentConfirmation: PropTypes.func,
    handleSignupLinkModal: PropTypes.func
};

export default ParentsAndCarersTableForAdmin;
