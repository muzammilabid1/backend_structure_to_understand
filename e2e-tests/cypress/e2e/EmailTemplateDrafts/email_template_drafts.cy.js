import {
    admin,
    adminpassword,
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateSchoolEmail,
    leaderFirstName,
    leaderlastName,
    newTopicName,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { getTextAreaBoxByName, goToParentDetailsFromAdminSide, runCronJob } from '../../shared/pages/utils';

describe('Email template draft test cases', () => {
    const templateBody = ' Send question to user current';
    const draftTemplateBody = ' Send question to user draft';
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const myTopicName = `${newTopicName} Topic`;
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add test data and release topic', () => {
        addSchoolAndClassAndPupilWithMutation(
            mySchoolName,
            myClassName,
            myTopicName,
            password,
            [
                { name: activity_one, order: 1, activityComponentName: 'GuessTheAnimal' },
                { name: activity_two, order: 2, activityComponentName: 'ClapClap' },
                { name: activity_third, order: 3, activityComponentName: 'SoundsScavengerHunt' }
            ],
            {
                firstname: leaderFirstName,
                lastname: leaderlastName,
                email: schoolEmail,
                nameForChildren: `Mr ${leaderFirstName}`
            },
            {
                firstName,
                lastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
            },
            true,
            true
        );
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Create email template draft', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
        cy.wait(2000, { log: false });
        cy.get('.common_tebs').find('.MuiButtonBase-root').contains('Automated messages').should('be.visible');
        cy.get('.row_draft').should('not.exist');
        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Send Question To User')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        cy.wait(2000, { log: false });
        cy.get('.border_unActive > .MuiFormControlLabel-root');
        cy.get('.common_radio_container > span:nth-child(1)').click();
        cy.get('input[name="previewLine"]').clear().type('my preview line');
        cy.get('input[name="heading"]').clear().type('Send Question To User');
        cy.get('.editor-input').clear().type(draftTemplateBody, {
            parseSpecialCharSequences: false
        });
        cy.get(`.MuiButtonBase-root`).contains('Save as a draft').click();
        cy.wait(2000, { log: false });
        cy.get('.row_draft').should('exist');
    });

    it('Save and activate email template draft', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
        cy.wait(2000, { log: false });
        cy.get('.common_tebs').find('.MuiButtonBase-root').contains('Automated messages').should('be.visible');
        cy.get('.row_draft').should('exist');
        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Send Question To User')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        cy.wait(2000, { log: false });
        cy.get('.border_unActive > .MuiFormControlLabel-root');
        cy.get('.common_radio_container > span:nth-child(1)').click();
        cy.get('input[name="previewLine"]').clear().type('my preview line');
        cy.get('input[name="heading"]').clear().type('Send Question To User');
        cy.get('.editor-input').clear().type(templateBody, {
            parseSpecialCharSequences: false
        });
        cy.get(`.MuiButtonBase-root`).contains('Save and activate').click();
        cy.wait(2000, { log: false });
        cy.get('.row_draft').should('not.exist');
    });

    it('Reset draft', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
        cy.wait(2000, { log: false });
        cy.get('.common_tebs').find('.MuiButtonBase-root').contains('Automated messages').should('be.visible');
        cy.get('.row_draft').should('not.exist');
        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Send Question To User')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        cy.wait(2000, { log: false });
        cy.get('.border_unActive > .MuiFormControlLabel-root');
        cy.get('.common_radio_container > span:nth-child(1)').click();
        cy.get('input[name="previewLine"]').clear().type('my preview line');
        cy.get('input[name="heading"]').clear().type('Send Question To User');
        cy.get('.editor-input').clear().type(draftTemplateBody, {
            parseSpecialCharSequences: false
        });
        cy.get(`.MuiButtonBase-root`).contains('Save as a draft').click();
        cy.wait(2000, { log: false });
        cy.get('.row_draft').should('exist');
        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Send Question To User')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiChip-label').contains('Draft email').should('be.visible');
        cy.get(`.MuiButtonBase-root`).contains('Reset message').click();
        cy.get('[data-test=dialog-primary-btn]').contains('Reset').click();
        cy.get('.MuiChip-label').should('not.exist');
    });

    it('Content of current template should be sent in email, not draft content', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
        cy.wait(2000, { log: false });
        cy.get('.common_tebs').find('.MuiButtonBase-root').contains('Automated messages').should('be.visible');
        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Send Question To User')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        cy.wait(2000, { log: false });
        cy.get('.border_unActive > .MuiFormControlLabel-root');
        cy.get('.common_radio_container > span:nth-child(1)').click();
        cy.get('input[name="previewLine"]').clear().type('my preview line');
        cy.get('input[name="heading"]').clear().type('Send Question To User');
        cy.get('.editor-input').clear().type(' draft with bad param {{{BAD_PARAM}}}', {
            parseSpecialCharSequences: false
        });
        cy.get(`.MuiButtonBase-root`).contains('Save as a draft').click();
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('FAQs').click({ force: true });
        cy.wait(2000, { log: false });
        getTextAreaBoxByName('question').type('new question');
        cy.get('.MuiButtonBase-root').contains('Send question').click();
        cy.wait(2000, { log: false });
        loginPage.logout();
        loginPage.login(admin, adminpassword);
        goToParentDetailsFromAdminSide(mySchoolName, myClassName, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `Send Question To User`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });
        cy.get('input[name="badParams"]')
            .invoke('val')
            .then((badParams) => {
                const text = badParams.toString();

                expect(text).to.equals('-');
            });
    });
});
