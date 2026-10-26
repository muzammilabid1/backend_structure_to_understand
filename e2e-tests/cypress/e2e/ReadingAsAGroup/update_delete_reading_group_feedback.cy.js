import {
    admin,
    adminpassword,
    animalsNamesActivity,
    baseUrl,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
    generateRandomName,
    generateRandomNumbers,
    generateRandomString,
    generateSchoolEmail,
    generateTeacherEmail,
    leaderFirstName,
    leaderlastName,
    newTopicName,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { addClassPage } from '../../shared/pages/addClass';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import {
    deleteFeedback,
    getInputBoxByName,
    gotoPupilReadingLogFromClassPage,
    releaseTopicsUpToADate,
    updateReadingComment,
    waitForLoading
} from '../../shared/pages/utils';

describe('Update reading group feedback', () => {
    const mySchoolName = `${generateRandomName()} School`;
    const myClassName = `${generateRandomName()} Class`;
    const myClass2Name = `${generateRandomName()} Class`;
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const pupil1FirstName = generateFirstName();
    const pupil1LastName = generateLastName();
    const pupil2FirstName = generateFirstName();
    const pupil2LastName = generateLastName();
    const pupil3FirstName = generateFirstName();
    const pupil3LastName = generateLastName();
    const teacherFirstname = generateFirstName();
    const teacherLastname = generateLastName();
    const teacherEmail = generateTeacherEmail();
    const teacherNameForChildren = `Mr ${teacherFirstname}`;
    const myTopicName = `${newTopicName} Topic`;
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;
    const feedback = {
        bookName: `Harry Potter ${generateRandomNumbers()}`,
        comment: generateRandomString(20),
        updatedCommentForPupilReadingPage: generateRandomString(20),
        updatedCommentForActivityFeedPage: generateRandomString(20),
        updatedCommentForWeekByWeekPage: generateRandomString(20),
        updatedCommentForPupilDetailsPage: generateRandomString(20),
        updatedCommentForLogReadingPage: generateRandomString(20)
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
            {
                firstname: teacherFirstname,
                lastname: teacherLastname,
                email: teacherEmail,
                nameForChildren: teacherNameForChildren,
                sendInvite: true
            }
        );
        releaseTopicsUpToADate(null, true);
        loginPage.adminAndTeacherLogout();
    });

    it('Submit reading group feedback as a school leader', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.get('[data-testid=school-details-link]').contains(mySchoolName).should('exist').click();
        cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
        addClassPage.addClass(myClass2Name, true, false, `${leaderFirstName} ${leaderlastName}`);
        loginPage.adminAndTeacherLogout();
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClass2Name).click();
        pupilByTeacher.addChildByTeacher(pupil3FirstName, pupil3LastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();

        cy.get('[data-test="class-name-heading"]').contains(myClassName).should('exist');

        cy.get('.MuiButtonBase-root').contains('Class settings').click();
        cy.get('[data-test="add-teachers-in-class-select"]').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(`${teacherFirstname} ${teacherLastname}`).click();
        cy.get('.MuiButtonBase-root').contains('Update teachers').click();
        cy.get('.MuiAlert-message').should('contain', 'Teachers has been updated.');
        cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-main-options]').contains(myClassName).should('exist').click();
        cy.get('[data-test=multi-select-main-options]').contains(myClass2Name).should('exist').click();
        cy.get('body').click(0, 0);
        getInputBoxByName('bookName').type(feedback.bookName);
        cy.get('.extra-width > .readinglog-input-card-image-text > .heading-two').contains('Comment to share with parents').click();
        cy.get('.MuiOutlinedInput-root').eq(3).type(feedback.comment);
        cy.get('.MuiButtonBase-root').contains('Add').click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        cy.get('[data-test=feedback-reading-comment]').first().should('contain', feedback.comment);
        cy.get(`.sidebar-options-list-container`).contains('Activity feed').click();
        cy.wait(2000, { log: false });
        updateReadingComment(feedback.updatedCommentForActivityFeedPage);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('[data-test=pupil-entries-button]').first().click();
        updateReadingComment(feedback.updatedCommentForWeekByWeekPage);
        cy.get('[data-test="pupil-feedback-entries-drawer-header"] .common-tool-tip-icon').click();
        cy.get('[data-test="pupil-name-on-week-by-week-reading-view"]').contains(`${pupil1FirstName} ${pupil1LastName}`).click();
        cy.get('.MuiTabs-flexContainer').contains('Reading').click();
        cy.get('[data-test="expand-reading-week-accordion-icon"]').first().click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        updateReadingComment(feedback.updatedCommentForPupilDetailsPage);
        cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${pupil1FirstName} ${pupil1LastName}`).should('exist').click();
        cy.get('body').click(0, 0);
        cy.get('[data-test=edit-activity-feedback-icon]').click();
        cy.get('textarea[name="comments"]').clear().type(feedback.updatedCommentForLogReadingPage);
        cy.get('[data-test=update-reading-log-button]').contains('Update reading log').click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        cy.get('[data-test=feedback-reading-comment]').first().should('contain', feedback.updatedCommentForLogReadingPage);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        gotoPupilReadingLogFromClassPage(`${pupil1FirstName} ${pupil1LastName}`);
        updateReadingComment(feedback.updatedCommentForPupilReadingPage);
    });

    it('Edit group feedback logged by school leader as a teacher', () => {
        loginPage.login(teacherEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        gotoPupilReadingLogFromClassPage(`${pupil1FirstName} ${pupil1LastName}`);
        updateReadingComment(feedback.updatedCommentForPupilReadingPage);
        cy.get(`.sidebar-options-list-container`).contains('Activity feed').click();
        cy.wait(2000, { log: false });
        updateReadingComment(feedback.updatedCommentForActivityFeedPage);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('[data-test=pupil-entries-button]').first().click();
        updateReadingComment(feedback.updatedCommentForWeekByWeekPage);
        cy.get('[data-test="pupil-feedback-entries-drawer-header"] .common-tool-tip-icon').click();
        cy.get('[data-test="pupil-name-on-week-by-week-reading-view"]').contains(`${pupil1FirstName} ${pupil1LastName}`).click();
        cy.get('.MuiTabs-flexContainer').contains('Reading').click();
        cy.get('[data-test="expand-reading-week-accordion-icon"]').first().click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        updateReadingComment(feedback.updatedCommentForPupilDetailsPage);
        cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${pupil1FirstName} ${pupil1LastName}`).should('exist').click();
        cy.get('body').click(0, 0);
        cy.get('[data-test=edit-activity-feedback-icon]').click();
        cy.get('textarea[name="comments"]').clear().type(feedback.updatedCommentForLogReadingPage);
        cy.get('[data-test=update-reading-log-button]').contains('Update reading log').click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        cy.get('[data-test=feedback-reading-comment]').first().should('contain', feedback.updatedCommentForLogReadingPage);
        cy.get(`.sidebar-options-list-container`).contains('Activity feed').click();
        cy.wait(2000, { log: false });
        cy.get('[data-test=edit-activity-feedback-icon]').click();
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${pupil1FirstName} ${pupil1LastName}`).should('exist');
        cy.get('[data-test=multi-select-options]').contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist');
        cy.get('[data-test=multi-select-options]').contains(`${pupil3FirstName} ${pupil3LastName}`).should('exist').click();
        cy.get('[data-test=update-reading-log-button]').contains('Update reading log').click({ force: true });
        cy.get('.MuiAlert-message').should('contain', 'Reading entry has been updated');
        cy.get('[data-test=edit-activity-feedback-icon]').click();
        waitForLoading();
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${pupil1FirstName} ${pupil1LastName}`).should('exist');
        cy.get('[data-test=multi-select-options]').contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist');
        cy.get('[data-test=multi-select-options]').contains(`${pupil3FirstName} ${pupil3LastName}`).should('not.exist');
    });

    it('Delete group feedback logged by school leader as a teacher', () => {
        loginPage.login(teacherEmail, password);
        cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist').click();
        cy.get('body').click(0, 0);
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        deleteFeedback(feedback.updatedCommentForLogReadingPage, teacherNameForChildren, new Date());
    });
});
