import {
    admin,
    adminpassword,
    baseUrl,
    generateSchoolEmail,
    generateTeacherEmail,
    leaderFirstName,
    leaderlastName,
    password,
    schoolName,
    teacherFirstname,
    teacherLastname
} from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';
import { teacher } from '../../shared/pages/teacher';
import { getInputBoxByName, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Update teacher', () => {
    it('Adding teacher and than update', () => {
        let schoolEmail = generateSchoolEmail();
        let teacherEmail = generateTeacherEmail();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);

        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.get(`.sidebar-options-list`).contains('Schools').click();
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
        cy.get('[data-testid="school-details-link"]')
            .contains(`${schoolName} School`)
            .dblclick();
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        signUpSchoolTeacher(schoolName, `${leaderFirstName} ${leaderlastName}`, password);

        teacher.addTeacher(teacherFirstname, teacherLastname, teacherFirstname, teacherEmail);
        cy.get('.MuiAlert-message').contains('A new teacher has been added').should('be.visible');
        teacher.editTeacher(teacherFirstname, teacherLastname, teacherFirstname, teacherEmail);
    });
});
