import { InviteMode } from 'lwp-shared';

export interface InviteModeOption {
    value: InviteMode;
    text: string;
    dataTest: string;
    tooltip?: string;
}

interface BuildInviteModeOptionsParams {
    // When true, include the SEND_LATER option (deferring to the autumn window is an admin-only choice).
    isAdmin?: boolean;
    // Prefix for each option's dataTest (e.g. "add-school-invite-mode").
    dataTestPrefix: string;
}

/**
 * Shared option list for the invite-mode radio used by the Add School and Add Teacher modals.
 */
export const buildInviteModeOptions = ({ isAdmin = false, dataTestPrefix }: BuildInviteModeOptionsParams): InviteModeOption[] => {
    const options: InviteModeOption[] = [{ value: InviteMode.SEND_NOW, text: 'Send invite now', dataTest: `${dataTestPrefix}-send-now` }];

    if (isAdmin) {
        options.push({
            value: InviteMode.SEND_LATER,
            text: 'Send invite later',
            dataTest: `${dataTestPrefix}-send-later`,
            tooltip:
                "We'll send this invitation automatically in the week leading up to the next 1st of September, ready for the new school year."
        });
    }

    options.push({ value: InviteMode.DO_NOT_SEND, text: "Don't send invite", dataTest: `${dataTestPrefix}-do-not-send` });

    return options;
};

/**
 * Plain-language reason a staff member is still uninvited, shown per row in the admin "Send invites" modal
 * so it is clear why a row starts unticked. SEND_NOW appears here only when the invite was never actually
 * sent (e.g. staff brought in by an import rather than through the invite-mode radio).
 */
export const inviteModeRowLabels: Record<InviteMode, string> = {
    [InviteMode.SEND_NOW]: 'No invite sent yet',
    [InviteMode.SEND_LATER]: 'Invite scheduled for later',
    [InviteMode.DO_NOT_SEND]: 'Marked as do not invite'
};
