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

describe('Access history as accountless user with history', () => {
    it('Access history as accountless user with history', () => {
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
        submitPupilFeedback();
        cy.wait(2000, { log: false });
        cy.get('.MuiBreadcrumbs-ol > :nth-child(1) > div > .MuiTypography-root').click();
        cy.wait(5000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(3)').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiButton-root').contains('Sign up').click();
        cy.wait(2000, { log: false });
        cy.get('.heading-one').should('contain', 'Check your email inbox');
    });
});
