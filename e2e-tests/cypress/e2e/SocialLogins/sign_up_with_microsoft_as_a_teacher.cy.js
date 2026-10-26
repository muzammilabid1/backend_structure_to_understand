import {
    admin,
    adminpassword,
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
    schoolName,
    socialLoginMicrosoft
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { teacher } from '../../shared/pages/teacher';
import { allowSocialLoginForSchool, getCheckBox, signUpSchoolTeacher } from '../../shared/pages/utils';

describe('Social Login', () => {
    it('Signup with microsoft account as a invited user', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const firstName = generateFirstName();
        const lastName = generateLastName();
        const teacherFirstName = generateFirstName();
        const teacherLastName = generateLastName();
        const teacherEmail = `teacher${generateSchoolEmail()}`;
        const myTopicName = `${newTopicName} Topic`;
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
        allowSocialLoginForSchool(mySchoolName, socialLoginMicrosoft);
        loginPage.login(schoolEmail, password);

        teacher.addTeacher(teacherFirstName, teacherLastName, teacherFirstName, teacherEmail);
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
        cy.get('.MuiTabs-flexContainer > :nth-child(2)').first().click();
        signUpSchoolTeacher(schoolName, `${teacherFirstName} ${teacherLastName}`, password, true, false);
        cy.wait(5000, { log: false });
        cy.get('.msLoginBtn').click();
        cy.wait(2000, { log: false });
        getCheckBox().click();
        cy.get('.MuiButton-root').contains('Confirm').click();
        cy.wait(5000, { log: false });
        cy.get('[data-test="teacher-and-admin-popover-list-expand-icon"]').click();
        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Account settings').click({ force: true });
        cy.get('.MuiButton-root').contains('Disconnect').should('exist');
    });
});
