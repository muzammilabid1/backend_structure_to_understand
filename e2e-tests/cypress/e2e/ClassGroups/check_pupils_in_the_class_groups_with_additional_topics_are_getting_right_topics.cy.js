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
    generateTeacherEmail,
    leaderFirstName,
    leaderlastName,
    newTopicName,
    parentFirstName,
    parentLastName,
    password,
    playingGameActivity,
    schoolName,
    teacherFirstname,
    teacherLastname
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import {
    acceptMultiChildPrompt,
    getInputBoxByName,
    releasePupilTopicsFromAdminSide,
    runCronJob,
    selectPupil
} from '../../shared/pages/utils';

describe('Check pupils in the class groups are getting right topics', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const schoolEmail = generateSchoolEmail();
    const teacherEmail = generateTeacherEmail();
    const parentEmailForInvitation = generateParentEmail();
    const pupil1FirstName = generateFirstName();
    const pupil1LastName = generateLastName();
    const pupil2FirstName = generateFirstName();
    const pupil2LastName = generateLastName();
    const myTopicName = `${newTopicName} Topic`;
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;
    const classGroupName = `${myClassName} English Group`;
    let classPupil = null;
    let groupPupil = null;

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
                nameForChildren: `Mr ${teacherFirstname}`,
                sendInvite: true
            },
            true
        );
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Create english group and set topics different from the class', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Class groups').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Create a group').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('groupName').type(classGroupName);
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').first().click().type('English');
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('.border_unActive > .MuiFormControlLabel-root > .MuiButtonBase-root > .PrivateSwitchBase-input').click();
        cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').eq(1).click();
        cy.get('#checkboxes-tags-demo-option-0').then((englishGroupCheckBoxOption) => {
            const englishPupilName = englishGroupCheckBoxOption?.text();

            cy.wrap(englishGroupCheckBoxOption).click();
            cy.get('#demo-simple-select-outlined').click();
            cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
            cy.get('.MuiButtonBase-root').contains('Create group').click();
            cy.wait(2000, { log: false });
            cy.get('.MuiTableBody-root > :nth-child(1) > :nth-child(1) > .paragraph').contains(classGroupName).should('exist');

            const isPupilOneEnglishPupil = englishPupilName === `${pupil1FirstName} ${pupil1LastName}`;

            classPupil = isPupilOneEnglishPupil ? `${pupil2FirstName} ${pupil2LastName}` : `${pupil1FirstName} ${pupil1LastName}`;
            groupPupil = isPupilOneEnglishPupil ? `${pupil1FirstName} ${pupil1LastName}` : `${pupil2FirstName} ${pupil2LastName}`;
        });
    });

    it('Release a maths topic to the class - check goes to both pupils', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('search').type('Maths');
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();
        cy.get(
            ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
        ).click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
        cy.wait(800, { log: false });
        cy.get('.topic-message-input > :nth-child(1) > .undefined > .MuiOutlinedInput-root').first().type('Test email');
        cy.get(`.MuiDialogActions-root`).contains('Add topic').click();
        cy.get('body').then((body) => {
            if (body.find('.confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Confirm').click();
            }
        });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        releasePupilTopicsFromAdminSide();
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        selectPupil(classPupil.split(' ')[0]);
        cy.wait(2000, { log: false });
        acceptMultiChildPrompt();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains('Maths Topic').should('exist');
        cy.get('.logo-with-heading > .MuiButtonBase-root > img').click();
        cy.wait(2000, { log: false });
        selectPupil(groupPupil.split(' ')[0]);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains('Maths Topic').should('exist');
    });

    it('Release an English topic to the class - check goes to both pupils.', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(2000, { log: false });
        getInputBoxByName('search').type('English');
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();
        cy.get(
            ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
        ).click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
        cy.wait(800, { log: false });
        cy.get('.topic-message-input > :nth-child(1) > .undefined > .MuiOutlinedInput-root').first().type('Test email');
        cy.get(`.MuiDialogActions-root`).contains('Add topic').click();
        cy.get('body').then((body) => {
            if (body.find('.confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Confirm').click();
            }
        });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        releasePupilTopicsFromAdminSide();
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        selectPupil(classPupil.split(' ')[0]);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains('English Topic').should('exist');
        cy.get('.logo-with-heading > .MuiButtonBase-root > img').click();
        cy.wait(2000, { log: false });
        selectPupil(groupPupil.split(' ')[0]);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains('English Topic').should('exist');
    });

    it('Release English topic to the group - check goes to just group pupil and does not go to class pupil.', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Class groups').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTableBody-root > :nth-child(1) > :nth-child(1) > .paragraph').contains(classGroupName).first().click();
        cy.wait(2000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(1) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type('Year 1');
        cy.get('#checkboxes-tags-demo-option-0').click();
        getInputBoxByName('search').type('Sea');
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();
        cy.get('.heading-two').then((classGroupTopicNameDiv) => {
            const classGroupTopicName = classGroupTopicNameDiv?.text();

            cy.get(
                ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
            ).click();
            cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();
            cy.wait(800, { log: false });
            cy.get('.topic-message-input > :nth-child(1) > .undefined > .MuiOutlinedInput-root').first().type('Test email');
            cy.get(`.MuiDialogActions-root`).contains('Add topic').click();
            cy.get('body').then((body) => {
                if (body.find('.confirmation-modal').length > 0) {
                    cy.get('.MuiButtonBase-root').contains('Confirm').click();
                }
            });
            loginPage.adminAndTeacherLogout();
            loginPage.login(admin, adminpassword);
            releasePupilTopicsFromAdminSide();
            loginPage.adminAndTeacherLogout();
            loginPage.login(parentEmailForInvitation, password);
            cy.wait(2000, { log: false });
            selectPupil(groupPupil.split(' ')[0]);
            cy.wait(2000, { log: false });
            cy.get('.MuiTabs-flexContainer').contains('Topics').click();
            cy.wait(2000, { log: false });
            cy.get(`.child-card-footer-contanier`).contains(classGroupTopicName).should('exist');
            cy.get('.logo-with-heading > .MuiButtonBase-root > img').click();
            cy.wait(2000, { log: false });
            selectPupil(classPupil.split(' ')[0]);
            cy.wait(2000, { log: false });
            cy.get('.MuiTabs-flexContainer').contains('Topics').click();
            cy.wait(2000, { log: false });
            cy.get(`.child-card-footer-contanier`).contains(classGroupTopicName).should('not.exist');
        });
    });
});
