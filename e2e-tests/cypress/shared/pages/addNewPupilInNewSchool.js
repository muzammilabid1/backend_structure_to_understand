import {
    ACCESS_TOKEN_COOKIE,
    admin,
    adminpassword,
    baseUrl,
    graphqlEndpoint,
    leaderFirstName,
    leaderlastName,
    password,
    releaseDate,
    repeatPassword
} from '../constants';
import { pupilByTeacher } from './addChildByTeacher';
import { addClassPage } from './addClass';
import { loginPage } from './login';
import { getInputBoxByName } from './utils';

/**
 * @param {string} schoolName
 * @param {string} schoolEmail
 * @param {string} className
 * @param {string} topicName
 * @param {object} pupilInput
 * @param {object} activityInput
 * @param {boolean} registerParent
 
 *
 */

const addSchoolAndClassAndPupil = (schoolName, schoolEmail, className, topicName, pupilInput, activityInput, registerParent = true) => {
    const { firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation, pupil2FirstName, pupil2LastName } = pupilInput;
    const { activity_one, activity_two, activity_third } = activityInput;

    loginPage.login(admin, adminpassword);
    cy.wait(5000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a school').click();
    cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').last().type(schoolName);
    cy.get('.MuiDialogContent-root > :nth-child(3) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
        .clear()
        .type(leaderFirstName);

    cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(leaderlastName);
    cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(schoolEmail);
    cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(`Mr ${leaderFirstName}`);
    cy.get(':nth-child(7) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('10');
    cy.get(':nth-child(8) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('10');
    cy.get('[data-test="add-school-total-classes-allowed-input"]').clear().type('40');
    cy.get(`.MuiButtonBase-root`).contains('Add school').click();
    cy.wait(2000, { log: false });

    cy.get('[data-testid="school-details-link"]').contains(schoolName).click();
    cy.wait(3000, { log: false });

    cy.get('input[name="fullProgrammedClassesAllowed"]').clear().type('5000');
    cy.get('input[name="classesAllowed"]').clear().type('10000');
    getInputBoxByName('enableAddClasses').check().should('be.checked');
    cy.get('.MuiButtonBase-root').contains('Update details').click();
    cy.wait(3000, { log: false });

    cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
    cy.wait(2000, { log: false });

    addClassPage.addClass(className);
    cy.wait(3000, { log: false });

    cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();

    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .then(() => {
            cy.wait(3000, { log: false });

            cy.get(`.MuiTabs-flexContainer`).contains('Staff').click();
            cy.get('.token').then(($span) => {
                const resetPassTokenStaff = $span.text();

                cy.wait(2000, { log: false });

                cy.get(`.sidebar-options-list`).contains('Topics').click();
                cy.wait(5000, { log: false });
                cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
                getInputBoxByName('teacherTopicName').clear().type(topicName);
                cy.get(
                    ':nth-child(2) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiOutlinedInput-root > #tags-outlined'
                ).click();
                cy.get(
                    ':nth-child(2) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo'
                ).click();
                cy.get(':nth-child(3) > .MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined').click();
                cy.get('[data-value="MATHS"]').click();
                cy.get(
                    ':nth-child(4) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo'
                ).click();
                cy.get('#checkboxes-tags-demo-option-1').click();
                cy.get(`.MuiButtonBase-root`).contains('Add topic').click();
                cy.wait(3000, { log: false });

                cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${topicName}`).first().click();
                // cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${fruitsNamesTopicName}`).first().click();
                cy.wait(3000, { log: false });
                cy.get(`.MuiTabs-flexContainer`).contains('Activities').click();
                cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();

                cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                    .first()
                    .clear()
                    .type(activity_one);
                cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
                cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('1');
                cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('GuessTheAnimal');

                cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
                cy.wait(2000, { log: false });

                cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();

                cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                    .first()
                    .clear()
                    .type(activity_two);
                cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
                cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('2');
                cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('ClapClap');

                cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
                cy.wait(2000, { log: false });

                cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();

                cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                    .first()
                    .clear()
                    .type(activity_third);
                cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
                cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('3');
                cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
                    .clear()
                    .type('SoundsScavengerHunt');

                cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
                cy.wait(2000, { log: false });
                loginPage.adminAndTeacherLogout();
                cy.visit(`${baseUrl}signup/${resetPassTokenStaff}`);
                cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root').type(password);
                cy.get(':nth-child(7) > .MuiFormControl-root > .MuiInputBase-root').type(repeatPassword);
                cy.get('.MuiFormControlLabel-root').click();
                cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
                cy.wait(3000, { log: false });
                cy.get(`.sidebar-options-list-container`).contains(className).click();
                cy.wait(5000, { log: false });
                cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
                cy.wait(10000, { log: false });
                cy.get(`.MuiButtonBase-root`).contains('Add new topic').click();
                cy.get('.undefined > .MuiOutlinedInput-root > .MuiOutlinedInput-input').type(topicName);
                cy.get('.topic-summary-btn-container > :nth-child(1) > .MuiButton-root').click();
                cy.get(
                    ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
                ).click();
                cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
                cy.wait(800, { log: false });

                cy.get(`.MuiButtonBase-root`).contains('Add topic').click();
                cy.wait(2000, { log: false });
                loginPage.adminAndTeacherLogout();
                cy.wait(2000, { log: false });

                loginPage.login(admin, adminpassword);
                cy.wait(5000, { log: false });
                cy.get(`.sidebar-options-list`).contains('Run tasks').click();

                cy.wait(2000, { log: false });
                cy.get('.MuiInputAdornment-root > .MuiButtonBase-root').first().click();
                cy.get('.MuiButtonBase-root.MuiPickersDay-root').contains(releaseDate).click();
                cy.get(`.MuiButtonBase-root`).contains('Release topics').click();
                cy.wait(2000, { log: false });
                loginPage.adminAndTeacherLogout();

                cy.wait(2000, { log: false });
                loginPage.login(schoolEmail, password);

                cy.wait(2000, { log: false });

                cy.get(`.sidebar-options-list-container`).contains(className).click();
                cy.wait(5000, { log: false });
                pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
                cy.wait(2000, { log: false });
                cy.reload();
                cy.wait(3000, { log: false });
                if (pupil2FirstName && pupil2LastName) {
                    pupilByTeacher.addChildByTeacher(
                        pupil2FirstName,
                        pupil2LastName,
                        parentFirstName,
                        parentLastName,
                        parentEmailForInvitation
                    );
                    cy.wait(2000, { log: false });
                    cy.reload();
                    cy.wait(3000, { log: false });
                }

                cy.get(`.extra-width`).contains(`${firstName} ${lastName}`).click();
                cy.wait(3000, { log: false });

                if (registerParent) {
                    cy.get(`.MuiTabs-flexContainer`).contains('Details').click();

                    cy.get('.token').then(($span) => {
                        const resetPassTokenParent = $span.text();

                        cy.wait(2000, { log: false });
                        loginPage.adminAndTeacherLogout();

                        cy.visit(`${baseUrl}signup/${resetPassTokenParent}`);

                        cy.get(':nth-child(7) > .MuiFormControl-root > .MuiInputBase-root').type(password);
                        cy.get(':nth-child(8) > .MuiFormControl-root > .MuiInputBase-root').type(repeatPassword);

                        cy.get('.MuiFormControlLabel-root').click();

                        cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
                        cy.wait(10000, { log: false });
                        loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
                        cy.wait(3000, { log: false });
                        if (pupil2FirstName && pupil2LastName) {
                            loginPage.acceptChildInvitationForParent(`${pupil2FirstName} ${pupil2LastName}`);
                        }

                        cy.wait(3000, { log: false });
                        cy.get('.MuiTypography-root > .material-icons').click();
                        cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph')
                            .contains('Sign out')
                            .click({ force: true });
                    });
                } else {
                    loginPage.adminAndTeacherLogout();
                }
            });
        });
};

/**
 * @param {string} schoolName
 * @param {string} schoolEmail
 * @param {string} className
 * @param {object} pupilInput
 * @param {boolean} registerParent
 
 *
 */

const getNewSchoolDataWithReading = (schoolName, schoolEmail, className, pupilInput, registerParent = true) => {
    const { firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation, pupil2FirstName, pupil2LastName } = pupilInput;

    loginPage.login(admin, adminpassword);
    cy.wait(5000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a school').click();
    cy.get(':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').last().type(schoolName);
    cy.get('.MuiDialogContent-root > :nth-child(3) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
        .clear()
        .type(leaderFirstName);
    cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(leaderlastName);
    cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(schoolEmail);
    cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(`Mr ${leaderFirstName}`);
    cy.get(':nth-child(7) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('10');
    cy.get(':nth-child(8) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('10');
    cy.get('[data-test="add-school-total-classes-allowed-input"]').clear().type('40');
    cy.get(`.MuiButtonBase-root`).contains('Add school').click();
    cy.wait(2000, { log: false });

    cy.get('[data-testid="school-details-link"]').contains(schoolName).click();
    cy.wait(3000, { log: false });
    cy.get(`.MuiTabs-flexContainer`).contains('Classes').click();
    cy.wait(2000, { log: false });
    addClassPage.addClass(className);
    cy.wait(3000, { log: false });
    cy.get(`.MuiTabs-flexContainer`).contains('Staff').click();
    cy.get('.token').then(($span) => {
        const resetPassTokenStaff = $span.text();

        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
        cy.visit(`${baseUrl}signup/${resetPassTokenStaff}`);
        cy.wait(3000, { log: false });
        cy.get('.MuiButton-root').contains('Continue to set password').click();
        cy.wait(3000, { log: false });
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root').type(password);
        cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root').type(repeatPassword);
        cy.get('.MuiFormControlLabel-root').click();
        cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
        cy.wait(3000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(className).click();
        cy.wait(5000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Class settings').click();
        cy.wait(5000, { log: false });
        // getInputBoxByName('isReadingLogsEnabled').check().should('be.checked');
        cy.get('.MuiButton-root').contains('Save programme options').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Confirm').click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activity grid').click();
        cy.wait(5000, { log: false });
        pupilByTeacher.addChildByTeacher(firstName, lastName, parentFirstName, parentLastName, parentEmailForInvitation);
        cy.wait(2000, { log: false });
        cy.reload();
        cy.wait(3000, { log: false });
        if (pupil2FirstName && pupil2LastName) {
            pupilByTeacher.addChildByTeacher(pupil2FirstName, pupil2LastName, parentFirstName, parentLastName, parentEmailForInvitation);
            cy.wait(2000, { log: false });
            cy.reload();
            cy.wait(3000, { log: false });
        }

        loginPage.adminAndTeacherLogout();
        cy.wait(2000, { log: false });
        loginPage.login(admin, adminpassword);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.wait(2000, { log: false });
        cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
            .contains(className)
            .dblclick();
        cy.wait(2000, { log: false });
        cy.get('.MuiButton-root').contains('Create this week reading topic').click();
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Run tasks').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiInputAdornment-root > .MuiButtonBase-root').first().click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-root').contains(releaseDate).click();
        cy.get(`.MuiButtonBase-root`).contains('Release topics').click();
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();

        cy.wait(2000, { log: false });
        loginPage.login(schoolEmail, password);

        cy.wait(2000, { log: false });

        cy.get(`.sidebar-options-list-container`).contains(className).click();
        cy.wait(5000, { log: false });

        cy.get(`.extra-width`).contains(`${firstName} ${lastName}`).click();
        cy.wait(3000, { log: false });

        if (registerParent) {
            cy.get(`.MuiTabs-flexContainer`).contains('Details').click();

            cy.get('.token').then(($span) => {
                const resetPassTokenParent = $span.text();

                cy.wait(2000, { log: false });
                loginPage.adminAndTeacherLogout();

                cy.visit(`${baseUrl}signup/${resetPassTokenParent}`);
                cy.wait(3000, { log: false });
                cy.get('.MuiButton-root').contains('Continue to set password').click();
                cy.wait(3000, { log: false });
                cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root').type(password);
                cy.get(':nth-child(6) > .MuiFormControl-root > .MuiInputBase-root').type(repeatPassword);

                cy.get('.MuiFormControlLabel-root').click();

                cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
                cy.wait(10000, { log: false });
                loginPage.acceptChildInvitationForParent(`${firstName} ${lastName}`);
                cy.wait(3000, { log: false });
                if (pupil2FirstName && pupil2LastName) {
                    loginPage.acceptChildInvitationForParent(`${pupil2FirstName} ${pupil2LastName}`);
                }

                cy.wait(3000, { log: false });
                cy.get('.MuiTypography-root > .material-icons').click();
                cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
            });
        } else {
            loginPage.adminAndTeacherLogout();
        }
    });
};

/**
 * @param {string} schoolName
 * @param {object} leader
 * @param {number} fullProgrammedClassesAllowed
 * @param {number} classesAllowed

 *
 */

const createSchoolAndDummyWondeDataWithMutation = (schoolName, fullProgrammedClassesAllowed, classesAllowed, leader) => {
    loginPage.login(admin, adminpassword);
    cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
        cy.request({
            method: 'POST',
            url: graphqlEndpoint,
            headers: {
                Authorization: `Bearer ${cookie?.value}`
            },
            body: {
                operationName: 'createSchoolAndDummyWondeData',
                query: `
                mutation createSchoolAndDummyWondeData($input: SchoolAndDummyWondeDataInput!) {
                    createSchoolAndDummyWondeData(input: $input)
                }
                `,
                variables: {
                    input: {
                        schoolName,
                        leaderPassword: password,
                        fullProgrammedClassesAllowed,
                        classesAllowed,
                        leader
                    }
                }
            }
        }).then((response) => {
            if (response?.body?.errors && response?.body?.errors?.length > 0) {
                // Extract the message from the first error
                const errorMessage = response?.body?.errors?.[0]?.message;

                throw new Error(`GraphQL mutation failed: ${errorMessage}`);
            }
        });
    });
    loginPage.adminAndTeacherLogout();
};

/**
 * @param {string} schoolName
 * @param {string} className
 * @param {string} topicName
 * @param {string} password
 * @param {array} activityData
 * @param {object} leader
 * @param {object} pupilInput
 * @param {object} teacherInput
 * @param {boolean} registerParent
 * @param {boolean} addReading
 * @param {number} readingTarget
 * @param {boolean} addTopics
 
 *
 */

export const addSchoolAndClassAndPupilWithMutation = (
    schoolName,
    className,
    topicName,
    password,
    activityData,
    leader,
    pupilInput,
    registerParent = true,
    addReading = false,
    readingTarget = 5,
    teacherInput = null,
    addTopics = false
) => {
    const {
        firstName,
        lastName,
        parentFirstName,
        parentLastName,
        parentEmailForInvitation,
        pupil2FirstName,
        pupil2LastName,
        parentPhoneNumberForInvitation
    } = pupilInput;

    loginPage.login(admin, adminpassword);
    cy.wait(5000, { log: false });
    cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
        cy.request({
            method: 'POST',
            url: graphqlEndpoint,
            headers: {
                Authorization: `Bearer ${cookie?.value}`
            },
            body: {
                operationName: 'createSchoolDataForTesting',
                query: `
                mutation createSchoolDataForTesting($input: CreateSchoolDataForTestingInput!) {
                    createSchoolDataForTesting(input: $input)
                }
                `,
                variables: {
                    input: {
                        schoolName,
                        className,
                        topicName,
                        leaderPassword: password,
                        activityData,
                        leader,
                        pupilInput: {
                            pupilFirstName: firstName,
                            pupilLastName: lastName,
                            parentFirstName,
                            parentLastName,
                            parentEmailForInvitation,
                            parentPhoneNumberForInvitation,
                            pupil2FirstName,
                            pupil2LastName
                        },
                        registerParent,
                        addReading,
                        teacherInput,
                        readingTarget,
                        addTopics
                    }
                }
            }
        }).then((response) => {
            if (response?.body?.errors && response?.body?.errors?.length > 0) {
                // Extract the message from the first error
                const errorMessage = response?.body?.errors?.[0]?.message;

                throw new Error(`GraphQL mutation failed: ${errorMessage}`);
            }
        });
    });
    loginPage.adminAndTeacherLogout();
    cy.wait(2000, { log: false });
};

export const addNewPupilInNewSchool = {
    addSchoolAndClassAndPupil,
    getNewSchoolDataWithReading,
    createSchoolAndDummyWondeDataWithMutation
};
