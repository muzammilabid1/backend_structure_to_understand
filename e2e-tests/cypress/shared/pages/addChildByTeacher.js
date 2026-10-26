import { generateRandomString, mockUPNPrefix } from '../constants';
import { getFutureDate, getInputBoxByName } from './utils';

const getAddChildButton = () => cy.get(`.MuiCardContent-root > .MuiList-root`).contains('Add pupils');
const getInviteNewPupil = () => cy.get(`[data-test="create-pupil-link"]`);

/**
 * @param {string} pupilFirstName
 * @param {string} pupilLastName
 * @param {string} parentFirstName
 * @param {string} parentLastName
 * @param {string} parentEmail
 * @param {string} parentPhoneNumber
 * @param {boolean} submit
 *
 */
const addChildByTeacher = (
    pupilFirstName,
    pupilLastName,
    parentFirstName,
    parentLastName,
    parentEmail = null,
    parentPhoneNumber = null,
    submit = true
) => {
    cy.get(`.MuiTabs-flexContainer`).contains('Pupils').click();
    getAddChildButton().click();
    getInviteNewPupil().click();
    getInputBoxByName('firstName').type(pupilFirstName);
    getInputBoxByName('lastName').type(pupilLastName);
    getInputBoxByName('dateOfBirth').type(getFutureDate(0));
    getInputBoxByName('upn').type(`${mockUPNPrefix}${generateRandomString()}`);
    cy.get('[data-test="add-pupil-gender-select"]').click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Male').click();
    cy.get('[data-test="add-pupil-year-group-select"]').click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Year 1').click();
    cy.get('[data-test="add-pupil-isPremium-select"]').click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('No').click();
    cy.get('[data-test="add-first-parent-for-pupil-button"]').click();
    getInputBoxByName('parentFirstname').type(parentFirstName);
    getInputBoxByName('parentLastname').type(parentLastName);
    if (parentEmail) getInputBoxByName('email').type(parentEmail);
    if (parentPhoneNumber) getInputBoxByName('phoneNumber').type(parentPhoneNumber);
    cy.get('[data-test="add-parent-for-a-pupil-button"]').contains('Add parent').click();
    cy.get('.MuiAlert-message').contains('Parent details have been added successfully.');
    if (submit) {
        cy.get('[data-test="add-pupil-button"]').contains('Add pupil').click();
        cy.get('[data-test="common-nav-pupils-tab"]').contains('Pupils').should('exist');
    }
};

export const pupilByTeacher = {
    addChildByTeacher
};
