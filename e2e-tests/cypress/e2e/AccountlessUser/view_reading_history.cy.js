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
    NotificationParameter,
    NotificationType,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { acceptPupilInvitation, runCronJob, submitParentReadingFeedback, visitMagicLinkUrlOfParent } from '../../shared/pages/utils';

describe('Submit and view reading feedback history as a accountless user', () => {
    it('Submit and view reading feedback history as a accountless user', () => {
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
            false,
            true
        );
        runCronJob('sendReleasedPupilTopicNotifications');
        visitMagicLinkUrlOfParent(
            mySchoolName,
            myClassName,
            `${firstName} ${lastName}`,
            `${parentFirstName} ${parentLastName}`,
            NotificationType.READING,
            NotificationParameter.MAGICID
        );
        acceptPupilInvitation();
        cy.wait(2000, { log: false });
        cy.get('.logo-with-heading').click();
        cy.wait(2000, { log: false });
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Sign up').click();
        cy.wait(2000, { log: false });
        cy.get('.heading-one').should('contain', 'Check your email inbox');
    });
});
