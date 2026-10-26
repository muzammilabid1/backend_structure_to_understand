import {
    admin,
    adminpassword,
    animalsNamesActivity,
    animalsNamesTopic,
    baseUrl,
    class1Name,
    fruitsNamesActivity,
    fruitsNamesTopic,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    parentFirstName,
    parentLastName,
    playingGameActivity,
    playingGameTopic,
    releaseDate,
    schoolLeader,
    schoolLeaderPasssword
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { loginPage } from '../../shared/pages/login';
import { addTopicFromAdminSide, getInputBoxByName } from '../../shared/pages/utils';

describe('Add Topics by admin', () => {
    it('Login with admin and adding topics', () => {
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();
        let fruitsNamesTopicName = `${fruitsNamesTopic} ${generateLastName()}`;
        let fruitsNamesActivityName = `${fruitsNamesActivity} ${generateLastName()}`;
        let animalsNamesTopicName = `${animalsNamesTopic} ${generateLastName()}`;
        let animalsNamesActivityName = `${animalsNamesActivity} ${generateLastName()}`;
        let playingGameTopicName = `${playingGameTopic} ${generateLastName()}`;
        let playingGameActivityName = `${playingGameActivity} ${generateLastName()}`;

        cy.visit(baseUrl);
        loginPage.login(admin, adminpassword);
        cy.wait(3000, { log: false });
        addTopicFromAdminSide(fruitsNamesTopicName);
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

        addTopicFromAdminSide(animalsNamesTopicName);
        cy.wait(3000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${animalsNamesTopicName}`).first().dblclick();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activities').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();
        cy.wait(3000, { log: false });
        getInputBoxByName('name').type(animalsNamesActivityName);
        cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
        cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('1');
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Test');

        cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
        cy.wait(2000, { log: false });

        addTopicFromAdminSide(playingGameTopicName);
        cy.wait(3000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${playingGameTopicName}`).first().dblclick();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activities').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();
        cy.wait(3000, { log: false });
        getInputBoxByName('name').type(playingGameActivityName);
        cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
        cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('1');
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Test');

        cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
        cy.wait(2000, { log: false });

        cy.get(`.sidebar-options-list`).contains('Topics').click();

        cy.wait(3000, { log: false });
        loginPage.adminAndTeacherLogout();

        cy.wait(3000, { log: false });
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();
        cy.wait(5000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(10500, { log: false });
        getInputBoxByName('search').type(fruitsNamesTopicName);
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();
        cy.get(
            ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
        ).click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
        cy.wait(1000, { log: false });

        cy.get('.topic-message-input > :nth-child(1) > .undefined > .MuiOutlinedInput-root').first().type('Test email');
        cy.get(`.MuiButtonBase-root`).contains('Add topic').click();
        cy.wait(2000, { log: false });
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
        loginPage.login(schoolLeader, schoolLeaderPasssword);
        cy.wait(2000, { log: false });

        cy.get(`.sidebar-options-list-container`).contains(class1Name).click();

        cy.wait(5000, { log: false });
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.wait(10000, { log: false });
        cy.reload();
        cy.wait(30000, { log: false });

        cy.get(`.MuiTableRow-root`).contains(`${firstName} ${lastName}`).click();

        cy.wait(5000, { log: false });
        cy.get(`.MuiCardContent-root`).contains('Go to parent view').click();
        cy.wait(5000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(10000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains(fruitsNamesTopicName).should('exist');
    });
});
