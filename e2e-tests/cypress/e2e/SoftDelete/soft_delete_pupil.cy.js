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
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { goToClassDetailsFromAdminSide, goToParentDetailsFromAdminSide } from '../../shared/pages/utils';

describe('delete pupil and check it no longer appears', () => {
    it('delete pupil and check it no longer appears', () => {
        let mySchoolName = `${schoolName} School`;
        let myClassName = `${className} Class`;
        let myTopicName = `${newTopicName} Topic`;
        let schoolEmail = generateSchoolEmail();
        let parentEmailForInvitation = generateParentEmail();
        const pupil1FirstName = generateFirstName();
        const pupil1LastName = generateLastName();
        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();
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
                firstName: pupil1FirstName,
                lastName: pupil1LastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation,
                pupil2FirstName,
                pupil2LastName
            }
        );

        loginPage.login(admin, adminpassword);
        goToParentDetailsFromAdminSide(
            mySchoolName,
            myClassName,
            `${pupil1FirstName} ${pupil1LastName}`,
            `${parentFirstName} ${parentLastName}`
        );
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(2)').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').should('have.length', 2);
        cy.wait(2000, { log: false });
        goToClassDetailsFromAdminSide(mySchoolName, myClassName);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Students').click();
        cy.wait(2000, { log: false });
        cy.contains('.table_main .tr_row .td', `${pupil2FirstName} ${pupil2LastName}`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("delete")').click();
                });
        });
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Confirm').click();
        cy.wait(2000, { log: false });
        goToParentDetailsFromAdminSide(
            mySchoolName,
            myClassName,
            `${pupil1FirstName} ${pupil1LastName}`,
            `${parentFirstName} ${parentLastName}`
        );
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(2)').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').should('have.length', 1);
    });
});
