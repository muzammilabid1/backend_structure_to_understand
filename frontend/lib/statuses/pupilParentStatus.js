import { PupilParentStatus, UserStatus } from 'lwp-shared';

export const RED = 'badge_red_color';
export const GRAY = 'badge_imported_color';
export const YELLOW = 'badge_pending_color';
export const GREEN = 'badge_registered_color';

const pupilParentStatuses = [
    {
        linkStatus: [PupilParentStatus.REJECTED, PupilParentStatus.IMPORTED, PupilParentStatus.ACTIVE, PupilParentStatus.INVITED],
        userStatus: [UserStatus.DEACTIVATED],
        hasBeenInvited: null,
        name: 'Account deactivated',
        description: 'Blocked from logging in and will not receive communications.',
        colour: RED
    },
    {
        linkStatus: [PupilParentStatus.REJECTED, PupilParentStatus.IMPORTED, PupilParentStatus.ACTIVE, PupilParentStatus.INVITED],
        userStatus: [UserStatus.REJECTED],
        hasBeenInvited: null,
        name: 'Rejected invitation',
        description: 'Rejected the invitation to sign up to the site. Please check contact details.',
        colour: RED
    },
    {
        linkStatus: [PupilParentStatus.REJECTED],
        userStatus: [UserStatus.INVITED, UserStatus.IMPORTED, UserStatus.ACTIVE, UserStatus.ACCOUNTLESS],
        hasBeenInvited: null,
        name: 'Rejected invitation',
        description: 'Rejected the invitation to join the pupil. Please check whether this was the correct parent to invite.',
        colour: RED
    },
    {
        linkStatus: [PupilParentStatus.IMPORTED, PupilParentStatus.INVITED],
        userStatus: [UserStatus.IMPORTED],
        hasBeenInvited: null,
        name: 'Not yet invited',
        description: 'This user will not receive any communications via Learning with Parents until they are invited.',
        colour: GRAY
    },
    {
        linkStatus: [PupilParentStatus.IMPORTED],
        userStatus: [UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.ACCOUNTLESS],
        hasBeenInvited: null,
        name: 'Not yet invited',
        description: 'Has not been invited to join this pupil. Does not receive any communications about this pupil.',
        colour: GRAY
    },
    {
        linkStatus: [PupilParentStatus.INVITED],
        userStatus: [UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.ACCOUNTLESS],
        hasBeenInvited: false,
        name: 'Awaiting invite',
        description:
            'Details confirmed but first invitation to join this pupil not yet sent. This will be sent once the first topic is released.',
        colour: YELLOW
    },
    {
        linkStatus: [PupilParentStatus.INVITED],
        userStatus: [UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.ACCOUNTLESS],
        hasBeenInvited: true,
        name: 'Invited',
        description: 'Has been invited to join this pupil. They receive notifications for topics.',
        colour: YELLOW
    },
    {
        linkStatus: [PupilParentStatus.ACTIVE],
        userStatus: [UserStatus.ACCOUNTLESS],
        hasBeenInvited: null,
        name: 'Linked',
        description: 'Has joined the pupil on the site. They receive communications and can access the pupil’s activities.',
        colour: GREEN
    },
    {
        linkStatus: [PupilParentStatus.ACTIVE],
        userStatus: [UserStatus.ACTIVE],
        hasBeenInvited: null,
        name: 'Linked',
        description: 'Has an account and is linked to the pupil. They receive communications and can access the pupil’s activities.',
        colour: GREEN
    }
];

/**
 * getStatusInfo gets the information relating to a pupil-parent status' display.
 *
 * @export
 * @param {UserStatus} parentStatus the status of the parent
 * @param {PupilParentStatus} pupilParentStatus the pupil-parent link status
 * @param {Date | undefined} [lastInvitationEmailSent=null] the date of the last invitaton email sent, or null
 * @return {{name: string, description: string, colour: string}} the information for displaying this status.
 */
export function getStatusInfo(parentStatus, pupilParentStatus, lastInvitationEmailSent = null) {
    const foundStatusInfo = pupilParentStatuses.find((status) => {
        return (
            status.userStatus.includes(parentStatus) &&
            status.linkStatus.includes(pupilParentStatus) &&
            (status.hasBeenInvited == null || status.hasBeenInvited == !!lastInvitationEmailSent)
        );
    });

    if (foundStatusInfo) return foundStatusInfo;

    window.newrelic?.noticeError({
        response: `Pupil Parent Status: ${pupilParentStatus} - Parent Status: ${parentStatus} - LIES: ${lastInvitationEmailSent}`,
        status: 535
    });

    return {
        name: 'Error',
        description: 'Unexpected user status. Tech support are aware of this issue.',
        colour: RED
    };
}

export const getAccountBadgeClassName = (parentStatus, pupilParentStatus) => {
    return getStatusInfo(parentStatus, pupilParentStatus).colour;
};

export const getAccountBadgeContent = (parentStatus, pupilParentStatus, lastInvitationEmailSent = null) => {
    return getStatusInfo(parentStatus, pupilParentStatus, lastInvitationEmailSent).name;
};

export const getAccountBadgeDescription = (parentStatus, pupilParentStatus, lastInvitationEmailSent = null) => {
    return getStatusInfo(parentStatus, pupilParentStatus, lastInvitationEmailSent).description;
};
