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
import { acceptPupilInvitation, runCronJob, visitMagicLinkUrlOfParent, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Go to homepage as a accountless user', () => {
    it('Go to homepage as a accountless user', () => {
        let mySchoolName = `${schoolName} School`;
        let myClassName = `${className} Class`;
        let myTopicName = `${newTopicName} Topic`;
        let schoolEmail = generateSchoolEmail();
        let parentEmailForInvitation = generateParentEmail();
        const pupil1FirstName = generateFirstName();
        const pupil1LastName = generateLastName();
        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();
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
                firstName: pupil1FirstName,
                lastName: pupil1LastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation,
                pupil2FirstName,
                pupil2LastName
            },
            false
        );
        runCronJob();
        visitMagicLinkUrlOfParent(
            mySchoolName,
            myClassName,
            `${pupil1FirstName} ${pupil1LastName}`,
            `${parentFirstName} ${parentLastName}`,
            NotificationType.PUPILTOPIC,
            NotificationParameter.MAGICID
        );
        acceptPupilInvitation();
        watchVideoAndUnlockActivities();
        cy.get('.MuiBreadcrumbs-ol > :nth-child(1) > div > .MuiTypography-root').click();
        cy.wait(2000, { log: false });
        cy.get('.edit-icon-container > .material-icons').first().click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Sign up').click();
        cy.wait(2000, { log: false });
        cy.get('.heading-one').should('contain', 'Check your email inbox');
    });
});
