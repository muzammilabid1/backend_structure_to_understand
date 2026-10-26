import {
    admin,
    adminpassword,
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
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';

describe('Reset user password', () => {
    it('Reset user password', () => {
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
        const newPassword = 'NEW123123123!';

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
        loginPage.preLogin(parentEmailForInvitation);
        cy.get('a').contains('Forgotten password?').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiOutlinedInput-input').type(parentEmailForInvitation);
        cy.get('.MuiButton-root').contains('Send me a link').click();
        cy.wait(2000, { log: false });
        cy.visit(`${baseUrl}`);
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.wait(2000, { log: false });
        cy.get('[data-testid="school-details-link"]').contains(`${schoolName} School`).dblclick();
        cy.wait(3000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Classes').click();
        cy.wait(3000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
            .contains(className)
            .dblclick();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${firstName} ${lastName}`).dblclick();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph')
            .contains(`${parentFirstName} ${parentLastName}`)
            .dblclick();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(4)').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root > .material-icons').first().click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(4) > .undefined > .MuiOutlinedInput-root > [aria-invalid="false"]').then(($span) => {
            const text = $span.text();
            const passwordResetLink = JSON.parse(text)?.RESETPASSTOKEN;

            cy.get('.MuiButton-root').contains('Cancel').click();
            loginPage.adminAndTeacherLogout();
            cy.visit(`${baseUrl}magic/${passwordResetLink}`);
            cy.wait(5000, { log: false });
            cy.get(':nth-child(2) > .root > .MuiOutlinedInput-root > .MuiOutlinedInput-input').click().type(newPassword);
            cy.get(':nth-child(3) > .root > .MuiOutlinedInput-root > .MuiOutlinedInput-input').click().type(newPassword);
            cy.get('.MuiButton-root').contains('Reset password').click();
            cy.wait(5000, { log: false });
            loginPage.login(parentEmailForInvitation, newPassword);
            cy.get('.MuiTypography-root > .material-icons').click();
            cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
        });
    });
});
