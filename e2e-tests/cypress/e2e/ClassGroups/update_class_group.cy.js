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
import { addClassGroup, getInputBoxByName } from '../../shared/pages/utils';

describe('Update class group', () => {
    it('Update class group', () => {
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
        addClassGroup(myClassName, false);
        cy.get('.MuiTableBody-root > :nth-child(1) > :nth-child(1) > .paragraph').contains(`${myClassName} Group`).first().click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Group settings').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('groupName').clear().type(`${myClassName} Group Updated`);
        cy.get('.MuiButtonBase-root').contains('Update').click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activity grid').click();
        cy.wait(2000, { log: false });
        cy.get('.class-register-header-container > .heading-one').should('contain.text', `${myClassName} Group Updated`);
    });
});
