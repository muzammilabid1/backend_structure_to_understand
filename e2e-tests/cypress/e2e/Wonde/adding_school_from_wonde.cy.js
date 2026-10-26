import {
    adminForWondeEmail,
    adminForWondePassword,
    baseUrl,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    schoolName
} from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, waitForStatus } from '../../shared/pages/utils';

describe('Wonde data to lwp tables', () => {
    it('Wonde data to lwp tables', () => {
        let schoolEmail = generateSchoolEmail();

        cy.visit(baseUrl);
        loginPage.login(adminForWondeEmail, adminForWondePassword);
        cy.wait(2000, { log: false });
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
            .dblclick();
        cy.wait(2000, { log: false });
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.wait(5000, { log: false });

        getInputBoxByName('wondeSchoolId').clear().type('A1930499544');
        cy.get(`.MuiButtonBase-root`).contains('Import from Wonde').click();
        cy.wait(10000, { log: false });
        waitForStatus();
        cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
        cy.wait(2000, { log: false });

        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains('10D').click();
    });
});
