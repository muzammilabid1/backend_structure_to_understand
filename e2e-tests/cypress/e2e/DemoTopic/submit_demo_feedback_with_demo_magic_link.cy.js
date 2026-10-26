import { admin, adminpassword, baseUrl, fruitsNamesActivity, fruitsNamesTopic, generateLastName } from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName } from '../../shared/pages/utils';

describe('Demo Topic', () => {
    it('Submit demo topic feedback with demo topic feedback', () => {
        let fruitsNamesTopicName = `${fruitsNamesTopic} ${generateLastName()}`;
        let fruitsNamesActivityName = `${fruitsNamesActivity} ${generateLastName()}`;

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Site parameters').click();
        cy.wait(2000, { log: false });
        cy.get('input[name="DEMOTOPIC"]').clear().type('6655');
        cy.get(':nth-child(7) > .MuiPaper-root > .lwp-button-wrapper > .MuiButton-root').click();
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('teacherTopicName').clear().type(fruitsNamesTopicName);
        cy.get('#checkboxes-tags-demo').click();
        cy.get('#checkboxes-tags-demo-option-2').click();
        cy.get(`.MuiButtonBase-root`).contains('Publish').click();
        cy.wait(3000, { log: false });
        cy.reload();
        cy.wait(3000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${fruitsNamesTopicName}`).first().click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activities').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();
        cy.wait(3000, { log: false });

        getInputBoxByName('name').type(fruitsNamesActivityName);
        cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
        cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('1');
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Test');

        cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${fruitsNamesTopicName}`).first().click();
        cy.wait(2000, { log: false });
        getInputBoxByName('isDemo').check();
        cy.get('.MuiButton-root').contains('Update details').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Generate demo link').click();
        cy.wait(2000, { log: false });
        cy.get('.reset_pwd_link_contain > .paragraph').then(($span) => {
            const demoTopicUrl = $span.text();

            cy.get('.MuiButton-root').contains('Finish').click();
            cy.wait(2000, { log: false });
            loginPage.adminAndTeacherLogout();
            cy.wait(2000, { log: false });
            cy.visit(demoTopicUrl);
            cy.wait(2000, { log: false });
            cy.get(`.child-card-footer-contanier`).contains(fruitsNamesActivityName).click();
            cy.wait(2000, { log: false });
            cy.get(':nth-child(2) > .MuiPaper-root > .comment-card-left-sec > .root > .undefined > .MuiOutlinedInput-root').type('haha');
            cy.get(':nth-child(3) > .MuiPaper-root > .comment-card-left-sec > .root > .undefined > .MuiOutlinedInput-root').type('hehe');
            getInputBoxByName('shareWithParents').check().should('be.checked');
            cy.get('.MuiButton-root').contains('Save comments').click();
            cy.wait(2000, { log: false });
            cy.get('.mathscot-with-bubble-text > .heading-one').should('contain', fruitsNamesTopicName);
        });
    });
});
