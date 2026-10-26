import {
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
    generateTeacherEmail,
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
    deleteFeedback,
    gotoPupilReadingLogFromClassPage,
    releaseTopicsUpToADate,
    submitTeacherReadingFeedback,
    updateReadingComment,
    verifyLastEditedFeedbackDate
} from '../../shared/pages/utils';

describe('Submit reading feedback as a teacher then edit it', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const teacherFirstname = generateFirstName();
    const teacherLastname = generateLastName();
    const teacherNameForChildren = `Mr ${teacherFirstname}`;
    const schoolEmail = generateSchoolEmail();
    const teacherEmail = generateTeacherEmail();
    const parentEmailForInvitation = generateParentEmail();
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
                firstName,
                lastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
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

    it('Submit reading feedback as a school leader then edit it', () => {
        loginPage.login(schoolEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        gotoPupilReadingLogFromClassPage(`${firstName} ${lastName}`);
        submitTeacherReadingFeedback(feedback.bookName, feedback.comment);
        cy.get('[data-test=feedback-reading-comment]').first().should('contain', feedback.comment);
        cy.get('.last-edited-container').should('not.exist');
        updateReadingComment(feedback.updatedCommentForPupilReadingPage);
        verifyLastEditedFeedbackDate();
        cy.get(`.sidebar-options-list-container`).contains('Activity feed').click();
        cy.wait(2000);
        updateReadingComment(feedback.updatedCommentForActivityFeedPage);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000);
        cy.get('[data-test=pupil-entries-button]').first().click();
        updateReadingComment(feedback.updatedCommentForWeekByWeekPage);
        cy.get('body').click(0, 0);
        cy.get('[data-test="pupil-name-on-week-by-week-reading-view"]').contains(`${firstName} ${lastName}`).click();
        cy.get('.MuiTabs-flexContainer').contains('Reading').click();
        cy.get('[data-test="expand-reading-week-accordion-icon"]').first().click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();

        updateReadingComment(feedback.updatedCommentForPupilDetailsPage);
        cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
        cy.wait(2000);
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${firstName} ${lastName}`).should('exist').click();
        cy.get('body').click(0, 0);
        cy.get('[data-test=edit-activity-feedback-icon]').click();
        cy.get('textarea[name="comments"]').clear().type(feedback.updatedCommentForLogReadingPage);
        cy.get('[data-test=update-reading-log-button]').contains('Update reading log').click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        cy.get('[data-test=feedback-reading-comment]').first().should('contain', feedback.updatedCommentForLogReadingPage);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('.MuiButtonBase-root').contains('Class settings').click();
        cy.get('[data-test="add-teachers-in-class-select"]').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(`${teacherFirstname} ${teacherLastname}`).click();
        cy.get('.MuiButtonBase-root').contains('Update teachers').click();
    });

    it('Edit feedback logged by school leader as a teacher', () => {
        loginPage.login(teacherEmail, password);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        gotoPupilReadingLogFromClassPage(`${firstName} ${lastName}`);
        updateReadingComment(feedback.updatedCommentForPupilReadingPage);
        cy.get(`.sidebar-options-list-container`).contains('Activity feed').click();
        cy.wait(2000);
        updateReadingComment(feedback.updatedCommentForActivityFeedPage);
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.get('[data-test=pupil-entries-button]').first().click();
        updateReadingComment(feedback.updatedCommentForWeekByWeekPage);
        cy.get('body').click(0, 0);
        cy.get('[data-test="pupil-name-on-week-by-week-reading-view"]').contains(`${firstName} ${lastName}`).click();
        cy.get('.MuiTabs-flexContainer').contains('Reading').click();
        cy.get('[data-test="expand-reading-week-accordion-icon"]').first().click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        updateReadingComment(feedback.updatedCommentForPupilDetailsPage);
        cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
        cy.wait(2000);
        cy.get('#mui-component-select-pupilIds').click();
        cy.get('[data-test=multi-select-options]').contains(`${firstName} ${lastName}`).should('exist').click();
        cy.get('body').click(0, 0);
        cy.get('[data-test=edit-activity-feedback-icon]').click();
        cy.get('textarea[name="comments"]').clear().type(feedback.updatedCommentForLogReadingPage);
        cy.get('[data-test=update-reading-log-button]').contains('Update reading log').click();
        cy.get('[data-test="expand-activity-feedback-icon"]').click();
        cy.get('[data-test=feedback-reading-comment]').first().should('contain', feedback.updatedCommentForLogReadingPage);
    });

    it('Delete reading feedback as a teacher', () => {
        loginPage.login(teacherEmail, password);
        cy.get(`.sidebar-options-list-container`).contains('Activity feed').click();
        cy.wait(2000);
        deleteFeedback(feedback.updatedCommentForLogReadingPage, teacherNameForChildren);
    });
});
