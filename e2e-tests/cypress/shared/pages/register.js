import {
    getCheckBox,
    getEmailBox,
    getFirstNameBox,
    getLastNameBox,
    getNumberBox,
    getPasswordBox,
    getRepeatEmailBox,
    getRepeatPasswordBox,
    getSubmitButton
} from './utils';

/**
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} userEmail
 * @param {string} userRepeatEmail
 * @param {string} mobileNumber
 * @param {string} password
 * @param {string} repeatPassword
 *
 */

const register = async (firstName, lastName, userEmail, userRepeatEmail, mobileNumber, password, repeatPassword) => {
    getFirstNameBox().clear().type(firstName).should('have.value', firstName);
    getLastNameBox().clear().type(lastName).should('have.value', lastName);
    getEmailBox().clear().type(userEmail);
    getRepeatEmailBox().clear().type(userRepeatEmail);
    getNumberBox().clear().type(mobileNumber).should('have.value', mobileNumber);
    getPasswordBox().clear().type(password, { log: false }).should('have.value', password, { log: false });
    getRepeatPasswordBox().clear().type(repeatPassword, { log: false }).should('have.value', repeatPassword, { log: false });
    getCheckBox().click();

    getSubmitButton().click();
};
const assertInvalidEmail = () => cy.log('Your email is not valid');
const assertInvalidPassword = () => cy.log('Passwords do not match');
const assertInvalidMobileNumber = () => cy.log('Not a valid mobile number. Please check and try again.');

export const registerPage = {
    register,
    assertInvalidEmail,
    assertInvalidPassword,
    assertInvalidMobileNumber
};
