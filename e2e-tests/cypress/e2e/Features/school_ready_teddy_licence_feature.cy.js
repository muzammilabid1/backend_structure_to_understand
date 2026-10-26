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
import { getInputBoxByName, getTextAreaBoxByName, runCronJob } from '../../shared/pages/utils';

describe('School ready teddy feature licence', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const myTopicName = `${newTopicName} Topic`;
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;
    const schoolTagName = `${mySchoolName} Tag 1`;
    const schoolTagName2 = `${mySchoolName} Tag 2`;

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add test data', () => {
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
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Add school tags and attach school to it', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Tags').click();
        cy.get('.MuiButtonBase-root').contains('Schools').click();
        cy.get('.MuiButtonBase-root').contains('Add a Tag').click();
        cy.get('#checkboxes-tags-demo').click().type(mySchoolName);
        cy.get('#checkboxes-tags-demo-listbox li').contains(mySchoolName).click();
        getInputBoxByName('name').clear().type(schoolTagName);
        cy.get(`.MuiButtonBase-root`).contains('Save').click();
        cy.get('.table .tbody .tr_row > .td').contains(schoolTagName).should('exist');

        cy.get('.MuiButtonBase-root').contains('Schools').click();
        cy.get('.MuiButtonBase-root').contains('Add a Tag').click();
        getInputBoxByName('name').clear().type(schoolTagName2);
        cy.get(`.MuiButtonBase-root`).contains('Save').click();
        cy.get('.table .tbody .tr_row > .td').contains(schoolTagName2).should('exist');
    });

    it('Enable ready teddy licence feature for all schools and verify the feature', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Features').click();
        cy.get('.table .tbody .tr_row > .td')
            .contains('Ready Teddy licences can be purchased by school leaders')
            .parent('.tr_row')
            .within(() => {
                cy.get('.material-icons:contains("create")').click();
            });

        cy.get('[data-test="update-feature-release-to-select"]').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('All schools').click();
        cy.get('[data-test="dialog-primary-btn"]').contains('Update').click();
        cy.get('.MuiAlert-message').contains('Updated feature successfully!');

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolEmail, password);
        cy.get('u').contains('Purchase additional class licences').click();
        cy.get('input[name="readyTeddyCount"]').should('be.visible');
    });

    it('Enable ready teddy licence feature for limited schools and not include this school and verify the feature', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Features').click();
        cy.get('.table .tbody .tr_row > .td')
            .contains('Ready Teddy licences can be purchased by school leaders')
            .parent('.tr_row')
            .within(() => {
                cy.get('.material-icons:contains("create")').click();
            });
        cy.get('[data-test="update-feature-release-to-select"]').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Limited release').click();
        cy.get('#checkboxes-tags-demo').should('be.visible').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(schoolTagName2).click();
        cy.get('[data-test="dialog-primary-btn"]').contains('Update').click();
        cy.get('.MuiAlert-message').contains('Updated feature successfully!');

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolEmail, password);
        cy.get('u').contains('Purchase additional class licences').click();
        cy.get('input[name="readyTeddyCount"]').should('not.exist');
    });

    it('Enable ready teddy licence feature for limited schools and include this school and verify the feature', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Features').click();
        cy.get('.table .tbody .tr_row > .td')
            .contains('Ready Teddy licences can be purchased by school leaders')
            .parent('.tr_row')
            .within(() => {
                cy.get('.material-icons:contains("create")').click();
            });
        cy.get('[data-test="update-feature-release-to-select"]').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Limited release').click();
        cy.get('#checkboxes-tags-demo').should('be.visible').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(schoolTagName).click();
        cy.get('[data-test="dialog-primary-btn"]').contains('Update').click();
        cy.get('.MuiAlert-message').contains('Updated feature successfully!');

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolEmail, password);
        cy.get('u').contains('Purchase additional class licences').click();
        cy.get('input[name="readyTeddyCount"]').should('be.visible');
    });

    it('Enable ready teddy licence feature for no schools and verify the feature', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Features').click();
        cy.get('.table .tbody .tr_row > .td')
            .contains('Ready Teddy licences can be purchased by school leaders')
            .parent('.tr_row')
            .within(() => {
                cy.get('.material-icons:contains("create")').click();
            });
        cy.get('[data-test="update-feature-release-to-select"]').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('None').click();
        getTextAreaBoxByName('description').type('This is a test description');
        cy.get('[data-test="dialog-primary-btn"]').contains('Update').click();
        cy.get('.MuiAlert-message').contains('Updated feature successfully!');

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolEmail, password);
        cy.get('u').contains('Purchase additional class licences').click();
        cy.get('input[name="readyTeddyCount"]').should('not.exist');
    });
});
