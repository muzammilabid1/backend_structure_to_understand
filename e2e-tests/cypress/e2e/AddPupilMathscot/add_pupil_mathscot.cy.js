import {
    admin,
    adminpassword,
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    lwpSchoolName,
    parentEmail,
    parentFirstName,
    parentLastName,
    parentPassword,
    schoolLeader,
    schoolLeaderPasssword
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, submitPupilFeedback, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Add pupil mathscot', () => {
    it('Add pupil mathscot', () => {
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.wait(2000, { log: false });
        cy.get('[data-testid="school-details-link"]').contains(lwpSchoolName).click();
        cy.wait(2000, { log: false });
        getInputBoxByName('enableAddClasses').check().should('be.checked');
        cy.get('.MuiButtonBase-root').contains('Update details').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmail);
        cy.wait(5000, { log: false });
        cy.reload();
        cy.wait(10000, { log: false });
        cy.get(`.MuiTableRow-root`).contains(`${firstName} ${lastName}`).click();
        cy.wait(2000, { log: false });
        cy.get('.MuiCardContent-root > :nth-child(3) > :nth-child(1)').then(($span) => {
            const initialStatus = $span.text();

            cy.log('statsus', initialStatus);

            cy.get(':nth-child(3) > .paragraph').then(($span) => {
                const intialPhotoStatus = $span.text();

                cy.log('status Photo', intialPhotoStatus);

                loginPage.adminAndTeacherLogout();

                cy.wait(3000, { log: false });
                loginPage.login(parentEmail, parentPassword);
                loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
                cy.wait(3000, { log: false });
                cy.get('.MuiTabs-flexContainer').contains('Topics').click();
                cy.wait(3000, { log: false });
                cy.get(
                    '.hide-on-mobile > .MuiGrid-container > .MuiGrid-item > .MuiPaper-root > .MuiCardMedia-root > .not-reading-card-container'
                )
                    .last()
                    .click();
                watchVideoAndUnlockActivities();
                cy.get('.MuiCardMedia-root').last().click();
                submitPupilFeedback();
                cy.get(`.MuiButtonBase-root`).contains('Choose new Mathscot').click();
                cy.wait(5000, { log: false });
                cy.get('.mathscot_container > .MuiGrid-container > :nth-child(2) > .MuiPaper-root').click();
                cy.get('.mathscot_container > .MuiGrid-container > :nth-child(5) > .MuiPaper-root').click();
                cy.get('.mathscot_container > .MuiGrid-container > :nth-child(8) > .MuiPaper-root').click();
                cy.get(`.MuiButtonBase-root`).contains('Create my new mathscot').click();
                cy.get(`.MuiButtonBase-root`).contains('Confirm').click();
                cy.wait(2000, { log: false });

                cy.get('.MuiTypography-root > .material-icons').click({ force: true });
                cy.get(`.MuiList-root`).contains('Sign out').click({ force: true });
            });
        });
    });
});
