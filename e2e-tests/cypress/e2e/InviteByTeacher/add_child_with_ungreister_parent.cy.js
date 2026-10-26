import {
    admin,
    adminpassword,
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    lwpSchoolName,
    parentFirstName,
    parentLastName,
    schoolLeader,
    schoolLeaderPasssword
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { loginPage } from '../../shared/pages/login';
import { signUpParent } from '../../shared/pages/utils';

describe('Adding child with unregistered parent', () => {
    it('Adding child with unregistered parent', () => {
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.wait(4000, { log: false });
        cy.reload();
        cy.wait(2000, { log: false });
        cy.wait(10000, { log: false });
        cy.get(`.MuiTableCell-root`).contains(`${firstName} ${lastName}`).click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Details').click();
        cy.wait(1000, { log: false });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        signUpParent(lwpSchoolName, class1Name, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
        cy.log(`The first name of child is matched ${firstName}`);
        cy.log(`The last name of child is matched ${lastName}`);
        cy.log(`The first name of parent is matched ${parentFirstName}`);
        cy.log(`The last name of parent is matched ${parentLastName}`);
        cy.log('The status of parent is register');
    });
});
