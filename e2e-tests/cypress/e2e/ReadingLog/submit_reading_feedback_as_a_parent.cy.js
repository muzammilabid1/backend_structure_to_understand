import {
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateRandomNumbers,
    generateRandomString,
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
import {
    getFutureDateForReadingTopic,
    goToParentDetailsFromAdminSide,
    gotoTeacherDetailsPageFromAdminSide,
    sendReminderEmailFromAdminSide,
    submitParentReadingFeedback
} from '../../shared/pages/utils';

describe('Submit reading feedback as a parent', () => {
    it('Submit reading feedback as a parent', () => {
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
        const feedback = {
            bookName: `Harry Potter ${generateRandomNumbers()}`,
            comment: generateRandomString(20),
            updatedComment: generateRandomString(20)
        };
        const dateAfter2Days = getFutureDateForReadingTopic(2);
        const dateAfter5Days = getFutureDateForReadingTopic(5);
        const dateAfter7Days = getFutureDateForReadingTopic(7);

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
        sendReminderEmailFromAdminSide(dateAfter2Days, 'readingTopicReminderAfter2Days', true);
        goToParentDetailsFromAdminSide(mySchoolName, myClassName, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `Send Mail For Reading Topic Reminder After 2 Days`).then((el) => {
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
                    SCHOOL: mySchoolName,
                    CLASS: myClassName,
                    FIRSTNAME: parentFirstName,
                    LASTNAME: parentLastName,
                    CHILDFIRSTNAME: firstName,
                    CHILDLASTNAME: lastName
                });
            });
        cy.get('body').click(0, 0);
        sendReminderEmailFromAdminSide(dateAfter5Days, 'readingTopicReminderAfter5Days', false);
        goToParentDetailsFromAdminSide(mySchoolName, myClassName, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `Send Mail For Reading Topic Reminder After 5 Days`).then((el) => {
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
                    SCHOOL: mySchoolName,
                    CLASS: myClassName,
                    FIRSTNAME: parentFirstName,
                    LASTNAME: parentLastName,
                    CHILDFIRSTNAME: firstName,
                    CHILDLASTNAME: lastName
                });
            });
        cy.get('body').click(0, 0);
        sendReminderEmailFromAdminSide(dateAfter7Days, 'sendTeacherReadingTopicEnd', false);
        gotoTeacherDetailsPageFromAdminSide(mySchoolName, `${leaderFirstName} ${leaderlastName}`);
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `Send Teacher Reading Topic Ended Notification`).then((el) => {
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
                    SCHOOL: mySchoolName,
                    CLASS: myClassName,
                    FIRSTNAME: leaderFirstName,
                    LASTNAME: leaderlastName
                });
            });
        cy.get('body').click(0, 0);
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        cy.get('.activity-feed-comment-section > .activity-feed-card .paragraph').first().should('contain', feedback.comment);
    });
});
