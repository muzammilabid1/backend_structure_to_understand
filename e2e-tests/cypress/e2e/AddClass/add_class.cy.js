import {
    admin,
    adminpassword,
    baseUrl,
    className,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    password,
    schoolName
} from '../../shared/constants';
import { addClassPage } from '../../shared/pages/addClass';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Add class', () => {
    let schoolEmail = generateSchoolEmail();

    const myClassName = `${className} Class`;
    const myClassName2 = `${className} 2 Class`;

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add school', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Schools').click();

        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a school').click();
        getInputBoxByName('schoolName').type(`${schoolName} School`);
        getInputBoxByName('firstname').type(leaderFirstName);
        getInputBoxByName('lastname').type(leaderlastName);
        getInputBoxByName('email').type(schoolEmail);
        getInputBoxByName('nameForChildren').type(`Mr ${leaderFirstName}`);
        getInputBoxByName('fullProgrammedClassesAllowed').type('5');
        getInputBoxByName('classesAllowed').type('10');
        cy.get(`.MuiButtonBase-root`).contains('Add school').click();

        cy.get('[data-testid="school-details-link"]')
            .contains(`${schoolName} School`)
            .dblclick();

        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.get('.MuiAlert-message').contains('School has been successfully updated.');
    });

    it('Add class in the current academic year', () => {
        loginPage.login(admin, adminpassword);

        cy.get('.sidebar-options-list').contains('Schools').click();

        cy.get('[data-testid="school-details-link"]')
            .contains(`${schoolName} School`)
            .dblclick();

        cy.get('.MuiTabs-flexContainer').contains('Classes').click();
        addClassPage.addClass(myClassName);

        cy.get('.MuiTabs-flexContainer').contains('Classes').click();

        cy.get('.programme-info-alert-container > .paragraph').contains(myClassName);
    });

    it('Add class in the next academic year', () => {
        loginPage.login(admin, adminpassword);

        cy.get('.sidebar-options-list').contains('Schools').click();

        cy.get('[data-testid="school-details-link"]')
            .contains(`${schoolName} School`)
            .dblclick();

        getInputBoxByName('isReadyTeddyAvailable').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.get('.MuiAlert-message').contains('School has been successfully updated.');

        cy.get('.MuiTabs-flexContainer').contains('Classes').click();

        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Create a class').click();

        getInputBoxByName('name').type(myClassName2);

        cy.get('div[data-test="add-class-year-group-select"] #demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Reception').click();

        cy.get('div[data-test="add-class-academic-year-select"] #demo-simple-select-outlined').click();

        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Sept 2027 to Aug 2028').click();

        cy.get('div[data-test="add-class-main-teacher-select"] #demo-simple-select-outlined').click();

        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();

        getInputBoxByName('isReadingLogsEnabled').should('not.exist');
        getInputBoxByName('isFullProgramme').should('not.exist');

        getInputBoxByName('isReadyTeddy').check().should('be.checked');

        cy.get(`.MuiButton-root`).contains('Create class').click();

        cy.get('.MuiTabs-flexContainer').contains('Classes').click();

        cy.get('.programme-info-alert-container > .paragraph').contains(myClassName2);
    });

    it('Prevents school leader from adding a class to the next academic year and shows created classes in the correct sections', () => {
        loginPage.login(admin, adminpassword);

        signUpSchoolTeacher(schoolName, `${leaderFirstName} ${leaderlastName}`, password);

        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a class').click();

        cy.get('.heading-one').contains('Create a new class');

        cy.get('div[data-test="add-class-academic-year-select"] #demo-simple-select-outlined').should('not.exist');

        cy.get('.sidebar-options-list').contains('School overview').click();

        cy.get('div[data-test="registration-classes"]').within(() => {
            cy.get('table tbody tr td .class-overview-classname .paragraph').contains(myClassName);
        });

        cy.get('div[data-test="next-academic-year-classes"]').within(() => {
            cy.get('table tbody tr td .class-overview-classname .paragraph').contains(myClassName2);
        });
    });
});
