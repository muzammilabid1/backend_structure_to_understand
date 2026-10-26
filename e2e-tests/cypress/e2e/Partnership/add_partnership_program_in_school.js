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
    parentEmail,
    parentFirstName,
    parentFirstNameExample,
    parentLastName,
    parentLastNameParent,
    parentPassword,
    password,
    playingGameActivity,
    schoolName
} from '../../shared/constants';
import { pupilByTeacher } from '../../shared/pages/addChildByTeacher';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, runCronJob, selectPupil, switchToPupil, watchVideoAndUnlockActivities } from '../../shared/pages/utils';

describe('Manage partnership programs in schools', () => {
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

    const schoolTagName = `School Tag ${generateLastName()}`;
    const programName = `Program ${generateLastName()}`;
    const updateProgramName = `Update ${generateLastName()}`;

    const p1Firstname = `P1-FirstName ${generateFirstName()}`;
    const p1Lastname = `P1-LastName ${generateFirstName()}`;

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

    it('Add a child to an existing parent in a new school', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(5000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(5000, { log: false });
        pupilByTeacher.addChildByTeacher(p1Firstname, p1Lastname, parentFirstNameExample, parentLastNameParent, parentEmail);

        cy.wait(10000, { log: false });
        cy.get(`.MuiTableCell-root`).contains(`${p1Firstname} ${p1Lastname}`).click();
        cy.wait(5000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Details').click();
        loginPage.adminAndTeacherLogout();
        cy.wait(3000, { log: false });
        loginPage.login(parentEmail, parentPassword);
        cy.wait(5000, { log: false });
        loginPage.acceptChildInvitationForParent(`${p1Firstname} ${p1Lastname}`);
    });

    it('Create a school tag and attach a school to it', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Tags').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Schools').click();
        cy.get('.MuiButtonBase-root').contains('Add a Tag').click();

        cy.get('#checkboxes-tags-demo').click().type(mySchoolName);

        cy.get('#checkboxes-tags-demo-listbox li').contains(mySchoolName).click();

        getInputBoxByName('name').clear().type(schoolTagName);

        cy.get(`.MuiButtonBase-root`).contains('Save').click();
        cy.wait(3000, { log: false });

        cy.get('.table .tbody .tr_row > .td')
            .contains(schoolTagName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.common_drop_down').trigger('mouseover');
                        cy.get('.typography-text').contains(mySchoolName);
                    });
            });
    });

    it('Create and attach a partner program', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Partnerships').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Add partner').click();

        getInputBoxByName('name').clear().type(programName);

        cy.get('.add-partnership-modal #demo-simple-select-outlined').click();
        cy.get('.MuiMenu-list').contains('li', schoolTagName).click();

        getInputBoxByName('logo').attachFile('partner-logo.png');
        getInputBoxByName('character').attachFile('partner-character.png');

        cy.get(`.MuiButtonBase-root`).contains('Save').click();
        cy.wait(3000, { log: false });

        cy.get('.table .tbody .tr_row > .td')
            .contains(programName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.common_drop_down').first().trigger('mouseover');
                        cy.get('.typography-text').contains(mySchoolName);
                    });
            });
    });

    it('Login as a parent and check if the partner logo is visible', () => {
        loginPage.login(parentEmail, parentPassword);
        cy.wait(2000, { log: false });

        // select pupil that have a program
        selectPupil(p1Firstname);

        cy.wait(2000, { log: false });
        cy.get('.brand-logo').should('exist');
        cy.wait(2000, { log: false });

        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.child-card-footer-contanier > .footer-contant > .primary-text').contains(myTopicName).click();
        watchVideoAndUnlockActivities();
        cy.wait(2000, { log: false });
        cy.get('.child-card-footer-contanier > .footer-contant > .primary-text').contains(activity_one).click();
        cy.wait(2000, { log: false });

        cy.get('.preview-topic-img .img_container img').should('have.attr', 'src').and('not.include', 'activity-child.png');

        // Select a pupil from a school that does not have a partner program
        switchToPupil('LWP 1', null);
        cy.wait(2000, { log: false });
        cy.get('.brand-logo').should('not.exist');
        cy.wait(2000, { log: false });
    });

    it('Login as a school, go to parent view, and check partner logo and character image', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });

        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();

        cy.wait(30000, { log: false });

        cy.get(`.MuiGrid-root`).contains(`${p1Firstname} ${p1Lastname}`).click();

        cy.wait(5000, { log: false });
        cy.get(`.MuiCardContent-root`).contains('Go to parent view').click();
        cy.wait(5000, { log: false });

        cy.wait(2000, { log: false });
        cy.get('.brand-logo').should('exist');
        cy.wait(2000, { log: false });

        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.child-card-footer-contanier > .footer-contant > .primary-text').contains(myTopicName).click();
        cy.wait(2000, { log: false });
        cy.get('.child-card-footer-contanier > .footer-contant > .primary-text').contains(activity_one).click();
        cy.wait(2000, { log: false });

        cy.get('.preview-topic-img .img_container img').should('have.attr', 'src').and('not.include', 'activity-child.png');
    });

    it('Update a partner program', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Partnerships').click();
        cy.wait(2000, { log: false });

        cy.get('.table .tbody .tr_row > .td')
            .contains(programName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });

        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();

        cy.wait(2000, { log: false });
        getInputBoxByName('name').clear().type(updateProgramName);

        cy.get(`.MuiButtonBase-root`).contains('Update').click();
        cy.wait(3000, { log: false });

        cy.get('.table .tbody .tr_row > .td').contains(updateProgramName);
    });
});
