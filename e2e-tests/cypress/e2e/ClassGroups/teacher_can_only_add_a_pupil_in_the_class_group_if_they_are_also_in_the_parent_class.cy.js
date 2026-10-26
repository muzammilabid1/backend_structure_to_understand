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
import { addClassGroup } from '../../shared/pages/utils';

describe('Teacher can only add a pupil in the class group if they are also in the parent class', () => {
    it('Teacher can only add a pupil in the class group if they are also in the parent class', () => {
        const mySchoolName = `${schoolName} School`;
        const myClassName = `${className} Class`;
        const schoolEmail = generateSchoolEmail();
        const parentEmailForInvitation = generateParentEmail();
        const pupil1FirstName = generateFirstName();
        const pupil1LastName = generateLastName();
        const pupil2FirstName = generateFirstName();
        const pupil2LastName = generateLastName();
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
                parentEmailForInvitation,
                pupil2FirstName,
                pupil2LastName
            },
            true,
            true,
            5,
            null,
            true
        );
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        addClassGroup(myClassName, false);
        cy.get('.MuiTableBody-root > :nth-child(1) > :nth-child(1) > .paragraph').contains(`${myClassName} Group`).first().click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Pupils').click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(2) > .MuiListItemText-root > .MuiTypography-root > .paragraph').contains('Add pupils').click();
        cy.wait(2000, { log: false });
        cy.get('#combo-box-demo').click().type(`${pupil2FirstName}`);
        cy.wait(2000, { log: false });

        cy.get('body').then((body) => {
            if (body.find('#combo-box-demo-option-0').length > 0) {
                cy.get('#combo-box-demo-option-0').contains(pupil2FirstName).click();
            } else {
                cy.get('#combo-box-demo').clear().type(`${pupil1FirstName}`);
                cy.wait(2000, { log: false });
                cy.get('#combo-box-demo-option-0').contains(pupil1FirstName).click();
            }
        });
        cy.get('.false > .MuiButtonBase-root').contains('Add pupils').click({ force: true });
        cy.wait(2000, { log: false });
        cy.reload();
        cy.wait(2000, { log: false });
        cy.get('.pupil-name-status-container > .paragraph').contains(`${pupil2FirstName}`).should('exist');
    });
});
