import {
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    parentFirstName,
    parentLastName,
    schoolLeader,
    schoolLeaderPasssword
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { loginPage } from '../../shared/pages/login';

describe('Adding child and try to signup with invalid token', () => {
    it('Adding child and try to signup with invalid token', () => {
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        cy.wait(3000, { log: false });
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.wait(2000, { log: false });
        cy.reload();
        cy.wait(10000, { log: false });
        cy.get(`.MuiTableCell-root`).contains(`${firstName} ${lastName}`).click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Details').click();
        cy.wait(3000, { log: false });
        loginPage.adminAndTeacherLogout();
        cy.wait(3000, { log: false });
        cy.visit(`${baseUrl}signup/21231645646`);
        cy.log('The token is not valid');
    });
});
