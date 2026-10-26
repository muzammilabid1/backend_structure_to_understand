import {
    admin,
    adminpassword,
    baseUrl,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    newsDescription,
    newsDescriptionForLeader,
    newsDescriptionForTeacher,
    newsTitle,
    newsTitleForLeader,
    newsTitleForTeacher,
    password,
    schoolName,
    schoolTeacherEmail,
    schoolTeacherPass
} from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Add leader and teacher create news for both and check on both side', () => {
    it('Add leader and teacher create news for both and check on both side', () => {
        let schoolEmail = generateSchoolEmail();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.wait(2000, { log: false });

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
        cy.wait(2000, { log: false });
        cy.get('[data-testid="school-details-link"]')
            .contains(`${schoolName} School`)
            .click();
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.wait(5000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Staff').click();
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('News').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a news').click();
        cy.wait(1000, { log: false });
        cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(newsTitle);
        cy.get('.editor-input').type(newsDescription);

        cy.get(`.MuiDialogContent-root`).contains('Teacher').click();
        cy.get(`.MuiDialogContent-root`).contains('Leader').click();
        cy.get(`.MuiButtonBase-root`).contains('Add news').click();
        cy.wait(1000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a news').click();
        cy.wait(5000, { log: false });
        cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(newsTitleForLeader);
        cy.get('.editor-input').type(newsDescriptionForLeader);
        cy.wait(1000, { log: false });
        cy.get('.MuiDialogContent-root > :nth-child(4)').click({ force: true });
        cy.wait(1000, { log: false });
        cy.get(`.MuiButtonBase-root`).contains('Add news').click();
        cy.wait(5000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a news').click();
        cy.wait(5000, { log: false });
        cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(newsTitleForTeacher);
        cy.get('.editor-input').type(newsDescriptionForTeacher);
        cy.wait(5000, { log: false });
        cy.get('.MuiDialogContent-root > :nth-child(3)').click();
        cy.get(`.MuiButtonBase-root`).contains('Add news').click();
        cy.wait(5000, { log: false });
        signUpSchoolTeacher(schoolName, `${leaderFirstName} ${leaderlastName}`, password);
        cy.get(`.sidebar-options-list`).contains('News').click();
        cy.wait(5000, { log: false });
        cy.get('.MuiCardContent-root > .heading-one')
            .last()
            .then(($span) => {
                const newsTitleOnLeaderSide = $span.text();

                if (newsTitle === newsTitleOnLeaderSide) {
                    cy.log('News title is matching on school leader side');
                }

                cy.get('.description')
                    .last()
                    .then(($span) => {
                        const newsDescriptionOnLeaderSide = $span.text();

                        if (newsDescription === newsDescriptionOnLeaderSide) {
                            cy.log('News description is matching on school leader side');
                        }

                        cy.get('.MuiCardContent-root > .heading-one')
                            .first()
                            .then(($span) => {
                                const newsTitleForLeaderOnLeaderSide = $span.text();

                                if (newsTitleForLeader === newsTitleForLeaderOnLeaderSide) {
                                    cy.log('The leader news title is matching on leader panel');
                                }

                                cy.get('.description')
                                    .first()
                                    .then(($span) => {
                                        const newsDescriptionForLeaderOnLeaderSide = $span.text();

                                        if (newsDescriptionForLeader === newsDescriptionForLeaderOnLeaderSide) {
                                            cy.log('The leader news description is matching on leader panel');
                                        }
                                    });
                            });

                        cy.wait(5000, { log: false });
                    });
                loginPage.adminAndTeacherLogout();

                cy.wait(2000, { log: false });
                loginPage.login(schoolTeacherEmail, schoolTeacherPass);
                cy.wait(2000, { log: false });

                cy.get(`.sidebar-options-list`).contains('News').click();
                cy.wait(5000, { log: false });
                cy.get('.MuiCardContent-root > .heading-one')
                    .last()
                    .then(($span) => {
                        const newsTitleOnTeacherSide = $span.text();

                        if (newsTitle === newsTitleOnTeacherSide) {
                            cy.log('News title is matching on school teacher side');
                        }

                        cy.get('.description')
                            .last()
                            .then(($span) => {
                                const newsDescriptionOnTeacherSide = $span.text();

                                if (newsDescription === newsDescriptionOnTeacherSide) {
                                    cy.log('News description is matching on school teacher side');
                                }
                            });
                        cy.get('.MuiCardContent-root > .heading-one')
                            .first()
                            .then(($span) => {
                                const newsTitleForTeacherOnly = $span.text();

                                if (newsTitleForTeacher === newsTitleForTeacherOnly) {
                                    cy.log('News for teacher title is matching on school teacher side');
                                }

                                cy.get('.description')
                                    .first()
                                    .then(($span) => {
                                        const newsDescriptionOnTeacherOnly = $span.text();

                                        if (newsDescriptionForTeacher === newsDescriptionOnTeacherOnly) {
                                            cy.log('News for teacher description is matching on school teacher side');
                                        }
                                    });
                            });
                    });
            });
    });
});
