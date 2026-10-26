import { getInputBoxByName } from './utils';

/**
 * @param {string} className
 * @param {boolean} isReadingLogsEnabled
 * @param {boolean} isFullProgramme
 * @param {string} mainTeacherName
 */

const addClass = (className, isReadingLogsEnabled = true, isFullProgramme = true, mainTeacherName = null) => {
    cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Create a class').click();
    getInputBoxByName('name').type(className);

    cy.get('div[data-test="add-class-year-group-select"] #demo-simple-select-outlined').click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Year 1').click();
    cy.get('div[data-test="add-class-main-teacher-select"] #demo-simple-select-outlined').click();
    if (mainTeacherName) {
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(mainTeacherName).click();
    } else {
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
    }

    if (isReadingLogsEnabled) getInputBoxByName('isReadingLogsEnabled').check().should('be.checked');
    if (isFullProgramme) getInputBoxByName('isFullProgramme').check().should('be.checked');
    cy.get(`.MuiButton-root`).contains('Create class').click();
    cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .should('exist');
};

export const addClassPage = {
    addClass
};
