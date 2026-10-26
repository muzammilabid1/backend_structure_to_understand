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
import { getInputBoxByName, gotoTeacherDetailsPageFromAdminSide, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Add teacher', () => {
    it('Adding teacher', () => {
        let schoolEmail = generateSchoolEmail();
        let teacherEmail = generateTeacherEmail();
        const mySchoolName = `${schoolName} School`;

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);

        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a school').click();
        cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').last().type(mySchoolName);
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

        cy.get('[data-testid="school-details-link"]').contains(mySchoolName).dblclick();
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        gotoTeacherDetailsPageFromAdminSide(mySchoolName, `${leaderFirstName} ${leaderlastName}`);
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.contains('.table_main .tr_row .td', `School Leader Invitation Email`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });
        cy.get('textarea[name="params"]')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    SCHOOL: mySchoolName,
                    FIRSTNAME: leaderFirstName,
                    LASTNAME: leaderlastName
                });
            });
        cy.get('body').click(0, 0);
        signUpSchoolTeacher(mySchoolName, `${leaderFirstName} ${leaderlastName}`, password);
        teacher.addTeacher(teacherFirstname, teacherLastname, teacherFirstname, teacherEmail);
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        gotoTeacherDetailsPageFromAdminSide(mySchoolName, `${teacherFirstname} ${teacherLastname}`);
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.contains('.table_main .tr_row .td', `Teacher Invitation Email`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });
        cy.get('textarea[name="params"]')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    SCHOOL: mySchoolName,
                    FIRSTNAME: teacherFirstname,
                    LASTNAME: teacherLastname
                });
            });
    });
});
