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
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName } from '../../shared/pages/utils';

describe('Registeration should fail the email is already exist', () => {
    it('Registeration should fail the email is already exist', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const myTopicName = `${newTopicName} Topic`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const firstName = generateFirstName();
        const lastName = generateLastName();
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
        cy.wait(2000, { log: false });
        pupilByTeacher.addChildByTeacher(pupil2FirstName, pupil2LastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.get(`.MuiTableCell-root`).contains(`${pupil2FirstName} ${pupil2LastName}`).click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Details').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a parent').click();
        getInputBoxByName('firstname').last().type(parentFirstName);
        getInputBoxByName('lastname').last().type(parentLastName);
        getInputBoxByName('email').type(parentEmailForInvitation);
        cy.get('.MuiButtonBase-root').contains('Add parent').click();
        cy.get('.MuiDialogContent-root > .paragraph').should(
            'contain',
            `${parentEmailForInvitation} is already listed as one of ${pupil2FirstName}'s parents. Go to the Details tab to see more.`
        );
    });
});
