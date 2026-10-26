import {
    admin,
    adminpassword,
    baseUrl,
    generateFirstName,
    generateLastName,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    parentEmail,
    parentFirstName,
    parentLastName,
    parentPassword,
    password,
    releaseDate,
    schoolName
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { addClassPage } from '../../shared/pages/addClass';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, signUpSchoolTeacher, submitPupilFeedback, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Login with parent perform activity and check active status count on leader side', () => {
    it('Login with parent perform activity and check active status count on leader side', () => {
        let schoolEmail = generateSchoolEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });

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
        cy.wait(3000, { log: false });
        cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
        cy.get('input[name="classesAllowed"]').clear().type('10000');
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        cy.wait(3000, { log: false });

        cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
        cy.wait(2000, { log: false });

        addClassPage.addClass('Tester Class');
        cy.wait(3000, { log: false });
        signUpSchoolTeacher(schoolName, `${leaderFirstName} ${leaderlastName}`, password);
        cy.wait(5000, { log: false });

        cy.get(`.sidebar-options-list-container`).contains('Tester Class').click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(10000, { log: false });
        cy.get(':nth-child(1) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type('Year 1');
        cy.get('body').then((body) => {
            if (body.find('#checkboxes-tags-demo-option-0').length > 0) {
                cy.get('#checkboxes-tags-demo-option-0').click();
            } else {
                cy.get('body').click(0, 0);
            }
        });
        getInputBoxByName('search').type('Sea');
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();
        cy.get(
            ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
        ).click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
        cy.wait(800, { log: false });
        cy.get(`.MuiButtonBase-root`).contains('Add topic').click();
        cy.wait(2000, { log: false });

        cy.get(`.sidebar-options-list-container`).contains('Tester Class').click();
        cy.get(`.MuiTabs-flexContainer`).contains('Pupils').click();

        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmail);
        cy.wait(3000, { log: false });
        cy.get(':nth-child(1) > .MuiTypography-root > .textClassName > .progress_bar_card_text_container').then(($span) => {
            const classpupilInitialActiveStatus = $span.text();

            cy.get(':nth-child(3) > .MuiTypography-root > .textClassName > .progress_bar_card_text_container').then(($span) => {
                const classpupilInitialMissingStatus = $span.text();

                cy.wait(5000, { log: false });
                cy.reload();
                cy.wait(3000, { log: false });
                loginPage.adminAndTeacherLogout();

                cy.wait(3000, { log: false });
                loginPage.login(admin, adminpassword);

                cy.wait(5000, { log: false });
                cy.get(`.sidebar-options-list`).contains('Run tasks').click();

                cy.wait(2000, { log: false });
                cy.get('.MuiInputAdornment-root > .MuiButtonBase-root').first().click();
                cy.get('.MuiButtonBase-root.MuiPickersDay-root').contains(releaseDate).click();
                cy.get(`.MuiButtonBase-root`).contains('Release topics').click();
                cy.wait(2000, { log: false });
                loginPage.adminAndTeacherLogout();
                cy.wait(2000, { log: false });

                loginPage.login(parentEmail, parentPassword);
                cy.wait(2000, { log: false });
                loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
                cy.wait(5000, { log: false });
                cy.get('.MuiTabs-flexContainer').contains('Topics').click();
                cy.wait(2000, { log: false });
                cy.get(
                    '.hide-on-mobile > .MuiGrid-container > .MuiGrid-item > .MuiPaper-root > .MuiCardMedia-root > .not-reading-card-container'
                )
                    .last()
                    .click();
                watchVideoAndUnlockActivities();
                cy.get('.MuiGrid-root > .MuiPaper-root > .MuiCardMedia-root').first().click();
                submitPupilFeedback();
                cy.get('.MuiTypography-root > .material-icons').click();
                cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
                cy.wait(3000, { log: false });
                loginPage.login(schoolEmail, password);
                cy.wait(3000, { log: false });
                cy.get(`.sidebar-options-list-container`).contains('Tester Class').click();
                cy.wait(2000, { log: false });

                cy.get(`.MuiTabs-flexContainer`).contains('Pupils').click();

                cy.get(':nth-child(1) > .MuiTypography-root > .textClassName > .progress_bar_card_text_container').then(($span) => {
                    const classpupilCompletedActiveStatus = $span.text();

                    cy.get(':nth-child(3) > .MuiTypography-root > .textClassName > .progress_bar_card_text_container').then(($span) => {
                        const classpupilInitialMissingStatusUpdated = $span.text();

                        if (
                            classpupilInitialActiveStatus < classpupilCompletedActiveStatus &&
                            classpupilInitialMissingStatus > classpupilInitialMissingStatusUpdated
                        ) {
                            cy.log('The active and missing status of class has been updated successfully');
                        }
                    });
                });
            });
        });
    });
});
