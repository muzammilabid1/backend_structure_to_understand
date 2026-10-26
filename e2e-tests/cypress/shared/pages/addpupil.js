import { getFirstNameBox, getLastNameBox } from './utils';

const getAddChildButton = () => cy.contains('Add child').first();
const getModalAddChildButton = () => cy.get('.modal-content').contains('Add child').first();

/**
 * @param {string} firstName
 * @param {string} lastName
 */
const addChild = (firstName, lastName) => {
    getAddChildButton().click();
    getFirstNameBox().clear().type(firstName);
    getLastNameBox().clear().type(lastName);
    getModalAddChildButton().click();
};

export const pupil = {
    addChild
};
