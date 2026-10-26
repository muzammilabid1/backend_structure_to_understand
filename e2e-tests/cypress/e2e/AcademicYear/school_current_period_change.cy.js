import {
    admin,
    adminpassword,
    baseUrl,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    password,
    schoolName
} from '../../shared/constants';
import { addClassPage } from '../../shared/pages/addClass';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Changing its current period', () => {
    it('Changing its current period', () => {
        let schoolEmail = generateSchoolEmail();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get('.sidebar-options-list').contains('Schools').click();
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
        cy.get('.MuiTabs-flexContainer').contains('Classes').click();
        cy.wait(2000, { log: false });
        addClassPage.addClass('English');
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Details').click();

        cy.get('#demo-simple-select-outlined').click();
        cy.get('[data-value="2021"]').then(($span) => {
            const initialPeriod = $span.text();

            cy.log('The initial period is', initialPeriod);
            cy.get('[data-value="2020"]').then(($span) => {
                const currentPeriod = $span.text();

                cy.log('The current period is', currentPeriod);
                cy.get('[data-value="2020"]').click();
                cy.wait(2000, { log: false });
                cy.get('.MuiButtonBase-root').contains('Save school period').click();
                cy.get('.MuiButtonBase-root').contains('Confirm').click();

                if (initialPeriod !== currentPeriod) {
                    cy.log('The period is changed succcessfully');
                }
            });
        });
        cy.wait(5000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Classes').click();
        cy.wait(2000, { log: false });
        addClassPage.addClass('Math');
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Classes').click();
        cy.get('.arrow_cursor > .programme-info-alert-container > .paragraph')
            .contains(`English`)
            .then(($span) => {
                const engClassPeriod = $span.text();

                cy.get('.arrow_cursor > .programme-info-alert-container > .paragraph')
                    .contains(`2020-21: Math`)
                    .then(() => {
                        signUpSchoolTeacher(schoolName, `${leaderFirstName} ${leaderlastName}`, password);

                        cy.wait(10000, { log: false });

                        cy.get(
                            '.MuiAccordionDetails-root > .MuiPaper-root > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root > a > .arrow_cursor > .paragraph'
                        )
                            .first()
                            .then(($span) => {
                                const engPeriodLeaderSide = $span.text();

                                if (engClassPeriod === engPeriodLeaderSide) {
                                    cy.log('The English class period is matched on leader side');
                                }
                            });
                    });
            });
    });
});
