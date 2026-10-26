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

describe('Adding child with unresgitered parent and reject by child', () => {
    it('Adding child with unresgitered parent and reject by child', () => {
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();

        cy.visit(baseUrl);
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.wait(2000, { log: false });
        cy.reload();
        cy.wait(10000, { log: false });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        signUpParent(lwpSchoolName, class1Name, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        loginPage.rejectChildInvitationForParent(`${firstName} ${lastName}`);
        cy.log('The invitation is rejected');
    });
});
