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
import { gotoPupilReadingLogFromClassPage, submitTeacherReadingFeedback } from '../../shared/pages/utils';

describe('Submit reading feedback as a teacher by not including feedback towards target and get no silver star', () => {
    it('Submit reading feedback as a teacher by not including feedback towards target and get no silver star', () => {
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
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        gotoPupilReadingLogFromClassPage(`${firstName} ${lastName}`);
        submitTeacherReadingFeedback(feedback.bookName, feedback.comment);
        cy.get('.activity-feed-comment-section > .activity-feed-card .paragraph').should('contain', feedback.comment);
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Awards').click();
        cy.wait(2000, { log: false });
        cy.get('.cus-silver').should('contain', '0');
    });
});
