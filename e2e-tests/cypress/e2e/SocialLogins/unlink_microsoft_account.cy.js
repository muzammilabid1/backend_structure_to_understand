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
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName,
    socialLoginMicrosoft
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { allowSocialLoginForParent } from '../../shared/pages/utils';

describe('Social Login', () => {
    it('Unlink microsoft account from parent account details page', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const firstName = generateFirstName();
        const lastName = generateLastName();
        const myTopicName = `${newTopicName} Topic`;
        let activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
        let activity_two = `${animalsNamesActivity} ${generateLastName()}`;
        let activity_third = `${playingGameActivity} ${generateLastName()}`;

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
            true
        );
        cy.wait(2000, { log: false });
        allowSocialLoginForParent(socialLoginMicrosoft);
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Account settings').click({ force: true });
        cy.get('.msLoginBtn').click();
        cy.wait(5000, { log: false });
        cy.get('.MuiButton-root').contains('Disconnect').should('exist');
        loginPage.logout();
        cy.wait(3000, { log: false });
        loginPage.preLogin(parentEmailForInvitation);
        cy.get('.msLoginBtn').click();

        cy.wait(2000, { log: false });
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Account settings').click({ force: true });
        cy.wait(2000, { log: false });
        cy.get('.login-option-social-text')
            .contains(`${parentFirstName} ${parentLastName}`)
            .parent()
            .parent()
            .parent()
            .parent()
            .find('.login-option-button')
            .find('button')
            .click();
        cy.get('.MuiDialogActions-root > .lwp-button-wrapper > .MuiButton-root').contains('Disconnect').click();
        cy.wait(2000, { log: false });
        loginPage.logout();
        cy.wait(2000, { log: false });
        cy.get('.MuiPaper-root > .MuiButton-root').should('not.exist');
    });
});
