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
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { gotoPupilReadingLogFromClassPage } from '../../shared/pages/utils';

describe("Check if class reading page takes teacher to the pupil's current reading week", () => {
    it("Check if class reading page takes teacher to the pupil's current reading week", () => {
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
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiCardMedia-root').first().click();
        cy.wait(2000, { log: false });
        cy.get('[data-test="reading-log-slider-day"]')
            .first()
            .then(($span) => {
                const currentWeekDate = $span.text();

                cy.get('.MuiTypography-root > .material-icons').click();
                cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
                cy.wait(2000, { log: false });
                loginPage.login(schoolEmail, password);
                cy.wait(3000, { log: false });
                cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
                cy.wait(3000, { log: false });
                gotoPupilReadingLogFromClassPage(`${firstName} ${lastName}`);
                cy.get('[data-test="reading-log-slider-day"]').first().should('contain', currentWeekDate);
            });
    });
});
