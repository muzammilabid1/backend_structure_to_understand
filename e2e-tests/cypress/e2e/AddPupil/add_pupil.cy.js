import {
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateSchoolEmail,
    generateUserMobile,
    leaderFirstName,
    leaderlastName,
    newTopicName,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName } from '../../shared/pages/utils';

describe('Add pupil', () => {
    it('Add pupil', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const myTopicName = `${newTopicName} Topic`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const firstName = generateFirstName();
        const lastName = generateLastName();
        const parent2FirstName = generateFirstName();
        const parent2LastName = generateLastName();
        const parent2EmailForInvitation = generateParentEmail();
        const parent2PhoneNumberForInvitation = generateUserMobile();
        const updatedParent2FirstName = `Updated ${parent2FirstName}`;
        const updatedParent2LastName = `Updated ${parent2LastName}`;
        const updatedParent2EmailForInvitation = `updated${parent2EmailForInvitation}`;
        const updatedParent2PhoneNumberForInvitation = generateUserMobile();
        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();
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
            true
        );
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        pupilByTeacher.addChildByTeacher(
            pupil2FirstName,
            pupil2LastName,
            parentFirstName,
            parentLastName,
            parentEmailForInvitation,
            null,
            false
        );
        cy.get('[data-test="add-more-parents-for-pupil-button"]').click();
        getInputBoxByName('parentFirstname').type(parent2FirstName);
        getInputBoxByName('parentLastname').type(parent2LastName);
        getInputBoxByName('email').type(parent2EmailForInvitation);
        getInputBoxByName('phoneNumber').type(parent2PhoneNumberForInvitation);
        cy.get('[data-test="add-parent-for-a-pupil-button"]').contains('Add parent').click();
        cy.get('.MuiAlert-message').contains('Parent details have been added successfully.');
        cy.get('[data-test="parent-firstname"]').last().contains(parent2FirstName).should('exist');
        cy.get('[data-test="parent-lastname"]').last().contains(parent2LastName).should('exist');
        cy.get('[data-test="parent-email"]').last().contains(parent2EmailForInvitation).should('exist');
        cy.get('[data-test="parent-phoneNumber"]').last().contains(parent2PhoneNumberForInvitation).should('exist');
        cy.get('[data-test="edit-parent-button"]').last().click();
        getInputBoxByName('parentFirstname').clear().type(updatedParent2FirstName);
        getInputBoxByName('parentLastname').clear().type(updatedParent2LastName);
        getInputBoxByName('email').clear().type(updatedParent2EmailForInvitation);
        getInputBoxByName('phoneNumber').clear().type(updatedParent2PhoneNumberForInvitation);
        cy.get('[data-test="update-parent-for-a-pupil-button"]').contains('Update parent').click();
        cy.get('.MuiAlert-message').contains('Parent details have been updated successfully.');
        cy.get('[data-test="parent-firstname"]').last().contains(updatedParent2FirstName).should('exist');
        cy.get('[data-test="parent-lastname"]').last().contains(updatedParent2LastName).should('exist');
        cy.get('[data-test="parent-email"]').last().contains(updatedParent2EmailForInvitation).should('exist');
        cy.get('[data-test="parent-phoneNumber"]').last().contains(updatedParent2PhoneNumberForInvitation).should('exist');
        cy.get('[data-test="remove-parent-button"]').last().click();
        cy.get('[data-test="dialog-content"]').should('contain', 'Are you sure you want to remove this parent from this pupil?');
        cy.get('[data-test="dialog-primary-btn"]').contains('Remove').click();
        cy.get('[data-test="parent-firstname"]').eq(1).should('not.exist');
        cy.get('[data-test="parent-lastname"]').eq(1).should('not.exist');
        cy.get('[data-test="parent-email"]').eq(1).should('not.exist');
        cy.get('[data-test="parent-phoneNumber"]').eq(1).should('not.exist');
        cy.get('.MuiAlert-message').contains('Parent has been removed successfully.');
        cy.get('[data-test="add-pupil-button"]').contains('Add pupil').click();
        cy.get(`.MuiTableCell-root`).contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist');
    });
});
