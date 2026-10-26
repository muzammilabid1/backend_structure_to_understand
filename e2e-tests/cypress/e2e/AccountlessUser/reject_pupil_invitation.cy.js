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
import { runCronJob, visitMagicLinkUrlOfParent } from '../../shared/pages/utils';

describe('Reject pupil invitation', () => {
    it('Reject pupil invitation', () => {
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
        cy.wait(2000, { log: false });
        cy.get('.interstitials_notCorrect > u').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Reject this invitation').click();
        cy.wait(2000, { log: false });
        cy.get('.heading-one').should('contain', 'Thanks for letting us know!');
    });
});
