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
import { getInputBoxByName, runCronJob, schoolSettingsPage } from '../../shared/pages/utils';

describe('Add, update, delete and assign pupil tag to pupils.', () => {
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
    const pupilTagName = 'PT';
    const updatedPupilTagName = 'UPT';
    const pupilTagNameForWeekByWeekPage = 'WPT';
    const pupilTagNameForPupilDetailsPage = 'PDPT';
    const pupilTagNameForPupilReadingLogPage = 'PRLPT';

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add test data and release topic', () => {
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
            true
        );
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Add, update and delete pupil tag from tags page', () => {
        loginPage.login(schoolEmail, password);

        schoolSettingsPage('school-settings-pupil-tag', 'Pupil tags');

        cy.get('.MuiButton-root').contains('Add a new tag').click();
        getInputBoxByName('name').type(pupilTagName);
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-main-options]').contains(myClassName).should('exist').click();
        cy.get('body').click(0, 0);
        cy.get('[data-test=dialog-primary-btn]').contains('Add').click();
        cy.get('[data-test=pupil-tag-name-cell]').contains(pupilTagName).should('exist');
        cy.get('.material-icons:contains("more_horiz")').click();
        cy.get('[data-test=edit-pupil-tag-button-option]').contains('Edit').click();
        getInputBoxByName('name').clear().type(updatedPupilTagName);
        cy.get('[data-test=dialog-primary-btn]').contains('Edit').click();
        cy.get('[data-test=dialog-primary-btn]').contains('Save changes').click();
        cy.get('[data-test=pupil-tag-name-cell]').contains(updatedPupilTagName).should('exist');
        cy.get('.material-icons:contains("more_horiz")').click();
        cy.get('[data-test=delete-pupil-tag-button-option]').contains('Delete').click();
        cy.get('[data-test=dialog-primary-btn]').contains('Confirm').click();
        cy.contains(updatedPupilTagName).should('not.exist');
    });

    it('Add pupil tag from week by week page.', () => {
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('.MuiButton-root').contains('Topics').click();
        cy.get('.btn_group_active').contains('Topics').should('exist');
        cy.get('.pupil_fullname').contains(`${pupil1FirstName} ${pupil1LastName}`).siblings().first().click();
        getInputBoxByName('tags').click();
        cy.get(`.paragraph`).contains('Create a new tag').click();
        getInputBoxByName('name').type(pupilTagNameForWeekByWeekPage);
        cy.get('[data-test=dialog-primary-btn]').contains('Add tag').click();
        cy.get(`[data-test=${pupilTagNameForWeekByWeekPage}-pupil-tag-name-chip]`).contains(pupilTagNameForWeekByWeekPage).should('exist');
    });

    it('Add pupil tag from pupil details page', () => {
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('.MuiButton-root').contains('Topics').click();
        cy.get('.pupil_fullname').contains(`${pupil2FirstName} ${pupil2LastName}`).click();
        cy.get('[data-test=pupil-details-fullname]').contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist');
        cy.get('[data-test=add-pupil-tag-button]').click();
        getInputBoxByName('tags').click();
        cy.get(`.paragraph`).contains('Create a new tag').click();
        getInputBoxByName('name').type(pupilTagNameForPupilDetailsPage);
        cy.get('[data-test=dialog-primary-btn]').contains('Add tag').click();
        cy.get(`[data-test=${pupilTagNameForPupilDetailsPage}-pupil-tag-name-chip]`)
            .contains(pupilTagNameForPupilDetailsPage)
            .should('exist');
    });

    it('Add pupil tag from pupil reading log page', () => {
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('.pupil_fullname').contains(`${pupil2FirstName} ${pupil2LastName}`).click();
        cy.get('[data-test=reading-log-menu-on-pupil-details-page]').contains('Reading log').click();
        cy.get('[data-test=pupil-reading-log-heading]').contains(`${pupil2FirstName}'s reading log`).should('exist');
        cy.get('[data-test=edit-pupil-tag-button]').click();
        getInputBoxByName('tags').click();
        cy.get(`.paragraph`).contains('Create a new tag').click();
        getInputBoxByName('name').type(pupilTagNameForPupilReadingLogPage);
        cy.get('[data-test=dialog-primary-btn]').contains('Add tag').click();
        cy.get(`[data-test=${pupilTagNameForPupilReadingLogPage}-pupil-tag-name-chip]`)
            .contains(pupilTagNameForPupilReadingLogPage)
            .should('exist');
    });
});
