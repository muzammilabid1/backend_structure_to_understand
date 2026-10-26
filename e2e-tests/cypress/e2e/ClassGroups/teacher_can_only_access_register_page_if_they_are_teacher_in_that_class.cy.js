import {
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateSchoolEmail,
    generateTeacherEmail,
    leaderFirstName,
    leaderlastName,
    newTopicName,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName,
    teacherFirstname,
    teacherLastname
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName } from '../../shared/pages/utils';

describe('Teacher can only access register page of a class if they are a teacher in that class', () => {
    it('Teacher can only access register page of a class if they are a teacher in that class', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const schoolEmail = generateSchoolEmail();
        const teacherEmail = generateTeacherEmail();
        const parentEmailForInvitation = generateParentEmail();
        const pupil1FirstName = generateFirstName();
        const pupil1LastName = generateLastName();
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
                firstName: pupil1FirstName,
                lastName: pupil1LastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
            },
            true,
            true,
            5,
            {
                firstname: teacherFirstname,
                lastname: teacherLastname,
                email: teacherEmail,
                nameForChildren: `Mr ${teacherFirstname}`,
                sendInvite: true
            }
        );
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Class groups').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Create a group').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('groupName').type(`${myClassName} Group`);
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').first().click();
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').eq(1).click();
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').last().click();
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('.MuiButtonBase-root').contains('Create group').click();
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
        cy.wait(2000, { log: false });
        loginPage.login(teacherEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get('.MuiCardContent-root > .heading-one').should('contain', 'Your groups in this class');
    });
});
