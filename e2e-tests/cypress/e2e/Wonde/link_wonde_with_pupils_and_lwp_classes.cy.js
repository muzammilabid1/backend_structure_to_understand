import { admin, adminpassword, baseUrl, generateSchoolEmail, leaderFirstName, leaderlastName, schoolName } from '../../shared/constants';
import { addNewPupilInNewSchool } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';

describe('Import wonde classes and link pupils', () => {
    it('Import wonde classes and link pupils', () => {
        const mySchoolName = `${schoolName} School`;
        const fullProgrammedClassesAllowed = 100;
        const classesAllowed = 100;
        const schoolEmail = generateSchoolEmail();

        cy.visit(`${baseUrl}`);
        addNewPupilInNewSchool.createSchoolAndDummyWondeDataWithMutation(mySchoolName, fullProgrammedClassesAllowed, classesAllowed, {
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: schoolEmail,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.wait(2000, { log: false });
        cy.get('[data-testid="school-details-link"]').contains(mySchoolName).click();
        cy.wait(5000, { log: false });
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Link Classes').click();
        cy.get(`.MuiDialogActions-root`).contains('Link classes').click();
        cy.wait(1000, { log: false });
        cy.log('Linked classes');
        cy.get('.MuiTabs-flexContainer').contains('Classes').click();
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').first().click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Students').click();
        cy.wait(2000, { log: false });
        cy.get('.premium_link').click();
        cy.get(`.MuiDialogActions-root `).contains('Link pupils').click();
        cy.log('Linked Pupil');
    });
});
