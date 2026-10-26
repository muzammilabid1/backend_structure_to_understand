import {
    admin,
    adminpassword,
    animalsNamesActivity,
    baseUrl,
    className,
    fruitsNamesActivity,
    fruitsNamesTopic,
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
import { getInputBoxByName, runCronJob } from '../../shared/pages/utils';

describe('Topic Domain Test Cases', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const myTopicName = `${newTopicName} Topic`;
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const domainName = `${generateFirstName()} ${generateLastName()} Domain`;
    const updatedDomainName = `Updated ${generateFirstName()} ${generateLastName()} Domain`;
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;
    const fruitsNamesTopicName = `${fruitsNamesTopic} ${generateLastName()}`;
    const fruitsNamesActivityName = `${fruitsNamesActivity} ${generateLastName()}`;

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
            }
        );
        runCronJob();
        loginPage.adminAndTeacherLogout();
    });

    it('Create a topic domain', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Domains').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Add Domain').click();
        getInputBoxByName('name').type(domainName);
        cy.get('#checkboxes-tags-demo').click();
        cy.get('#checkboxes-tags-demo-option-2').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('English').click();
        cy.get(`.MuiDialogActions-root`).contains('Add').click();
        cy.wait(2000, { log: false });
        cy.get('.domain_table > .tbody > .tr_row > .td').contains(domainName).should('exist');
    });

    it('Edit the topic domain', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Domains').click();
        cy.wait(2000, { log: false });
        cy.get('.domain_table > .tbody > .tr_row > .td')
            .contains(domainName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Edit').click();
        getInputBoxByName('name').clear().type(updatedDomainName);
        cy.get(`.MuiDialogActions-root`).contains('Edit').click();
        cy.wait(2000, { log: false });
        cy.get('body').click(0, 0);
        cy.get('.domain_table > .tbody > .tr_row > .td').contains(updatedDomainName).should('exist');
    });

    it('Delete the topic domain', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Domains').click();
        cy.wait(2000, { log: false });
        cy.get('.domain_table > .tbody > .tr_row > .td')
            .contains(updatedDomainName)
            .then((el) => {
                cy.wrap(el)
                    .parent()
                    .then((div) => {
                        cy.wrap(div).children().find('.material-icons:contains("more_horiz")').click();
                    });
            });
        cy.get('.MuiPaper-root > .MuiTypography-root').contains('Delete').click();
        cy.get(`.MuiDialogActions-root`).contains('Delete').click();
        cy.wait(2000, { log: false });
        cy.get('body').click(0, 0);
        cy.get('.domain_table > .tbody > .tr_row > .td').contains(updatedDomainName).should('not.exist');
    });

    it('Create a topic domain again', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Domains').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiButtonBase-root').contains('Add Domain').click();
        getInputBoxByName('name').type(updatedDomainName);
        cy.get('#checkboxes-tags-demo').click();
        cy.get('#checkboxes-tags-demo-option-2').click();
        cy.get('#demo-simple-select-outlined').click();
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('English').click();
        cy.get(`.MuiDialogActions-root`).contains('Add').click();
        cy.wait(2000, { log: false });
        cy.get('.domain_table > .tbody > .tr_row > .td').contains(updatedDomainName).should('exist');
    });

    it('Add the topic domain to a topic', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
        getInputBoxByName('teacherTopicName').clear().type(fruitsNamesTopicName);
        getInputBoxByName('domainAndYearGroupIds').click().type(updatedDomainName);
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(`.MuiButtonBase-root`).contains('Publish').click();
        cy.wait(3000, { log: false });
        cy.reload();
        cy.wait(3000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${fruitsNamesTopicName}`).click();
        cy.wait(3000, { log: false });
        cy.get(`.MuiTabs-flexContainer`).contains('Activities').click();
        cy.wait(3000, { log: false });
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add an activity').click();

        getInputBoxByName('name').type(fruitsNamesActivityName);
        cy.get(':nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Welcome');
        cy.get(':nth-child(4) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('1');
        cy.get(':nth-child(5) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type('Test');

        cy.get(`.MuiButtonBase-root`).contains('Add activity').click();
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(fruitsNamesTopicName).should('exist');
    });

    it('Check topic appears when you select the domain in the class schedule filter', () => {
        loginPage.login(schoolEmail, password);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list-container`).contains(myClassName).click();
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Schedule').click();
        cy.wait(2000, { log: false });
        cy.get(':nth-child(1) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type('Year 1');
        cy.get('#checkboxes-tags-demo-listbox li').contains('Year 1').click();
        cy.wait(5000, { log: false });
        cy.get('body').then((body) => {
            if (body.find('.MuiChip-root > .MuiChip-label:contains("English")').length === 0) {
                cy.get(':nth-child(2) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
                    .click()
                    .type('English');
                cy.get('#checkboxes-tags-demo-listbox li').contains('English').click();
                cy.wait(5000, { log: false });
            }
        });
        cy.get(':nth-child(3) > .root > .MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo')
            .click()
            .type(updatedDomainName);
        cy.get('#checkboxes-tags-demo-listbox li').contains(updatedDomainName).click();
        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.wait(2000, { log: false });
        cy.get(
            '.schedule > .schedule-topic-cards > .MuiGrid-root > .topic-summary-card-container > .topic-summary-content-section > .heading-three'
        )
            .contains(fruitsNamesTopicName)
            .should('exist');
    });
});
