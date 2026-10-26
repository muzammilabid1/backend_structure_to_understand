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
    schoolLeader,
    schoolName
} from '../../shared/constants';
import { addSchoolAndClassAndPupilWithMutation } from '../../shared/pages/addNewPupilInNewSchool';
import { loginPage } from '../../shared/pages/login';
import { getInputBoxByName, runCronJob } from '../../shared/pages/utils';

describe('Topic release to selected schools by admin', () => {
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
    const topicName1 = `Topic ${generateLastName()}`;
    const subjectName1 = `${generateFirstName()} subject`;
    const topicDomainName1 = `${subjectName1} domain`;

    const topicName2 = `Topic ${generateLastName()}`;
    const subjectName2 = `${generateFirstName()} subject`;
    const topicDomainName2 = `${subjectName2} domain`;

    const schoolTagName = `School Tag ${generateLastName()}`;
    const yearGroup = 'Year 1';

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

    it('Add school tags and assign them to school', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Tags').click();
        cy.get('.MuiButtonBase-root').contains('Schools').click();
        cy.get('.MuiButtonBase-root').contains('Add a Tag').click();

        cy.get('#checkboxes-tags-demo').click().type(mySchoolName);

        cy.get('#checkboxes-tags-demo-option-0').click();

        getInputBoxByName('name').clear().type(schoolTagName);

        cy.get(`.MuiButtonBase-root`).contains('Save').click();

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

    it('Add a topic in Draft state', () => {
        loginPage.login(admin, adminpassword);

        addSubjectAndDomainForTopic(subjectName1, topicDomainName1, yearGroup);

        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
        getInputBoxByName('teacherTopicName').clear().type(topicName1);
        getInputBoxByName('domainAndYearGroupIds').click().clear().type(topicDomainName1);
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(`.MuiButtonBase-root`).contains('Save draft').click();
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').should('not.contain', topicName1);
        getInputBoxByName('topicStatus').click().type('Draft');
        cy.get('#checkboxes-tags-demo-option-0').click();
        cy.get(`.MuiButtonBase-root`).contains('Apply').click();
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${topicName1}`).first().click();
        getInputBoxByName('isDemo').check();
        cy.get(`.MuiButtonBase-root`).contains('Save draft').click();
        cy.get('a').contains('Preview topic demo').click();
        cy.get('.typography-text').contains(topicName1);
    });

    it('Draft topics filter should not be available for school', () => {
        loginPage.login(schoolLeader, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Set a topic').click();
        getInputBoxByName('year').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(yearGroup).click();

        getInputBoxByName('subjects').click().type(subjectName1);
        cy.get('#checkboxes-tags-demo-option-0').should('not.exist');
        cy.get('body').click(0, 0);

        getInputBoxByName('search').type(topicName1);

        cy.get(`.MuiButtonBase-root`).contains('Search').click();
        cy.get('.typography-text').contains('No search results found');
    });

    it('Publish a topic and make sure it can be seen by teacher of school', () => {
        loginPage.login(admin, adminpassword);
        cy.get(`.sidebar-options-list`).contains('Topics').click();

        getInputBoxByName('topicStatus').click().type('Draft');

        cy.get('#checkboxes-tags-demo-option-0').click();

        cy.get(`.MuiButtonBase-root`).contains('Apply').click();

        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${topicName1}`).first().click();

        cy.get(`.MuiButtonBase-root`).contains('Publish').click();

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolLeader, adminpassword);

        cy.get(`.sidebar-options-list`).contains('Set a topic').click();

        getInputBoxByName('year').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(yearGroup).click();

        getInputBoxByName('subjects').click().type(subjectName1);
        cy.get('#checkboxes-tags-demo-option-0').click();
        getInputBoxByName('search').type(topicName1);
        cy.get(`.MuiButtonBase-root`).contains('Search').click();

        cy.get('.schedule-topic-cards > .MuiGrid-root > .topic-summary-card-container > .topic-summary-content-section > .heading-three')
            .contains(topicName1)
            .should('exist');
    });

    it('Make the topic limited release and make sure only correct school can see that topic and other schools cannot', () => {
        loginPage.login(admin, adminpassword);

        addSubjectAndDomainForTopic(subjectName2, topicDomainName2, yearGroup);

        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
        getInputBoxByName('teacherTopicName').clear().type(topicName2);

        getInputBoxByName('domainAndYearGroupIds').click().clear().type(topicDomainName2);

        cy.get('#checkboxes-tags-demo-option-0').click();

        getInputBoxByName('limitedRelease').check();

        getInputBoxByName('schoolTags').click().clear().type(schoolTagName);

        cy.get('#checkboxes-tags-demo-option-0').click();

        cy.get(`.MuiButtonBase-root`).contains('Publish').click();

        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(`${topicName2}`);

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolLeader, adminpassword);

        cy.get(`.sidebar-options-list`).contains('Set a topic').click();

        getInputBoxByName('year').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(yearGroup).click();

        getInputBoxByName('subjects').click().type(subjectName2);
        cy.get('#checkboxes-tags-demo-option-0').should('not.exist');
        cy.get('body').click(0, 0);

        getInputBoxByName('search').type(topicName2);
        cy.get(`.MuiButtonBase-root`).contains('Search').click();

        cy.get('.typography-text').contains('No search results found');

        loginPage.adminAndTeacherLogout();

        loginPage.login(schoolEmail, password);

        cy.get(`.sidebar-options-list`).contains('Set a topic').click();

        getInputBoxByName('year').click();
        cy.get('#checkboxes-tags-demo-listbox li').contains(yearGroup).click();

        getInputBoxByName('subjects').click().type(subjectName2);
        cy.get('#checkboxes-tags-demo-option-0').click();

        getInputBoxByName('search').type(topicName2);
        cy.get(`.MuiButtonBase-root`).contains('Search').click();

        cy.get('.schedule-topic-cards > .MuiGrid-root > .topic-summary-card-container > .topic-summary-content-section > .heading-three')
            .contains(topicName2)
            .should('exist');
    });
});

/**
 * @param {string} subject
 * @param {string} topicDomain
 * @param {string} yearGroup
 *
 */
const addSubjectAndDomainForTopic = (subject, topicDomain, yearGroup) => {
    cy.get(`.sidebar-options-list`).contains('Subjects').click();
    cy.get('.MuiButtonBase-root').contains('Add subject').click();
    getInputBoxByName('name').type(subject);
    cy.get('div[data-test="subject-programme-type-select"] #demo-simple-select-outlined').click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Full programme').click();
    cy.get(`.MuiDialogActions-root`).contains('Add').click();
    cy.get('.domain_table > .tbody > .tr_row > .td').contains(subject).should('exist');

    cy.get(`.sidebar-options-list`).contains('Domains').click();
    cy.get('.MuiButtonBase-root').contains('Add Domain').click();
    getInputBoxByName('name').type(topicDomain);

    cy.get('#checkboxes-tags-demo').click().type(yearGroup);
    cy.get('#checkboxes-tags-demo-option-0').click();
    cy.get('#demo-simple-select-outlined').click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(subject).click();
    cy.get(`.MuiDialogActions-root`).contains('Add').click();
    cy.get('.domain_table > .tbody > .tr_row > .td').contains(topicDomain).should('exist');
};
