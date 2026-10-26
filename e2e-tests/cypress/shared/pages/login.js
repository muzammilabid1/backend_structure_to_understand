import 'cypress-iframe';

import {
    acceptFeatureTooltipPrompt,
    acceptMultiChildPrompt,
    acceptPupilInvitation,
    getAlertBox,
    getEmailBox,
    getPasswordBox,
    getSubmitButton,
    openSideDrawer
} from './utils';

/**
 * @param {string} username
 * @param {string} password
 * @param {boolean} keepLoggedIn
 */
const login = async (username, password, keepLoggedIn = false) => {
    cy.wait(5000, { log: false });
    getEmailBox().clear().type(username).should('have.value', username);
    cy.get(`.MuiButtonBase-root`).contains('Next').click();
    cy.wait(2000, { log: false });
    cy.get('body').then((body) => {
        if (body.find('.login_password_btn').length > 0) {
            cy.get('.login_password_btn').contains('Log in with password').click();
        }
    });
    getPasswordBox().clear().type(password, { log: false }).should('have.value', password);
    if (keepLoggedIn) {
        cy.get('input[name="rememberMe"]').click();
    }

    getSubmitButton().click();
    cy.wait(5000, { log: false });
    acceptFeatureTooltipPrompt();
    openSideDrawer();
};

/**
 * @param {string} username
 * @param {string} social
 */
const socialLogin = async (username, social) => {
    cy.wait(5000, { log: false });
    getEmailBox().clear().type(username).should('have.value', username);
    cy.get(`.MuiButtonBase-root`).contains('Next').click();
    cy.wait(2000, { log: false });
    if (social === 'Google') {
        cy.get('#gsiButtonDiv').click();
    } else {
        cy.get('.msLoginBtn').click();
    }

    cy.wait(5000, { log: false });
};

const preLogin = async (username) => {
    cy.wait(5000, { log: false });
    getEmailBox().clear().type(username).should('have.value', username);
    cy.get(`.MuiButtonBase-root`).contains('Next').click();
    cy.wait(7000, { log: false });
};

/**
 * @param {string} childName
 */
const acceptChildInvitationForParent = (childName) => {
    cy.get('.invited-child-container').contains(childName).parents('.invited-child-header-bottom').find('.invited-child-button').click();
    acceptPupilInvitation();
    acceptMultiChildPrompt();
};

/**
 * @param {string} childName
 */
const rejectChildInvitationForParent = (childName) => {
    cy.get('.invited-child-container').contains(childName).parents('.invited-child-header-bottom').find('.invited-child-button').click();
    cy.wait(2000, { log: false });
    cy.get('.interstitials_notCorrect > u').click();
    cy.get('.MuiButtonBase-root').contains('Reject this invitation').click();
    cy.wait(2000, { log: false });
};
const logout = () => {
    cy.get('.MuiTypography-root > .material-icons').click();
    cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
    cy.wait(2000, { log: false });
    getEmailBox().should('exist');
};

const adminAndTeacherLogout = () => {
    cy.wait(2000, { log: false });
    cy.get('[data-test="teacher-and-admin-popover-list-expand-icon"]').click();
    cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
    cy.wait(2000, { log: false });
};

const assertInvalidCredentials = () => getAlertBox().should('contain', 'Your email or password is incorrect. Please check and try again.');

export const loginPage = {
    login,
    logout,
    preLogin,
    assertInvalidCredentials,
    socialLogin,
    acceptChildInvitationForParent,
    rejectChildInvitationForParent,
    adminAndTeacherLogout
};
