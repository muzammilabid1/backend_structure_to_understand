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
    leaderFirstName,
    leaderlastName,
    newTopicName,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName,
    shortText
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import {
    addClassGroup,
    formatDate,
    getFutureDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    runCronJob,
    selectPupil,
    submitPupilFeedback,
    submitTeacherReadingFeedback,
    watchVideoAndUnlockActivities
} from '../../shared/pages/utils';

describe('teacher_view_week_by_week', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const pupil2FirstName = generateFirstName();
    const pupil2LastName = generateLastName();
    const myTopicName = `${newTopicName} Topic`;
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;

    const tomorrow = new Date();

    tomorrow.setDate(tomorrow.getDate() + 1);

    const feedback = {
        bookName: `Harry Potter ${generateRandomNumbers()}`,
        comment: generateRandomString(20)
    };

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add class and set topics', () => {
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
                parentFirstName,
                parentLastName,
                parentEmailForInvitation,
                firstName,
                lastName,
                pupil2FirstName,
                pupil2LastName
            },
            true,
            true
        );
        runCronJob('createReadingTopics');
    });

    it('adding teacher message on reading tab', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get('li p').contains('Add teacher message').click();
        getTextAreaBoxByName('description').type(shortText);
        cy.contains('button', 'Update').click();
        cy.contains('Lorem Ipsum is simply dummy text of the printing and typesetting industry').should('exist');
    });

    it('adding entries on reading tab', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.contains('p', firstName)
            .parents('.MuiGrid-container')
            .first()
            .within(() => {
                cy.contains('Entries').click();
            });
        submitTeacherReadingFeedback(feedback.bookName, feedback.comment);
        cy.get('span.cursor-help').contains('closed').click();
        cy.get('img[alt="readingSchoolIcon.png"]').should('exist');
    });

    it('edit topic on topic tab', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.contains('button', 'Topics').click();
        cy.wait(2000, { log: false });
        cy.contains('p', 'Edit topic').click();
        getInputBoxByName('endDate').clear().type(getFutureDate(1));
        cy.contains('button', 'Update topic').click();
        cy.get('body').then((body) => {
            if (body.find('.confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Confirm').click();
            }
        });
        cy.wait(2000, { log: false });
        cy.get('.active_date').contains(formatDate(tomorrow)).should('exist');
    });

    it('adding entries on topic tab', () => {
        loginPage.login(parentEmailForInvitation, password);
        selectPupil(firstName);
        cy.get(`.child-card-footer-contanier`).contains(myTopicName).click();
        cy.wait(2000, { log: false });
        watchVideoAndUnlockActivities();
        cy.get(`.child-card-footer-contanier`).contains(activity_one).click();
        submitPupilFeedback();
        loginPage.logout();
        cy.wait(2000, { log: false });
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.contains('button', 'Topics').click();
        cy.wait(2000, { log: false });
        cy.contains('p', firstName)
            .parents('.MuiGrid-container')
            .first()
            .within(() => {
                cy.contains('Entries').click();
            });

        cy.contains('Test commments').should('exist');
    });

    it('topic released to select pupil', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        addClassGroup(myClassName, false, null, `${firstName} ${lastName}`);
        cy.get('.MuiTableBody-root > :nth-child(1) > :nth-child(1) > .paragraph').contains(`${myClassName} Group`).first().click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(1) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type('Year 1');
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();
        getInputBoxByName('startDate').clear().type(getFutureDate(2));
        cy.wait(800, { log: false });
        cy.get(`.MuiButtonBase-root`).contains('Add topic').click();
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.contains('button', 'Topics').click();
        cy.wait(2000, { log: false });
        cy.get('[data-testid="NavigateNextIcon"]').click();
        cy.wait(2000, { log: false });

        cy.get('.released_to').within(() => {
            cy.contains('span', `${firstName} ${lastName}`).should('exist');
        });

        cy.get('.not_released_to').within(() => {
            cy.contains('span', `${pupil2FirstName} ${pupil2LastName}`).should('exist');
        });
    });
});
