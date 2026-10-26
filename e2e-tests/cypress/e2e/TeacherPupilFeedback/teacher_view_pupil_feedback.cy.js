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
import { submitPupilFeedback, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Teacher view pupil feedback from topic details page', () => {
    it('Teacher view pupil feedback from topic details page', () => {
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
        let familyComment = `Family Comment ${generateRandomString()}`;
        let childComment = `Child Comment ${generateRandomString()}`;

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
            }
        );
        loginPage.login(parentEmailForInvitation, password);
        cy.get('.primary-text').contains(myTopicName).click();
        watchVideoAndUnlockActivities();
        cy.get('.MuiPaper-root > .child-card-name-section > .child-card-footer-contanier > .footer-contant > .primary-text')
            .contains(activity_one)
            .click();
        submitPupilFeedback(familyComment, childComment);
        cy.get('.MuiAccordionSummary-expandIconWrapper').first().click();
        cy.get('.MuiTypography-root > .material-icons').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('.paragraph').contains(`${firstName} ${lastName}`).click();
        cy.get('[data-test=expand-topic-accordion-icon]').first().click();
        cy.get(
            '.activity-feed-container > .MuiPaper-root > #panel1a-header > .MuiAccordionSummary-expandIconWrapper > [data-testid="ExpandMoreIcon"]'
        )
            .first()
            .click();

        cy.contains('.activity-feed-comment-section > .activity-feed-card .heading-one', 'Family comment').then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).find('.paragraph').contains(familyComment);
                });
        });

        cy.contains('.activity-feed-comment-section > .activity-feed-card .heading-one', 'Child comment').then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).find('.paragraph').contains(childComment);
                });
        });
    });
});
