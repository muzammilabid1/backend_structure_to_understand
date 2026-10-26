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
import {
    addClassFromSchoolOverviewPage,
    getInputBoxByName,
    releasePupilTopicsFromAdminSide,
    runCronJob,
    selectPupil,
    switchToPupil,
    watchVideoAndUnlockActivities
} from '../../shared/pages/utils';

describe('Switch pupil class', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName1 = `${className} Class`;

    const myClassName2 = `${className} 2 Class`;
    const class2GroupName = `${myClassName2} Group`;

    const myClass1TopicName1 = `${newTopicName} Topic`;
    const myClass1TopicName2 = 'Dragons';
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const pupil1FirstName = generateFirstName();
    const pupil1LastName = generateLastName();
    const pupil2FirstName = generateFirstName();
    const pupil2LastName = generateLastName();
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;

    const myClass2TopicName = `Animals`;

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('Add test data and release topic', () => {
        addSchoolAndClassAndPupilWithMutation(
            mySchoolName,
            myClassName1,
            myClass1TopicName1,
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

    it('Schedules an additional topic for the class', () => {
        loginPage.login(schoolEmail, password);

        cy.get(`.sidebar-options-list-container`).contains(myClassName1).click();

        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        getInputBoxByName('search').type(myClass1TopicName2);

        cy.get('div[data-test="class-schedule-year-group-multi-select"] #checkboxes-tags-demo').click().type('All');

        cy.get('#checkboxes-tags-demo-option-0').click();

        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();

        cy.get(
            ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
        ).click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();

        cy.get(`.MuiDialogActions-root`).contains('Add topic').click();
        cy.get('body').then((body) => {
            if (body.find('.confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Confirm').click();
            }
        });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        releasePupilTopicsFromAdminSide();
    });

    it('Pupil watch video, unlock activities', () => {
        loginPage.login(parentEmailForInvitation, password);

        selectPupil(pupil1FirstName);

        cy.get('.MuiTabs-flexContainer').contains('Topics').click();

        cy.get(`.child-card-footer-contanier`).contains(myClass1TopicName2).should('exist');
        cy.get(`.child-card-footer-contanier`).contains(myClass1TopicName1).should('exist').click();

        watchVideoAndUnlockActivities();
    });

    it('Creates a new class, group, and schedules a topic', () => {
        loginPage.login(schoolEmail, password);

        addClassFromSchoolOverviewPage(myClassName2);
        cy.get('.heading-one').contains('Registration classes');

        cy.get('.paragraph').contains(myClassName2).parents('a').click();

        cy.get(`.sidebar-options-list-container`).contains(myClassName2).click();

        cy.get(`.MuiTabs-flexContainer`).contains('Class groups').click();
        cy.get('.lwp-button').contains('Create a group').click();
        getInputBoxByName('groupName').type(class2GroupName);
        cy.get('div[data-test="class-group-subjects-select"] #checkboxes-tags-demo').first().click();
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
        cy.get('.MuiButtonBase-root').contains('Create group').click();

        cy.get(`.MuiTabs-flexContainer`).contains('Schedule').click();
        getInputBoxByName('search').type(myClass2TopicName);

        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.get(
            ':nth-child(1) > .MuiPaper-root > .MuiCardActions-root > .topic-summary-btn-container > :nth-child(1) > .MuiButton-root'
        ).click();

        cy.get(
            ':nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputAdornment-root > .MuiButtonBase-root > .MuiSvgIcon-root'
        ).click();
        cy.get('.MuiButtonBase-root.MuiPickersDay-today').click();

        cy.get(`.MuiDialogActions-root`).contains('Add topic').click();
        cy.get('body').then((body) => {
            if (body.find('.confirmation-modal').length > 0) {
                cy.get('.MuiButtonBase-root').contains('Confirm').click();
            }
        });
        loginPage.adminAndTeacherLogout();
        loginPage.login(admin, adminpassword);
        releasePupilTopicsFromAdminSide();
    });

    it("Switches a pupil's class from their details page", () => {
        loginPage.login(schoolEmail, password);

        cy.get(`.sidebar-options-list-container`).contains(myClassName1).click();
        cy.get("a[data-test='common-nav-pupils-tab']").click();
        cy.get('.paragraph').contains(`${pupil1FirstName} ${pupil1LastName}`).click();
        cy.get("button[data-test='pupil-details-details-tab']").click();

        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Change class').click();

        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(myClassName2).click();

        cy.get('.MuiButtonBase-root').contains('Change class').click();

        cy.get('.pupil-registration-classes td .paragraph').contains(myClassName2).should('exist');

        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add to group').click();

        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(class2GroupName).click();

        cy.get('.MuiButtonBase-root').contains('Add to group').click();
        cy.get('.pupil-class-groups td .paragraph').contains(class2GroupName).should('exist');
    });

    it('Moves pupils to a different class from the pupils tab', () => {
        loginPage.login(schoolEmail, password);

        cy.get(`.sidebar-options-list-container`).contains(myClassName1).click();
        cy.get("a[data-test='common-nav-pupils-tab']").click();
        getInputBoxByName('selectAllPupils').check();

        cy.get('.lwp-button').contains('Change class').click();

        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(myClassName2).click();

        cy.get('button[data-test="dialog-primary-btn"]').contains('Change class').click();

        cy.get('.pupil_table_body_container tbody').should('be.empty');

        cy.get(`.sidebar-options-list-container`).contains(myClassName2).click();

        cy.get('.heading-one').contains(myClassName2);

        cy.get("a[data-test='common-nav-pupils-tab']").click();

        cy.get('.pupil-name-status-container').contains(`${pupil1FirstName} ${pupil1LastName}`).should('exist');
        cy.get('.pupil-name-status-container').contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist');
    });

    it('Add pupils to a class group from the pupils tab', () => {
        loginPage.login(schoolEmail, password);

        cy.get(`.sidebar-options-list-container`).contains(myClassName2).click();
        cy.get("a[data-test='common-nav-pupils-tab']").click();
        getInputBoxByName('selectAllPupils').check();
        cy.get('.lwp-button').contains('Add to group').click();

        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(class2GroupName).click();

        cy.get('button[data-test="dialog-primary-btn"]').contains('Add to group').click();

        cy.get("a[data-test='common-nav-class-groups-tab']").click();
        cy.get('p[data-test="group-name"]').contains(class2GroupName).click();

        cy.get("a[data-test='common-nav-pupils-tab']").click();

        cy.get('.pupil-name-status-container').contains(`${pupil1FirstName} ${pupil1LastName}`).should('exist');
        cy.get('.pupil-name-status-container').contains(`${pupil2FirstName} ${pupil2LastName}`).should('exist');
    });

    it("Parent logs in and verifies the pupil's updated class topic schedule", () => {
        loginPage.login(parentEmailForInvitation, password);

        // Select the first pupil who previously watched a video and unlocked activities in class 1 (myClass1TopicName1).
        // After changing class, their progress in class 1 should be preserved.
        selectPupil(pupil1FirstName);

        cy.get('.MuiTabs-flexContainer').contains('Topics').click();

        cy.get(`.child-card-footer-contanier`).contains(myClass1TopicName2).should('not.exist');

        cy.get(`.child-card-footer-contanier`).contains(myClass1TopicName1).should('exist');
        cy.get(`.child-card-footer-contanier`).contains(myClass2TopicName).should('exist');

        // Switch to a second pupil who did not do any activities in class 1.
        // After changing class, no class 1 topics should be preserved for this pupil.
        switchToPupil(pupil2FirstName, null); // this pupil did'nt do any activity in class 1 so after changing class the topic will not preserve

        cy.get(`.child-card-footer-contanier`).contains(myClass1TopicName2).should('not.exist');
        cy.get(`.child-card-footer-contanier`).contains(myClass1TopicName1).should('not.exist');

        cy.get(`.child-card-footer-contanier`).contains(myClass2TopicName).should('exist');
    });
});
