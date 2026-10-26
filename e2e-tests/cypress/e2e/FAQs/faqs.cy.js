import {
    ACCESS_TOKEN_COOKIE,
    admin,
    adminpassword,
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateRandomString,
    generateSchoolEmail,
    graphqlEndpoint,
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
import { getTextAreaBoxByName, goToParentDetailsFromAdminSide } from '../../shared/pages/utils';

describe('FAQ', () => {
    it('Add FAQ and check that email with right parameter was sent', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const firstName = generateFirstName();
        const lastName = generateLastName();
        const myTopicName = `${newTopicName} Topic`;
        const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
        const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
        const activity_third = `${playingGameActivity} ${generateLastName()}`;
        const myQuestion = `Question ${generateRandomString(20)}`;

        cy.visit(`${baseUrl}`);
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
        loginPage.login(admin, adminpassword);

        cy.get(`.sidebar-options-list`).contains('Email templates').click();
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

        cy.wait(1000);

        cy.get('.border_unActive > .MuiFormControlLabel-root');
        cy.get('.common_radio_container > span:nth-child(1)').click();
        cy.get('input[name="previewLine"]').clear().type('my preview line');
        cy.get('input[name="heading"]').clear().type('Send Question To User');
        cy.get('.editor-input').clear().type(` USERQUESTION: {{{USERQUESTION}}}`, {
            parseSpecialCharSequences: false
        });
        cy.get(`.MuiButtonBase-root`).contains('Save and activate').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('FAQs').click({ force: true });
        cy.wait(2000, { log: false });
        getTextAreaBoxByName('question').type(myQuestion);
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
        cy.get('textarea[name="params"]')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    FIRSTNAME: parentFirstName,
                    LASTNAME: parentLastName,
                    USERSTATUS: 'ACTIVE',
                    USERQUESTION: myQuestion
                });
            });
        cy.get('input[name="id"]')
            .invoke('val')
            .then((idValue) => {
                const id = idValue.toString();

                cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
                    cy.request({
                        method: 'POST',
                        url: graphqlEndpoint,
                        headers: {
                            Authorization: `Bearer ${cookie?.value}`
                        },
                        body: {
                            operationName: 'getNotification',
                            query: `
                                query getNotification($id: String!) {
                                    getNotification(id: $id) {
                                        apiId
                                    }
                                }
                                `,
                            variables: {
                                id
                            }
                        }
                    }).then((response) => {
                        if (response?.body?.errors && response?.body?.errors?.length > 0) {
                            // Extract the message from the first error
                            const errorMessage = response?.body?.errors?.[0]?.message;

                            throw new Error(`GraphQL query failed: ${errorMessage}`);
                        }

                        expect(response.body).to.have.property('data');
                        expect(response.body.data.getNotification).to.have.property('apiId', 'mockId');
                    });
                });
            });
        cy.get('body').click(0, 0);
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
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

        cy.wait(1000);

        cy.get('.border_unActive > .MuiFormControlLabel-root');
        cy.get('.common_radio_container > span:nth-child(1)').click();
        cy.get('input[name="previewLine"]').clear().type('my preview line');
        cy.get('input[name="heading"]').clear().type('Send Question To User');
        cy.get('.editor-input').clear().type(` BAD_PARAM: {{{BAD_PARAM}}}`, {
            parseSpecialCharSequences: false
        });
        cy.get(`.MuiButtonBase-root`).contains('Save and activate').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('FAQs').click({ force: true });
        cy.wait(2000, { log: false });
        getTextAreaBoxByName('question').type(myQuestion);
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

                expect(text).to.equals('BAD_PARAM');
            });
    });
});
