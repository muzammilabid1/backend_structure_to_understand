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
    generateUserMobile,
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
import { getInputBoxByName, notificationStatusShouldBe, updateEmaiStatus, updateMobileNumberStatus } from '../../shared/pages/utils';

describe('First register the user and than login with email address', () => {
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
    const mobileNumber = `${generateUserMobile()}`;

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('First register the user and than login with email address', () => {
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
            true
        );
        loginPage.login(parentEmailForInvitation, password);
    });

    it('Webhook testing for mailgun', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
        cy.wait(2000, { log: false });
        cy.get('.common_tebs').find('.MuiButtonBase-root').contains('Automated messages').should('be.visible');

        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Parent Invitation Email')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });

        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Test mail').click();
        cy.get('.heading-two').contains('Send a test message').should('exist');
        getInputBoxByName('email').clear().type(parentEmailForInvitation);
        cy.get(`.MuiButtonBase-root`).contains('Send').click();

        cy.wait(2000);

        cy.get('.email_template_Table .tbody .tr_row > .td').contains('Parent Invitation Email').click();

        notificationStatusShouldBe(parentEmailForInvitation, 'Sent');

        updateEmaiStatus('accepted', parentEmailForInvitation);

        cy.wait(2000);
        cy.reload();

        notificationStatusShouldBe(parentEmailForInvitation, 'Queued');

        updateEmaiStatus('delivered', parentEmailForInvitation);

        cy.wait(2000);
        cy.reload();

        notificationStatusShouldBe(parentEmailForInvitation, 'Delivered');

        updateEmaiStatus('opened', parentEmailForInvitation);

        cy.wait(2000);
        cy.reload();

        notificationStatusShouldBe(parentEmailForInvitation, 'Opened');

        updateEmaiStatus('clicked', parentEmailForInvitation);

        cy.wait(2000);
        cy.reload();

        notificationStatusShouldBe(parentEmailForInvitation, 'Clicked');
    });
    it('Webhook testing for twilio', () => {
        loginPage.login(parentEmailForInvitation, password);
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Account settings').click({ force: true });
        getInputBoxByName('phoneNumber').clear().type(mobileNumber);
        cy.wait(2000, { log: false });
        cy.get(`.MuiButtonBase-root`).contains('Update details').click();

        loginPage.logout();

        loginPage.login(admin, adminpassword);

        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Email templates').click();
        cy.wait(2000, { log: false });
        cy.get('.common_tebs').find('.MuiButtonBase-root').contains('Automated messages').should('be.visible');

        cy.get('.email_template_Table .tbody .tr_row > .td')
            .contains('Parent Invitation Email')
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });

        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Test mail').click();
        cy.get('.heading-two').contains('Send a test message').should('exist');
        getInputBoxByName('email').clear().type(mobileNumber);
        cy.get(`.MuiButtonBase-root`).contains('Send').click();

        cy.wait(2000);

        cy.get('.email_template_Table .tbody .tr_row > .td').contains('Parent Invitation Email').click();

        notificationStatusShouldBe(mobileNumber, 'Sent');

        updateMobileNumberStatus('queued', mobileNumber);

        cy.wait(2000);
        cy.reload();

        notificationStatusShouldBe(mobileNumber, 'Queued');

        updateMobileNumberStatus('delivered', mobileNumber);

        cy.wait(2000);
        cy.reload();

        notificationStatusShouldBe(mobileNumber, 'Delivered');
    });
});
