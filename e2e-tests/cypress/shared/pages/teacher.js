import { getEmailBox, getFirstNameBox, getLastNameBox, getNameUsedByChild, schoolSettingsPage } from './utils';

const getModalTecaherUpdateButton = () => cy.get(`.MuiButtonBase-root`).contains('Update teacher');

/**
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} nameUsedByChild
 * @param {string} teacherEmail
 *
 */
const addTeacher = (firstName, lastName, nameUsedByChild, teacherEmail) => {
    cy.wait(3000, { log: false });

    schoolSettingsPage('school-settings-teachers', 'Teachers');

    cy.get(`[data-test="add-teacher-list"]`).click();

    getFirstNameBox().clear().type(firstName);
    getLastNameBox().clear().type(lastName);
    getNameUsedByChild().clear().type(`MS ${nameUsedByChild}`);
    getEmailBox().clear().type(teacherEmail);
    cy.get(`#demo-simple-select-outlined`).click().get('.MuiPaper-root > .MuiList-root > [tabindex="0"]').contains('Class teacher').click();
    cy.get(`.MuiButtonBase-root`).contains('Add teacher').click();
};

/**
 * @param {string} teacherFirstName
 * @param {string} teacherLastName
 * @param {string} nameUsedByChild
 * @param {string} teacherEmail
 *
 */
const editTeacher = (teacherFirstName, teacherLastName, nameUsedByChild, teacherEmail) => {
    const updatedTeacherFirstName = `${teacherFirstName} updated`;
    const updatedTeacherLastName = `${teacherLastName} updated`;
    const updatedNameUsedByChild = `${nameUsedByChild} updated`;
    const updatedTeacherEmail = `updated${teacherEmail}`;

    cy.get('[data-test="teacher-name"]')
        .contains(`${teacherFirstName} ${teacherLastName}`)
        .parent('[data-test="teacher-row"]')
        .within(() => {
            cy.get('.edit-icon').click();
        });

    getFirstNameBox().clear().type(updatedTeacherFirstName);
    getLastNameBox().clear().type(updatedTeacherLastName);
    getNameUsedByChild().clear().type(`Ms ${updatedNameUsedByChild}`);
    getEmailBox().clear().type(updatedTeacherEmail);
    getModalTecaherUpdateButton().click();
    cy.get('.MuiAlert-message').contains('Changes saved').should('be.visible');

    cy.get('[data-test="teacher-name"]').contains(`${updatedTeacherFirstName} ${updatedTeacherLastName}`).should('exist');
    cy.get('[data-test="teacher-email"]').contains(updatedTeacherEmail).should('exist');
};

export const teacher = {
    addTeacher,
    editTeacher
};
