import {
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
    NotificationParameter,
    NotificationType,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import {
    acceptPupilInvitation,
    runCronJob,
    submitPupilFeedback,
    visitMagicLinkUrlOfParent,
    watchVideoAndUnlockActivities
} from '../../shared/pages/utils';

describe('Edit and delete feedback comment as an accountless user', () => {
    it('Edit and delete feedback comment as an accountless user', () => {
        let mySchoolName = `${schoolName} School`;
        let myClassName = `${className} Class`;
        let myTopicName = `${newTopicName} Topic`;
        let schoolEmail = generateSchoolEmail();
        let parentEmailForInvitation = generateParentEmail();
        let firstName = generateFirstName();
        let lastName = generateLastName();
        let activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
        let activity_two = `${animalsNamesActivity} ${generateLastName()}`;
        let activity_third = `${playingGameActivity} ${generateLastName()}`;

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
            false
        );
        runCronJob();
        visitMagicLinkUrlOfParent(
            mySchoolName,
            myClassName,
            `${firstName} ${lastName}`,
            `${parentFirstName} ${parentLastName}`,
            NotificationType.PUPILTOPIC,
            NotificationParameter.MAGICID
        );
        acceptPupilInvitation();
        watchVideoAndUnlockActivities();
        cy.get('.MuiGrid-root > .MuiPaper-root > .MuiCardMedia-root').first().click();
        cy.wait(2000, { log: false });
        cy.get('.MuiRating-root > label > .MuiRating-icon').first().click({ force: true });
        submitPupilFeedback();
        cy.wait(2000, { log: false });
        cy.get('[data-test=delete-activity-feedback-icon]').first().click();

        cy.get('.login-or-signup-modal-inner-content .heading-one').contains('Sign up to access this section');
        cy.get('body').click(0, 0);

        cy.get('.activity-feed-edit-container .material-icons').first().click();
        cy.wait(4000, { log: false });
        cy.get('.login-or-signup-modal-inner-content-button-container .MuiButton-root').contains('Sign up').click();
        cy.wait(2000, { log: false });
        cy.get('.heading-one').should('contain', 'Check your email inbox');
    });
});
