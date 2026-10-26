import {
    admin,
    adminpassword,
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    inviteParentPass,
    lwpSchoolName,
    NotificationParameter,
    NotificationType,
    parentEmail,
    parentPassword
} from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';
import { acceptMultiChildPrompt, goToParentDetailsFromAdminSide, runCronJob, visitMagicLinkUrlOfParent } from '../../shared/pages/utils';

describe('Invite the parent', () => {
    it('Invite the parent', () => {
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Site parameters').click();
        cy.wait(3000, { log: false });
        cy.get(':nth-child(30) > .MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('false').click();
        cy.get(':nth-child(33) > .MuiButtonBase-root').click();
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
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
            cy.wait(2000, { log: false });
            cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
            cy.contains('.table_main .tr_row .td', `Parent Invitation Email`).then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                    });
            });
            cy.get('textarea[name="params"]')
                .invoke('val')
                .then((paramsValue) => {
                    const text = paramsValue.toString();

                    const topicParameters = JSON.parse(text);

                    expect(topicParameters).to.include({
                        FIRSTNAME: firstName,
                        LASTNAME: lastName,
                        USERSTATUS: 'INVITED'
                    });
                });
            cy.get('body').click(0, 0);
            cy.contains('.table_main .tr_row .td', `User Requested Signup Link Email`).then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                    });
            });
            cy.get('textarea[name="params"]')
                .invoke('val')
                .then((paramsValue) => {
                    const text = paramsValue.toString();

                    const topicParameters = JSON.parse(text);

                    expect(topicParameters).to.include({
                        FIRSTNAME: firstName,
                        LASTNAME: lastName,
                        USERSTATUS: 'INVITED'
                    });
                });
            cy.get('body').click(0, 0);
            runCronJob('sendAllPendingNotifications', false);
            visitMagicLinkUrlOfParent(
                lwpSchoolName,
                class1Name,
                childName,
                `${firstName} ${lastName}`,
                NotificationType.INVITATION,
                NotificationParameter.MAGICID
            );
            cy.wait(3000, { log: false });
            cy.get('.MuiButton-root').contains('Continue to set password').click();
            cy.wait(3000, { log: false });
            cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root').type(inviteParentPass);
            cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root').type(inviteParentPass);
            cy.get('.MuiFormControlLabel-root').click();
            cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
            cy.wait(2000, { log: false });
            cy.log(`The first name is matched , ${firstName}`);
            cy.log(`The last name is matched , ${lastName}`);
            cy.log(`The parent email address is matched , ${parentEmailForInvitation}`);
            cy.log('The status is register');
            loginPage.logout();
            loginPage.login(admin, adminpassword);
            cy.wait(3000, { log: false });
            cy.get(`.sidebar-options-list`).contains('Site parameters').click();
            cy.wait(3000, { log: false });
            cy.get(':nth-child(30) > .MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined').click();
            cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('true').click();
            cy.get(':nth-child(33) > .MuiButtonBase-root').click();
            cy.wait(2000, { log: false });
            loginPage.adminAndTeacherLogout();
        });
    });
});
