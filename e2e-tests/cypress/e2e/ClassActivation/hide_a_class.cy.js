import { baseUrl, generateSchoolEmail, leaderFirstName, leaderlastName, password, schoolName } from '../../shared/constants';
import { addNewPupilInNewSchool } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';

describe('Hide a class from school overview page', () => {
    it('Hide a class from school overview page', () => {
        const mySchoolName = `${schoolName} School`;
        const fullProgrammedClassesAllowed = 2;
        const classesAllowed = 2;
        const schoolEmail = generateSchoolEmail();

        cy.visit(`${baseUrl}`);
        addNewPupilInNewSchool.createSchoolAndDummyWondeDataWithMutation(mySchoolName, fullProgrammedClassesAllowed, classesAllowed, {
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: schoolEmail,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        cy.wait(2000, { log: false });
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTableBody-root > .not-active-class-table > .MuiTableCell-root > .paragraph')
            .first()
            .then(($el) => {
                const text = $el.text();

                cy.log('text', text);
                cy.get('.MuiTableCell-alignRight > .not-active-class-button-container > :nth-child(1) > .MuiButtonBase-root')
                    .first()
                    .contains('Hide')
                    .click();
                cy.wait(2000, { log: false });
                cy.get('.hidden-classes-container > .hidden-classes-main-accordion > .school-overview-classDetail-accordion-header')
                    .contains('Hidden classes')
                    .click();
                cy.get('[data-test="hidden-class-name"]').first().should('contain', text);
            });
    });
});
