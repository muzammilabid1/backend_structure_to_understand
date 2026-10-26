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
import { getFutureDate, getInputBoxByName, runCronJob, submitPupilFeedback, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Add new subject, topic domain and topic for a pupil and get stars on the topic', () => {
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
    const subjectName = `${generateFirstName()} subject`;
    const topicDomainName = `${subjectName} domain`;
    const topicName = `${subjectName} topic`;
    const activityName = `${topicName} activity`;
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const todayDate = `${day}/${month}/${year}`;

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
            false
        );
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Add a new subject', () => {
        cy.visit(`${baseUrl}`);
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Subjects').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Add subject').click();
        getInputBoxByName('name').type(subjectName);

        cy.get('div[data-test="subject-programme-type-select"] #demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Full programme').click();

        cy.get(`.MuiDialogActions-root`).contains('Add').click();
        cy.wait(2000, { log: false });
        cy.get('.domain_table > .tbody > .tr_row > .td').contains(subjectName).should('exist');
    });

    it('Create a topic domain', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Domains').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Add Domain').click();
        getInputBoxByName('name').type(topicDomainName);
        cy.get('#checkboxes-tags-demo').click().type('Year 1');
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(subjectName).click();
        cy.get(`.MuiDialogActions-root`).contains('Add').click();
        cy.wait(2000, { log: false });
        cy.get('.domain_table > .tbody > .tr_row > .td').contains(topicDomainName).should('exist');
    });

    it('Add topic domain to a topic', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
        getInputBoxByName('teacherTopicName').clear().type(topicName);
        getInputBoxByName('domainAndYearGroupIds').click().type(topicDomainName);
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(`.MuiButtonBase-root`).contains('Publish').click();
        cy.wait(3000, { log: false });
        cy.reload();
        cy.wait(3000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${topicName}`).click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activities').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();

        getInputBoxByName('name').type(activityName);
        cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
        cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('1');
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Test');

        cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(topicName).should('exist');
    });

    it('Add topic in class and release it', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Schedule').click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(1) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type('Year 1');
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(':nth-child(2) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type(subjectName);
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(':nth-child(3) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type(topicDomainName);
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            '.schedule > .schedule-topic-cards > .MuiGrid-root > .topic-summary-card-container > .topic-summary-content-section > .heading-three'
        )
            .contains(topicName)
            .should('exist')
            .then((heading) => {
                cy.wrap(heading)
                    .parent()
                    .parent()
                    .within(() => {
                        cy.get('.MuiButtonBase-root').contains('Select topic').should('exist').click();
                    });
            });
        cy.get('.MuiGrid-container > :nth-child(1) > .MuiFormControl-root > .MuiInputBase-root').click().type(todayDate);
        cy.wait(800, { log: false });
        cy.get('.topic-message-input > :nth-child(1) > .undefined > .MuiOutlinedInput-root').first().type('Test email');
        cy.get(`.MuiDialogActions-root`).contains('Add topic').click();
        cy.wait(2000, { log: false });
        cy.get('body').then((body) => {
            if (body.find('.confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Confirm').click();
            }
        });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        cy.wait(5000, { log: false });
        cy.get('.side-drawer-arrow > .material-icons').click();
        cy.get(`.sidebar-options-list`).contains('Run tasks').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('date').type(getFutureDate(1));
        cy.get('.MuiButton-root').contains('Release topics').click();
        cy.get('.MuiAlert-message').contains('Pupil topics released successfully!');
    });

    it('Submit feedback on topic and get stars in awards page', () => {
        loginPage.login(parentEmailForInvitation, password);
        cy.get('.child-card-footer-contanier > .footer-contant > .primary-text').contains(topicName).click();
        watchVideoAndUnlockActivities(true, 'Unlock activity');
        cy.wait(2000, { log: false });
        cy.get('.child-card-footer-contanier > .footer-contant > .primary-text').contains(activityName).click();
        submitPupilFeedback();
        cy.get('.MuiBreadcrumbs-ol').within(() => {
            cy.get('div > .MuiTypography-root').contains(`${firstName} ${lastName}`).click();
        });
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Awards').click();
        cy.wait(2000, { log: false });
        cy.get('.cus-silver').should('contain', '1');
        cy.get('.cus-gold').should('contain', '1');
    });
});
