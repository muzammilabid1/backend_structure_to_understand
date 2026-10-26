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
import { getInputBoxByName, goToParentDetailsFromAdminSide, runCronJob } from '../../shared/pages/utils';

describe('Parent friendly topic names test cases', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const teacherTopicName = `Teacher ${newTopicName} Topic`;
    const parentTopicName = `Parent ${newTopicName} Topic`;
    const schoolEmail = generateSchoolEmail();
    const parentEmailForInvitation = generateParentEmail();
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const nameForChildren = `Mr ${leaderFirstName}`;
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;
    let topicUrl = null;

    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });
    it('Add test data and release topic', () => {
        addSchoolAndClassAndPupilWithMutation(
            mySchoolName,
            myClassName,
            teacherTopicName,
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
                nameForChildren
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
    it('parentTopicName should show on topics page', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(teacherTopicName).first().click();
        cy.wait(2000, { log: false });
        getInputBoxByName('parentTopicName').clear().type(parentTopicName);
        getInputBoxByName('isDemo').check().should('be.checked');
        cy.get(`.MuiButtonBase-root`).contains('Update details').click();
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains(parentTopicName).should('exist');
    });
    it('parentTopicName should show on pupil topic page', () => {
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains(parentTopicName).click();
        cy.wait(2000, { log: false });
        cy.get('.mathscot-with-bubble-text > .heading-one').contains(parentTopicName).should('exist');
    });

    it('parentTopicName should show on demo topic', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(teacherTopicName).first().click();
        cy.wait(2000, { log: false });
        cy.get('.topic_details > a').click();
        cy.wait(2000, { log: false });
        cy.get('.mathscot-with-bubble-text > .heading-one').contains(parentTopicName).should('exist');
        cy.url().then((url) => {
            topicUrl = url;
        });
    });

    it('parentTopicName should show on preview topic', () => {
        cy.wait(2000, { log: false });
        cy.visit(topicUrl?.replace(/\/topicdemo\//, '/previewtopic/'));
        cy.wait(2000, { log: false });
        cy.get('.mathscot-with-bubble-text > .heading-one').contains(parentTopicName).should('exist');
    });
    it('teacherTopicName should show on topics page if parentTopicName is not available', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(teacherTopicName).first().click();
        cy.wait(2000, { log: false });
        getInputBoxByName('parentTopicName').clear();
        cy.get(`.MuiButtonBase-root`).contains('Update details').click();
        cy.wait(2000, { log: false });
        loginPage.adminAndTeacherLogout();
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains(teacherTopicName).should('exist');
    });
    it('teacherTopicName should show on pupil topic page if parentTopicName is not available', () => {
        loginPage.login(parentEmailForInvitation, password);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get(`.child-card-footer-contanier`).contains(teacherTopicName).click();
        cy.wait(2000, { log: false });
        cy.get('.mathscot-with-bubble-text > .heading-one').contains(teacherTopicName).should('exist');
    });

    it('teacherTopicName should show on demo topic page if parentTopicName is not available', () => {
        loginPage.login(admin, adminpassword);
        cy.wait(2000, { log: false });
        cy.get(`.sidebar-options-list`).contains('Topics').click();
        cy.wait(2000, { log: false });
        cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(teacherTopicName).first().click();
        cy.wait(2000, { log: false });
        cy.get('.topic_details > a').click();
        cy.wait(2000, { log: false });
        cy.get('.mathscot-with-bubble-text > .heading-one').contains(teacherTopicName).should('exist');
    });

    it('teacherTopicName should show on preview topic page if parentTopicName is not available', () => {
        cy.wait(2000, { log: false });
        cy.visit(topicUrl?.replace(/\/topicdemo\//, '/previewtopic/'));
        cy.wait(2000, { log: false });
        cy.get('.mathscot-with-bubble-text > .heading-one').contains(teacherTopicName).should('exist');
    });

    it('teacherTopicName should show on TOPICNAME parameter of parent topic email if parentTopicName is not available', () => {
        loginPage.login(admin, adminpassword);
        goToParentDetailsFromAdminSide(mySchoolName, myClassName, `${firstName} ${lastName}`, `${parentFirstName} ${parentLastName}`);
        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.contains('.table_main .tr_row .td', `Send Pupil Topics`).then((el) => {
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
                    TOPICNAME: teacherTopicName,
                    CLASS: myClassName,
                    SCHOOL: mySchoolName,
                    FIRSTNAME: parentFirstName,
                    LASTNAME: parentLastName,
                    CHILDFIRSTNAME: firstName,
                    CHILDLASTNAME: lastName,
                    TEACHERALIAS: nameForChildren
                });
            });
    });
});
