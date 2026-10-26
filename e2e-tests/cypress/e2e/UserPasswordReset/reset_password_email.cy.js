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
import { goToParentDetailsFromAdminSide, gotoTeacherDetailsPageFromAdminSide } from '../../shared/pages/utils';

describe('Reset user password', () => {
    it('Reset user password email for parent and teacher', () => {
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
        loginPage.preLogin(parentEmailForInvitation);
        cy.get('a').contains('Forgotten password?').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiOutlinedInput-input').type(parentEmailForInvitation);
        cy.get('.MuiButton-root').contains('Send me a link').click();
        cy.wait(2000, { log: false });
        cy.visit(`${baseUrl}`);
        loginPage.preLogin(schoolEmail);
        cy.get('a').contains('Forgotten password?').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiOutlinedInput-input').type(schoolEmail);
        cy.get('.MuiButton-root').contains('Send me a link').click();
        cy.wait(2000, { log: false });
        cy.visit(`${baseUrl}`);
        loginPage.login(admin, adminpassword);
        goToParentDetailsFromAdminSide(mySchoolName, className, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `Send Reset Password Email`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });
        cy.get('textarea[name="params"]')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    FIRSTNAME: parentFirstName,
                    LASTNAME: parentLastName
                });
            });
        cy.get('body').click(0, 0);
        gotoTeacherDetailsPageFromAdminSide(mySchoolName, `${leaderFirstName} ${leaderlastName}`);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `Send Reset Password Email`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });
        cy.get('textarea[name="params"]')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    FIRSTNAME: leaderFirstName,
                    LASTNAME: leaderlastName
                });
            });
    });
});
