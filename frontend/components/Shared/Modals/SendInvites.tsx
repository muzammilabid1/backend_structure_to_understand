import { useMutation } from '@apollo/client';
import { InviteMode } from 'lwp-shared';
import React, { useContext, useEffect, useState } from 'react';

import { sendStaffInvites } from '../../../graphQl/mutations';
import { inviteModeRowLabels } from '../../../shared/inviteModeOptions';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import CommonLoading from '../CommonLoading';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

export interface Invitee {
    userId: string;
    firstname: string;
    lastname: string;
    isSchoolLeader: boolean;
    inviteMode: InviteMode;
    // Only needed when showSchool is true (cross-school overview). The per-school Staff page omits them.
    schoolId?: string;
    schoolName?: string;
}

interface SendInvitesModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    invitees: Invitee[];
    // When true, each row also shows the school name (cross-school overview usage).
    showSchool?: boolean;
    subtitle?: string;
    // Called after a successful send so the caller can refetch (e.g. to clear the warning icon).
    onSent?: () => void;
    // When the invitee list is still being fetched (cross-school usage), suppress the possibly-stale list and
    // disable Update until fresh data arrives, so no one is shown pre-checked from a previous fetch.
    loading?: boolean;
}

const pluralisedInvites = (count: number): string => `${count} invitation${count === 1 ? '' : 's'}`;

// Name-based slug for the row dataTest, so tests can target a specific checkbox by name rather than user id.
const inviteeTestSlug = (invitee: Invitee): string => `${invitee.firstname}-${invitee.lastname}`.trim().toLowerCase().replace(/\s+/g, '-');

// Staff explicitly marked "Don't send invite" are listed but not ticked by default, so bulk-inviting never
// silently contacts someone a school asked us to leave alone. Everyone else is a genuine outstanding invite.
const isTickedByDefault = (invitee: Invitee): boolean => invitee.inviteMode !== InviteMode.DO_NOT_SEND;

const SendInvitesModal = ({ open, setOpen, invitees, showSchool = false, subtitle, onSent, loading = false }: SendInvitesModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [checkedIds, setCheckedIds] = useState<string[]>([]);

    // Stable signature of who is in the list, so the reset below fires only when the actual set of
    // invitees changes - not on every new array identity a parent re-render produces.
    const inviteeIdSignature = invitees
        .map((invitee) => invitee.userId)
        .sort()
        .join(',');

    // Apply the default tick state whenever the set of invitees changes (the list loads asynchronously); a
    // re-render carrying the same people must not wipe the admin's manual ticks and unticks.
    useEffect(() => {
        setCheckedIds(invitees.filter(isTickedByDefault).map((invitee) => invitee.userId));
    }, [inviteeIdSignature]);

    // Unticked rows sort last so the outstanding invites are what the admin sees first. Both partitions keep
    // the order the caller supplied (school name, then surname).
    const orderedInvitees = [...invitees.filter(isTickedByDefault), ...invitees.filter((invitee) => !isTickedByDefault(invitee))];

    const [sendInvitesMutation, { loading: sending }] = useMutation(sendStaffInvites);

    const toggle = (userId: string): void => {
        setCheckedIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
    };

    const onSend = async (): Promise<void> => {
        try {
            await sendInvitesMutation({ variables: { userIds: checkedIds } });
            callSnackbar(`${pluralisedInvites(checkedIds.length)} sent`, 'success');
            onSent?.();
            setOpen(false);
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    const count = checkedIds.length;

    return (
        <DialogWrapper
            open={open}
            setOpen={() => setOpen(false)}
            heading="Send invites"
            subHeading={
                <>
                    {!loading && (
                        <Paragraph
                            customClass="staff-email-count"
                            dataTest="send-invites-count"
                            text={`${pluralisedInvites(count)} will be sent.`}
                        />
                    )}
                    {subtitle && <Paragraph customClass="staff-email-subtitle" text={subtitle} />}
                </>
            }
            dialogFooter
            cancelBtn
            primaryBtnText="Invite"
            primaryBtnHandler={onSend}
            primaryBtnloading={sending}
            primaryBtnDisabled={count === 0 || loading}
            contentWidth="600px"
            dataTest="send-invites-modal">
            {loading ? (
                <CommonLoading />
            ) : (
                <div className="staff-email-list">
                    {orderedInvitees.map((invitee) => (
                        <div className="staff-email-row" key={invitee.userId}>
                            <CommonCheckBox
                                name={`invitee-${invitee.userId}`}
                                checked={checkedIds.includes(invitee.userId)}
                                onChange={() => toggle(invitee.userId)}
                                dataTest={`send-invites-row-${inviteeTestSlug(invitee)}`}>
                                <span className="staff-email-person">
                                    <span className="staff-email-person-name">
                                        {invitee.firstname} {invitee.lastname}
                                    </span>
                                    {showSchool && invitee.schoolName && (
                                        <span className="staff-email-person-school">{invitee.schoolName}</span>
                                    )}
                                    <span className="staff-email-person-role">
                                        Role: {invitee.isSchoolLeader ? 'School Leader' : 'Teacher'}
                                    </span>
                                    <span className="staff-email-person-note" data-test={`send-invites-mode-${inviteeTestSlug(invitee)}`}>
                                        {inviteModeRowLabels[invitee.inviteMode]}
                                    </span>
                                </span>
                            </CommonCheckBox>
                        </div>
                    ))}
                </div>
            )}
        </DialogWrapper>
    );
};

export default SendInvitesModal;
