import {
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    newTopicName,
    NotificationParameter,
    NotificationType,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName,
    socialLoginMicrosoft
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import {
    allowSocialLoginForParent,
    getCheckBox,
    goToParentDetailsFromAdminSide,
    runCronJob,
    visitMagicLinkUrlOfParent
} from '../../shared/pages/utils';

describe('Social Login', () => {
    it('Signup with microsoft account as a invited parent', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const myTopicName = `${newTopicName} Topic`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const firstName = generateFirstName();
        const lastName = generateLastName();
        const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
        const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
        const activity_third = `${playingGameActivity} ${generateLastName()}`;

        cy.visit(`${baseUrl}`);
        addSchoolAndClassAndPupilWithMutation(
            mySchoolName,
            myClassName,
            myTopicName,
            password,
            [
                { name: activity_one, order: 1, activityComponentName: 'GuessTheAnimal' },
                { name: activity_two, order: 2, activityComponentName: 'ClapClap' },
                { name: activity_third, order: 3, activityComponentName: 'SoundsScavengerHunt' }
            ],
            {
                firstname: leaderFirstName,
                lastname: leaderlastName,
                email: schoolEmail,
                nameForChildren: `Mr ${leaderFirstName}`
            },
            {
                firstName,
                lastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
            },
            false
        );
        runCronJob();
        allowSocialLoginForParent(socialLoginMicrosoft, false);
        goToParentDetailsFromAdminSide(mySchoolName, myClassName, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        cy.get(`.MuiButtonBase-root`).contains('Re-Invite Parent').click();
        runCronJob('sendAllPendingNotifications', false);
        visitMagicLinkUrlOfParent(
            mySchoolName,
            myClassName,
            `${firstName} ${lastName}`,
            `${parentFirstName} ${parentLastName}`,
            NotificationType.INVITATION,
            NotificationParameter.MAGICID
        );
        cy.wait(2000, { log: false });
        cy.get('.msLoginBtn').click();
        cy.wait(2000, { log: false });
        getCheckBox().click();
        cy.get('.MuiButton-root').contains('Confirm').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Account settings').click({ force: true });

        cy.wait(8000, { log: false });
        cy.get('.MuiButton-root').contains('Disconnect').should('exist');
    });
});
