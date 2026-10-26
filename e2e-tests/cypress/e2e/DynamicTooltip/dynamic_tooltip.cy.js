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
import { getEmailBox, getInputBoxByName, getPasswordBox, getSubmitButton, runCronJob } from '../../shared/pages/utils';

describe('Dynamic tooltip', () => {
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

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add test data and release topic', () => {
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
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Unpusblish tooltip and verify from teacher side.', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Features').click();
        cy.get(`.MuiTabs-flexContainer`).contains('Tooltips').click();
        cy.contains('.table_main .tr_row .td', 'Topic Library').then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("create")').click();
                });
        });
        getInputBoxByName('status').uncheck().should('not.be.checked');
        cy.get('[data-test="dialog-primary-btn"]').contains('Update').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(schoolEmail, password);
        cy.get('.feedback_tooltip_text').should('not.exist');
    });

    it('Pusblish tooltip and verify from teacher side.', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Features').click();
        cy.get(`.MuiTabs-flexContainer`).contains('Tooltips').click();
        cy.contains('.table_main .tr_row .td', 'Topic Library').then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("create")').click();
                });
        });
        getInputBoxByName('status').check().should('be.checked');
        cy.get('[data-test="dialog-primary-btn"]').contains('Update').click();
        loginPage.adminAndTeacherLogout();
        getEmailBox().clear().type(schoolEmail).should('have.value', schoolEmail);
        cy.get(`.MuiButtonBase-root`).contains('Next').click();
        getPasswordBox().clear().type(password, { log: false }).should('have.value', password);
        getSubmitButton().click();
        cy.get('.feedback_tooltip_text').should('exist');
    });
});
