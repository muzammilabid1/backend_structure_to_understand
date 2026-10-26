import {
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
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
import { deleteFeedback, submitPupilFeedback, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Update gold star after pupil activity feedback remove', () => {
    it('Update gold star after pupil activity feedback remove', () => {
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
        const familyComment = generateRandomString(20);

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
        cy.wait(2000, { log: false });
        loginPage.login(parentEmailForInvitation, password);
        cy.get(`.child-card-footer-contanier`).contains(myTopicName).click();
        cy.wait(2000, { log: false });
        watchVideoAndUnlockActivities();
        cy.get(`.child-card-footer-contanier`).contains(activity_one).click();
        submitPupilFeedback(familyComment);
        cy.get('.MuiBreadcrumbs-ol > :nth-child(3) > div > .MuiTypography-root').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Awards').click();
        cy.wait(2000, { log: false });
        cy.get('.cus-gold').should('contain', '1');

        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.get(`.child-card-footer-contanier`).contains(myTopicName).click();
        cy.get(`.child-card-footer-contanier`).contains(activity_one).click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        deleteFeedback(familyComment, `${parentFirstName} ${parentLastName}`, new Date(), false);
        cy.get('.MuiBreadcrumbs-ol > :nth-child(3) > div > .MuiTypography-root').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Awards').click();
        cy.wait(2000, { log: false });
        cy.get('.cus-gold').should('contain', '0');
    });
});
