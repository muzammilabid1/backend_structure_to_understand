import {
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    generateFirstName,
    generateLastName,
    generateParentEmail,
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
    getFutureDate,
    getInputBoxByName,
    releaseTopicsUpToADate,
    runCronJob,
    schoolSettingsPage,
    waitForLoading
} from '../../shared/pages/utils';

describe('Add holiday in school', () => {
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

    const holidayStartDate = getFutureDate(0);
    const holidayEndDate = getFutureDate(9);
    const holidayName = `Holiday - ${generateRandomString()}`;

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
                firstName: firstName,
                lastName: lastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
            },
            true,
            true
        );
        runCronJob();
        releaseTopicsUpToADate(null, false);
        loginPage.adminAndTeacherLogout();
    });

    it('Add holiday in school', () => {
        loginPage.login(schoolEmail, password);

        schoolSettingsPage('school-settings-holiday-dates', 'Holiday dates');

        cy.get('.MuiListItemText-root').contains('Add a holiday').click();
        waitForLoading();
        getInputBoxByName('holidayName').type(holidayName);
        getInputBoxByName('startDate').type(holidayStartDate);
        getInputBoxByName('endDate').type(holidayEndDate);

        cy.get('.MuiButton-root').contains('Add').click();

        cy.get('.MuiButton-root').contains('Confirm').click();
        cy.get('.MuiAlert-message').contains('Holiday created').should('exist');

        cy.contains('table tbody tr td', holidayName).should('exist');
    });

    it('Create reading topic overlaping with holiday and verify overlaping reading topic email to teacher', () => {
        runCronJob('createReadingTopics', true);
        cy.get('.MuiAlert-message').contains('Success: Created reading topics for classes successfully!').should('be.visible');
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.get('[data-testid="school-details-link"]').contains(mySchoolName).dblclick();
        cy.get('.MuiTabs-flexContainer').contains('Staff').click();
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph')
            .contains(`${leaderFirstName} ${leaderlastName}`)
            .dblclick();
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.contains('.table_main .tr_row .td', 'Send teacher reading topic holiday overlap').then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });
        cy.get('textarea[name="params"]')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    CLASS: myClassName,
                    SCHOOL: mySchoolName,
                    LASTNAME: leaderlastName,
                    FIRSTNAME: leaderFirstName,
                    HOLIDAYNAME: holidayName
                });
            });
        cy.get('body').click(0, 0);
    });
});
