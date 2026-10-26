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
    getInputBoxByName,
    getTextAreaBoxByName,
    runCronJob,
    schoolSettingsPage,
    submitParentReadingFeedback
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
    const sticker1 = 'dp.jpg';
    const stickerAltText1 = `sticker-1-${generateRandomString(10)}`;
    const stickerAltText2 = `sticker-2-${generateRandomString(10)}`;
    const feedback = {
        bookName: `Harry Potter ${generateRandomNumbers()}`,
        comment: generateRandomString(20),
        reply: generateRandomString(20),
        replyEdit: generateRandomString(20)
    };

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

    it('Add pupil feedback from home', () => {
        loginPage.login(parentEmailForInvitation, password);
        submitParentReadingFeedback(feedback.bookName, feedback.comment);
        cy.get('.activity-feed-comment-section > .activity-feed-card .paragraph').first().should('contain', feedback.comment);
    });

    it('Should enable tick, sticker, and comment features, and verify their existence', () => {
        loginPage.login(schoolEmail, password);
        schoolSettingsPage('school-settings-configuration', 'Configuration');
        getInputBoxByName('parentFeedbackTickFeatureEnabledAt').check();
        getInputBoxByName('isParentFeedbackReplyFeatureEnabled').check();
        getInputBoxByName('isParentFeedbackStickerFeatureEnabled').check();
        cy.get('.MuiButtonBase-root').contains('Save engagement settings').click();
        cy.get('.MuiAlert-message').contains('Settings updated').should('exist');
        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        cy.get('.mark_as_seen').should('exist');
        getInputBoxByName('comment').should('exist');
        cy.get('.stickers-icon').should('exist');
    });

    it('Enable tick in school and mark feedback as tick', () => {
        loginPage.login(schoolEmail, password);
        schoolSettingsPage('school-settings-configuration', 'Configuration');
        getInputBoxByName('parentFeedbackTickFeatureEnabledAt').check();
        getInputBoxByName('isParentFeedbackStickerFeatureEnabled').uncheck();
        getInputBoxByName('isParentFeedbackReplyFeatureEnabled').uncheck();
        cy.get('.MuiButtonBase-root').contains('Save engagement settings').click();
        cy.get('.MuiAlert-message').contains('Settings updated').should('exist');
        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        cy.get('.MuiButtonBase-root').contains('Next').click();
        cy.get('.MuiButtonBase-root').contains('Got it').click();
        cy.get('.MuiButtonBase-root').contains('Tick all').click();
        getInputBoxByName('comment').should('not.exist');
        cy.get('.stickers-icon').should('not.exist');
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.get('.feedback-ticked-by-container .heading-three').should('contain.text', `Mr ${leaderFirstName}`);
    });

    it('Enable comment in school and reply to feedback and update reply comment', () => {
        loginPage.login(schoolEmail, password);
        schoolSettingsPage('school-settings-configuration', 'Configuration');

        getInputBoxByName('parentFeedbackTickFeatureEnabledAt').uncheck();
        getInputBoxByName('isParentFeedbackReplyFeatureEnabled').check();
        getInputBoxByName('isParentFeedbackStickerFeatureEnabled').uncheck();
        cy.get('.MuiButtonBase-root').contains('Save engagement settings').click();
        cy.get('.MuiAlert-message').contains('Settings updated').should('exist');
        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        cy.get('.MuiButtonBase-root').contains('Got it').click();
        cy.get('.MuiButtonBase-root').contains('Tick all').should('not.exist');
        cy.get('.stickers-icon').should('not.exist');
        getInputBoxByName('comment').type(feedback.reply);
        cy.get('[data-testid="SendIcon"]').click();
        cy.get('.feedback-reply').should('contain.text', feedback.reply);

        cy.get('.feedback-reply-action-popover .common_drop_down').trigger('click');
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();

        getTextAreaBoxByName('comment').clear().type(feedback.replyEdit);

        cy.get('.MuiButtonBase-root').contains('Save').click();

        cy.get('.feedback-reply').should('contain.text', feedback.replyEdit);

        cy.get('.replied-info .replied-at .paragraph')
            .contains('Edited')
            .parents('.replied-info')
            .within(() => {
                cy.get('.common_drop_down').trigger('mouseover');
            });

        cy.get('.activity-feedback-actions-info-popover').should('contain.text', 'Edited on').and('contain.text', 'Replied on');

        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.get('.feedback-reply').should('contain.text', feedback.replyEdit);
    });

    it('Add sticker and enable sticker in school and reply/update to feedback with sticker', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Stickers').click();
        cy.get('.MuiButtonBase-root').contains('Add sticker').click();
        cy.get('.MuiTabs-flexContainer').contains('Upload').click();
        getInputBoxByName('alt').type(stickerAltText1);
        cy.get('input[type="file"]').first().attachFile(sticker1);
        cy.get('.btn_group > :nth-child(2) > .MuiButtonBase-root').click();
        cy.get('.MuiButtonBase-root').contains('Add sticker').click();
        cy.get('.MuiTabs-flexContainer').contains('Upload').click();
        getInputBoxByName('alt').type(stickerAltText2);
        cy.get('input[type="file"]').first().attachFile(sticker1);
        cy.get('.btn_group > :nth-child(2) > .MuiButtonBase-root').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(schoolEmail, password);
        schoolSettingsPage('school-settings-configuration', 'Configuration');
        getInputBoxByName('parentFeedbackTickFeatureEnabledAt').uncheck();
        getInputBoxByName('isParentFeedbackReplyFeatureEnabled').uncheck();
        getInputBoxByName('isParentFeedbackStickerFeatureEnabled').check();
        cy.get('.MuiButtonBase-root').contains('Save engagement settings').click();
        cy.get('.MuiAlert-message').contains('Settings updated').should('exist');
        cy.get(`.sidebar-options-list`).contains('Activity feed').click();
        cy.get('.MuiButtonBase-root').contains('Got it').click();
        cy.get('.MuiButtonBase-root').contains('Tick all').should('not.exist');
        getInputBoxByName('comment').should('not.exist');
        cy.get('.stickers-icon').click();
        cy.get(`img[alt="${stickerAltText1}"]`).click();
        cy.get('.replied_to_comment').contains('sent you a sticker').should('exist');

        cy.get('.sticker_content .feedback-reply-action-popover .common_drop_down').trigger('click');

        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        cy.get(`.select-image-container img[alt='${stickerAltText2}']`).click();
        cy.get('.MuiButtonBase-root').contains('Save').click();
        cy.get(`.replied-sticker img[alt='${stickerAltText2}']`).should('exist');

        cy.get('.sticker_content .replied-info .replied-at .paragraph')
            .contains('Edited')
            .parents('.replied-info')
            .within(() => {
                cy.get('.common_drop_down').trigger('mouseover');
            });

        cy.get('.activity-feedback-actions-info-popover').should('contain.text', 'Edited on').and('contain.text', 'Sent on');
    });

    it('Should deactivate sticker from admin site, ensure it is not shown to teacher but visible in feedback', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Stickers').click();
        cy.get(`.${stickerAltText2} .material-icons`).click();

        cy.get('li[aria-label="Deactivate"]').click();
        loginPage.adminAndTeacherLogout();
        loginPage.login(schoolEmail, password);

        cy.get(`.sidebar-options-list`).contains('Activity feed').click();

        cy.get('.stickers-icon').click();
        cy.get(`.stickers-list img[alt="${stickerAltText2}"]`).should('not.exist');

        cy.get('body').click(0, 0);

        cy.get(`.activity-feed-comment-section img[alt="${stickerAltText2}"]`).should('exist');
    });

    it('Delete sticker and reply from feedback', () => {
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list`).contains('Activity feed').click();

        cy.get('[data-test="feedback-REPLY"] .feedback-reply-action-popover .common_drop_down').click();

        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Delete').click();

        cy.get('body').then((body) => {
            if (body.find('.delete-confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Delete').click();
            }
        });

        cy.get('.reply-deleted-container .reply-deleted-at .paragraph').contains('A reply has been deleted.');

        cy.get('[data-test="feedback-STICKER"] .feedback-reply-action-popover .common_drop_down').click();

        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Delete').click();

        cy.get('body').then((body) => {
            if (body.find('.delete-confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Delete').click();
            }
        });

        cy.get('.reply-deleted-container .reply-deleted-at .paragraph').contains('A sticker has been deleted.');
    });
});
