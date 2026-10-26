import { UserStatus } from 'lwp-shared';

const RED = 'badge_red_color';
const GRAY = 'badge_imported_color';
const YELLOW = 'badge_pending_color';
const GREEN = 'badge_registered_color';

export const getUserStatus = (userStatus) => {
    switch (userStatus) {
        case UserStatus.ACTIVE:
            return {
                name: 'Registered',
                description: 'Has an active account on the site.',
                colour: GREEN
            };

        case UserStatus.IMPORTED:
            return {
                name: 'Not yet invited',
                description: 'Contact details imported or added, but no invitation email/SMS has been sent or requested for them.',
                colour: GRAY
            };

        case UserStatus.INVITED:
            return {
                name: 'Invited',
                description: 'Has been sent an invitation to sign up by email or SMS.',
                colour: YELLOW
            };

        case UserStatus.ACCOUNTLESS:
            return {
                name: 'Accountless',
                description: 'Uses the site but has not signed up for an account.',
                colour: GREEN
            };

        case UserStatus.DEACTIVATED:
            return {
                name: 'Deactivated',
                description: 'Account disabled; cannot log in and will not receive communications.',
                colour: RED
            };

        case UserStatus.REJECTED:
            return {
                name: 'Rejected invitation',
                description:
                    'Was sent an invitation but clicked a link to indicate that it was not wanted. Please check that contact details are correct.',
                colour: RED
            };

        default:
            return '';
    }
};
