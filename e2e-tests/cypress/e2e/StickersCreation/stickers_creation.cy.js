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
    generateRandomNumbers,
    generateRandomString,
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
import {
    createSticker,
    getInputBoxByName,
    runCronJob,
    schoolSettingsPage,
    submitParentReadingFeedback,
    waitForLoading
} from '../../shared/pages/utils';

describe('Add tick comment and sticker to pupil feedback done at home', () => {
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
    const feedback = {
        bookName: `Harry Potter ${generateRandomNumbers()}`,
        comment: generateRandomString(20),
        reply: generateRandomString(20)
    };
    const adminStickerTitle = `${schoolName} Good Work`;
    const copiedStickerTitle = `${schoolName} Nice Work`;
    const schoolStickerTitle = `${schoolName} Great Work`;

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
                firstName,
                lastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
            },
            true,
            true
        );
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Create a global sticker as a admin', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Stickers').click();
        createSticker(adminStickerTitle);
    });

    it('Add pupil feedback from home', () => {
        loginPage.login(parentEmailForInvitation, password);
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        cy.get('.activity-feed-comment-section > .activity-feed-card .paragraph').first().should('contain', feedback.comment);
    });

    it('School enables stickers feature and teacher send a sticker and verify its existence', () => {
        loginPage.login(schoolEmail, password);

        schoolSettingsPage('school-settings-configuration', 'Configuration');

        getInputBoxByName('isParentFeedbackStickerFeatureEnabled').check();
        cy.get('.MuiButtonBase-root').contains('Save engagement settings').click();
        cy.get('.MuiAlert-message').contains('Settings updated').should('exist');

        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        cy.get('.MuiButtonBase-root').contains('Got it').click();
        cy.get('.stickers-icon').click();
        cy.get(`img[alt="Sticker: ${adminStickerTitle}"]`).click();
        cy.get(`img[alt="Sticker: ${adminStickerTitle}"]`).should('exist');
    });

    it('School create a copy of admin sticker and use it for reply', () => {
        loginPage.login(schoolEmail, password);
        schoolSettingsPage('school-settings-stickers', 'Stickers');
        cy.get(`img[alt="Sticker: ${adminStickerTitle}"]`).parent().siblings().find('.material-icons:contains("more_vert")').click();
        cy.get('[data-test="create-a-copy-sticker-option"]').click();
        cy.get('.MuiAlert-message').contains('Duplicate successful!').should('exist');

        cy.get(`img[alt="Sticker: ${adminStickerTitle}"]`)
            .parent()
            .siblings()
            .find('.material-icons:contains("more_vert")')
            .first()
            .click();
        cy.get('[data-test="edit-sticker-option"]').click();
        waitForLoading();
        getInputBoxByName('title').clear().type(copiedStickerTitle);
        cy.get('.MuiButtonBase-root').contains('Save').click();
        cy.get('.MuiAlert-message').contains('Updated successfully').should('exist');

        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        waitForLoading();
        cy.get('.stickers-icon').click();
        cy.get(`img[alt="Sticker: ${copiedStickerTitle}"]`).click();
        cy.get(`img[alt="Sticker: ${copiedStickerTitle}"]`).should('exist');
    });

    it('School create a school sticker and use it for reply', () => {
        loginPage.login(schoolEmail, password);
        schoolSettingsPage('school-settings-stickers', 'Stickers');
        createSticker(schoolStickerTitle);
        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        waitForLoading();
        cy.get('.stickers-icon').click();
        cy.get(`img[alt="Sticker: ${schoolStickerTitle}"]`).click();
        cy.get(`img[alt="Sticker: ${schoolStickerTitle}"]`).should('exist');
    });
});
