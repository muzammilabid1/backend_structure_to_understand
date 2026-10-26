import { admin, adminpassword, baseUrl, generateSchoolEmail, leaderFirstName, leaderlastName, schoolName } from '../../shared/constants';
import { addNewPupilInNewSchool } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';

describe('Link wonde school classes with lwp school classes', () => {
    it('Link wonde school classes with lwp school classes', () => {
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
        cy.get('[data-testid="school-details-link"]').contains(mySchoolName).dblclick();
        cy.wait(5000, { log: false });
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Link Classes').click();
        cy.wait(1000, { log: false });
        cy.get(`.MuiDialogActions-root`).contains('Link classes').click();
        cy.wait(1000, { log: false });
    });
});
