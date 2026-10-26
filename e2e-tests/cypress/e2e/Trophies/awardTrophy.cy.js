import {
    admin,
    adminpassword,
    baseUrl,
    class1Name,
    generateFirstName,
    generateLastName,
    generateRandomNumber,
    parentEmail,
    parentFirstNameExample,
    parentLastNameParent,
    parentPassword,
    schoolLeader,
    schoolLeaderPasssword
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName } from '../../shared/pages/utils';

describe('Create a trophy certificate and assign it to pupil and download', () => {
    let certificateName = `${generateFirstName()} Test Certificate`;
    let certificateOrder = `${generateRandomNumber()}`;
    let childNameXValue = '210';
    let childNameYValue = '490';
    let childNameFontSize = '60';
    let certificateBadge = 'Winter_11.png';
    let certificateFile = 'MathscotCertificate.pdf';
    let pupilFirstName = generateFirstName();
    let pupilLastName = generateLastName();

    it('Create a trophy certificate and assign it to pupil and download', () => {
        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list .MuiTypography-root`).contains('Trophy certificates').click();
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a Trophy Certificate').click();
        getInputBoxByName('title').type(certificateName).should('have.value', certificateName);
        getInputBoxByName('order').clear().type(certificateOrder).should('have.value', certificateOrder);
        getInputBoxByName('isActive').should('be.checked');
        getInputBoxByName('isPupilMail').check().should('be.checked');
        getInputBoxByName('isTeacherMail').check().should('be.checked');
        cy.get(`.MuiButton-root`).contains('Add Field Data').click();
        getInputBoxByName('fieldData.0.xValue').clear().type(childNameXValue).should('have.value', childNameXValue);
        getInputBoxByName('fieldData.0.yValue').clear().type(childNameYValue).should('have.value', childNameYValue);
        getInputBoxByName('fieldData.0.fontSize').clear().type(childNameFontSize).should('have.value', childNameFontSize);
        cy.get('input[type="file"]').first().attachFile(certificateBadge);
        cy.get('input[type="file"]').last().attachFile(certificateFile);
        cy.log('Waiting for file to upload...');
        cy.wait(5000, { log: false });
        cy.get('.add-trophy-button').click();
        cy.log('Waiting for certificate to create...');
        cy.wait(10000, { log: false });
        cy.get('.add-trophy-button.MuiButton-root').contains('Edit Trophy Certificate').should('contain', 'Edit Trophy Certificate');
        getInputBoxByName('title').should('have.value', certificateName);
        loginPage.adminAndTeacherLogout();

        cy.log(`Award ${certificateName} to ${pupilFirstName} ${pupilLastName} and download from dialog`);

        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        pupilByTeacher.addChildByTeacher(pupilFirstName, pupilLastName, parentFirstNameExample, parentLastNameParent, parentEmail);
        cy.wait(5000, { log: false });
        cy.reload();
        cy.wait(20000, { log: false });
        cy.get(`.MuiTableCell-root`).contains(`${pupilFirstName} ${pupilLastName}`).click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Details').click();
        cy.wait(3000, { log: false });
        loginPage.adminAndTeacherLogout();
        cy.wait(3000, { log: false });
        loginPage.login(parentEmail, parentPassword);
        cy.wait(3000, { log: false });
        loginPage.acceptChildInvitationForParent(`${pupilFirstName} ${pupilLastName}`);
        cy.wait(3000, { log: false });
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        cy.wait(20000, { log: false });
        cy.get(`.MuiGrid-root`).contains(`${pupilFirstName} ${pupilLastName}`).click();
        cy.wait(5000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Awards').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiButtonBase-root.MuiButton-root').contains('Select the trophy').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiButtonBase-root').contains(certificateName).click();
        cy.get('.MuiButtonBase-root.MuiButton-root').contains('Award trophy').click();
        cy.log('Waiting for trophy to assign...');
        cy.wait(5000, { log: false });
        cy.get('.achivement_pupil_mathscot_cards .achivement_card .typography-text')
            .contains(certificateName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().first().click();
                    });
            });
        cy.get('.MuiButtonBase-root.MuiButton-root').contains('Download Certificate').should('contain', 'Download Certificate');
        cy.get('body').trigger('keydown', { keyCode: 27 });
        cy.wait(500);
        loginPage.adminAndTeacherLogout();

        cy.log(`${pupilFirstName} ${pupilLastName} can access and download ${certificateName} on trophies page,`);

        loginPage.login(parentEmail, parentPassword);
        cy.get('.MuiCardActions-root .child-card-footer-contanier .footer-contant .primary-text').contains(`${pupilFirstName}`).click();
        cy.wait(5000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Awards').click();
        cy.wait(3000, { log: false });
        cy.get('.achivement_pupil_mathscot_cards .achivement_card .typography-text')
            .contains(certificateName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then(($div) => {
                        cy.wrap($div).children().first().click();
                    });
            });
        cy.get('.MuiButtonBase-root.MuiButton-root').contains('Download Certificate').should('contain', 'Download Certificate');
        cy.get('body').trigger('keydown', { keyCode: 27 });
        cy.wait(500);
        cy.get('.achivement_pupil_mathscot_cards .achivement_card .typography-text')
            .contains(certificateName)
            .should('contain', `${certificateName}`);
    });
});
