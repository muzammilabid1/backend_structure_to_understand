import {
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    parentEmail,
    parentFirstNameExample,
    parentLastNameParent,
    parentPassword,
    schoolLeader,
    schoolLeaderPasssword
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { loginPage } from '../../shared/pages/login';

describe('Adding child in existing parent', () => {
    it('Adding child in existing parent', () => {
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        cy.wait(5000, { log: false });
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstNameExample, parentLastNameParent, parentEmail);
        cy.wait(5000, { log: false });
        cy.reload();
        cy.wait(10000, { log: false });
        cy.get(`.MuiTableCell-root`).contains(`${firstName} ${lastName}`).click();
        cy.wait(5000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Details').click();
        loginPage.adminAndTeacherLogout();
        cy.wait(3000, { log: false });
        loginPage.login(parentEmail, parentPassword);
        cy.wait(5000, { log: false });
        loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
        // cy.get(`.MuiButtonBase-root`).contains('Accept invite').click();
        // cy.get(`.MuiPaper-root > .MuiCardMedia-root`).last().click();
        // cy.get(`.child_invitation_modal > .btn_group`).contains('Accept invite').click();
        cy.log(`The first name of child is matched ${firstName}`);
        cy.log(`The last name of child is matched ${lastName}`);
    });
});
