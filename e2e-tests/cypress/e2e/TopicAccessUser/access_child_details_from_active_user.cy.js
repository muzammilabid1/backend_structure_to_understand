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
import { loginPage } from '../../shared/pages/login';
import { runCronJob, switchToPupil, visitMagicLinkUrlOfParent, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Click child details as a topic access user then login to access child details', () => {
    it('Click child details as a topic access user then login to access child details', () => {
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
            true
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
        watchVideoAndUnlockActivities();
        cy.get('.MuiTypography-root').contains(`${firstName} ${lastName}`).click();
        cy.wait(5000, { log: false });
        switchToPupil(`${firstName}`, 'details');
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Log in').click();
        cy.wait(2000, { log: false });
        loginPage.login(parentEmailForInvitation, password);
    });
});
