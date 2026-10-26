import {
    admin,
    adminpassword,
    baseUrl,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    parentFirstName,
    parentLastName,
    password,
    releaseDate,
    schoolName
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { addClassPage } from '../../shared/pages/addClass';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, signUpParent, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Login with admin create school and add class', () => {
    it('Login with admin create school and add class', () => {
        let schoolEmail = generateSchoolEmail();
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a school').click();
        cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').last().type(`${schoolName} School`);
        cy.get('.MuiDialogContent-root > :nth-child(3) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
            .clear()
            .type(leaderFirstName);

        cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(leaderlastName);
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(schoolEmail);
        cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(`Mr ${leaderFirstName}`);
        cy.get(':nth-child(7) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('10');
        cy.get(':nth-child(8) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('10');
        cy.get('[data-test="add-school-total-classes-allowed-input"]').clear().type('40');
        cy.get(`.MuiButtonBase-root`).contains('Add school').click();
        cy.wait(2000, { log: false });
        cy.get('[data-testid="school-details-link"]')
            .contains(`${schoolName} School`)
            .click();
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.wait(3000, { log: false });

        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
        cy.wait(2000, { log: false });

        addClassPage.addClass('Test Class');
        cy.wait(3000, { log: false });

        cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();

        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
            .contains(`Test Class`)
            .then(($span) => {
                const newClassPeriod = $span.text();

                cy.wait(5000, { log: false });
                signUpSchoolTeacher(schoolName, `${leaderFirstName} ${leaderlastName}`, password);
                cy.wait(5000, { log: false });
                cy.get(`.sidebar-options-list-container`).contains('Test Class').click();
                cy.wait(2000, { log: false });
                cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
                cy.wait(5000, { log: false });

                cy.get(`.MuiButtonBase-root`).contains('Search').click();
                cy.get(
                    ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
                ).click();
                cy.get(
                    ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
                ).click();
                cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
                cy.wait(800, { log: false });

                cy.get(`.MuiButtonBase-root`).contains('Add topic').click();
                cy.wait(5000, { log: false });

                loginPage.adminAndTeacherLogout();

                loginPage.login(schoolEmail, password);

                cy.wait(2000, { log: false });

                cy.get(`.sidebar-options-list-container`).contains('Test Class').click();
                cy.wait(2000, { log: false });
                pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
                cy.wait(2000, { log: false });
                cy.reload();
                cy.wait(3000, { log: false });
                cy.get(`.MuiTableRow-root`).contains(`${firstName} ${lastName}`).click();
                cy.wait(3000, { log: false });

                cy.get(`.MuiTabs-flexContainer`).contains('Details').click();

                cy.get('.MuiTableBody-root > .MuiTableRow-root > :nth-child(3) > .paragraph').then(($span) => {
                    const newPupilTopicPeriod = $span.text();

                    cy.wait(5000, { log: false });
                    loginPage.adminAndTeacherLogout();

                    cy.wait(2000, { log: false });
                    loginPage.login(admin, adminpassword);
                    cy.wait(5000, { log: false });
                    cy.get(`.sidebar-options-list`).contains('Run tasks').click();

                    cy.wait(2000, { log: false });
                    cy.get('.MuiInputAdornment-root > .MuiButtonBase-root').first().click();
                    cy.get('.MuiButtonBase-root.MuiPickersDay-root').contains(releaseDate).click();
                    cy.get(`.MuiButtonBase-root`).contains('Release topics').click();
                    cy.wait(5000, { log: false });
                    signUpParent(schoolName, 'Test Class', `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
                    cy.wait(10000, { log: false });
                    loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
                    cy.wait(3000, { log: false });
                    cy.get('.MuiTabs-flexContainer').contains('Topics').click();
                    cy.wait(3000, { log: false });
                    cy.get('.MuiCardMedia-root').last().click({ force: true });
                    if (newPupilTopicPeriod === newClassPeriod) {
                        cy.log('The topic period of class is matched on pupil side');
                    }
                });
            });
    });
});
