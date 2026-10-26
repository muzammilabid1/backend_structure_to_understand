import {
    admin,
    adminpassword,
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    lwpSchoolName,
    NotificationParameter,
    NotificationType,
    parentEmail,
    parentPassword
} from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';
import { acceptMultiChildPrompt, goToParentDetailsFromAdminSide, runCronJob, visitMagicLinkUrlOfParent } from '../../shared/pages/utils';

describe('Invite the parent and rejecting by the parent', () => {
    it('Invite the parent and rejecting by the parent', () => {
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(parentEmail, parentPassword);

        cy.get(':nth-child(1) > .MuiPaper-root > .MuiCardActions-root').click();
        cy.wait(3000, { log: false });
        acceptMultiChildPrompt();
        cy.get('.child-detail-header').then(($span) => {
            const childName = $span.text();

            cy.log('Child name', childName);
            cy.get('.svg-iocn').click();
            cy.get(':nth-child(1) > .MuiPaper-root > .MuiCardMedia-root > .edit-icon-container > .material-icons').click();

            cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a parent').click();
            cy.get('.MuiDialogContent-root > :nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                .clear()
                .type(firstName);
            cy.get('.MuiDialogContent-root > :nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                .clear()
                .type(lastName);
            cy.get(':nth-child(3) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                .clear()
                .type(parentEmailForInvitation);
            cy.get('.btn_group > :nth-child(2) > .MuiButtonBase-root').click();

            cy.get(`p:contains('${firstName}')`).should('exist');

            // // Logout
            loginPage.logout();
            cy.wait(3000, { log: false });
            loginPage.login(admin, adminpassword);
            goToParentDetailsFromAdminSide(lwpSchoolName, class1Name, childName, `${firstName} ${lastName}`);
            cy.get(`.MuiButtonBase-root`).contains('Re-Invite Parent').click();
            runCronJob('sendAllPendingNotifications', false);
            visitMagicLinkUrlOfParent(
                lwpSchoolName,
                class1Name,
                childName,
                `${firstName} ${lastName}`,
                NotificationType.INVITATION,
                NotificationParameter.REJECT_MAGICID
            );
            cy.wait(3000, { log: false });
            cy.get('.common_status_container > .paragraph')
                .contains('You will not be contacted for this child and the school will be notified to update their records.')
                .should('exist');
        });
    });
});
