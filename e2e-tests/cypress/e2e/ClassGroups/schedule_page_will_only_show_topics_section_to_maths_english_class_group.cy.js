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
import { getInputBoxByName } from '../../shared/pages/utils';

describe('Schedule page will only show topics of the class group subject', () => {
    it('Schedule page will only show topics of the class group subject', () => {
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
            false,
            true
        );
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Class groups').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Create a group').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('groupName').type(`${myClassName} Group`);
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').first().click().type('Reading');
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').eq(1).click();
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
        cy.get('.MuiButtonBase-root').contains('Create group').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTableBody-root > :nth-child(1) > :nth-child(1) > .paragraph').contains(`${myClassName} Group`).first().click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined').should('not.exist');
    });
});
