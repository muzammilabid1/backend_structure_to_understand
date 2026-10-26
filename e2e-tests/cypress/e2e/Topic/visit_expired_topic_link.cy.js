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
    NotificationType,
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
    expireMagicLinkByToken,
    getTextAreaBoxByName,
    goToParentDetailsFromAdminSide,
    releaseTopicsUpToADate,
    runCronJob
} from '../../shared/pages/utils';

describe('Expired magic link functionality for topic', () => {
    const mySchoolName = `${schoolName} School`;
    const myClassName = `${className} Class`;
    const schoolEmail = generateSchoolEmail();
    const teacherEmail = generateTeacherEmail();
    const parentEmailForInvitation = generateParentEmail();
    const pupilFirstName = generateFirstName();
    const pupilLastName = generateLastName();
    const myTopicName = `${newTopicName} Topic`;
    const activity_one = `${fruitsNamesActivity} ${generateLastName()}`;
    const activity_two = `${animalsNamesActivity} ${generateLastName()}`;
    const activity_third = `${playingGameActivity} ${generateLastName()}`;
    const readingTarget = 4;
    let expiredMagicLinkUrl;

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
                firstName: pupilFirstName,
                lastName: pupilLastName,
                parentFirstName,
                parentLastName,
                parentEmailForInvitation
            },
            true,
            true,
            readingTarget,
            {
                firstname: teacherFirstname,
                lastname: teacherLastname,
                email: teacherEmail,
                nameForChildren: `Mr ${teacherFirstname}`,
                sendInvite: true
            }
        );
        runCronJob();
        releaseTopicsUpToADate(null, false);
        loginPage.adminAndTeacherLogout();
    });

    it('Should expire magic link, prompt user for a new link, and send updated magic link ', () => {
        loginPage.login(admin, adminpassword);

        goToParentDetailsFromAdminSide(
            mySchoolName,
            className,
            `${pupilFirstName} ${pupilLastName}`,
            `${parentFirstName} ${parentLastName}`
        );

        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });

        cy.contains('.table_main .tr_row .td', NotificationType.READING).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });

        getTextAreaBoxByName('params').then(($span) => {
            const text = $span.text();
            const magicId = JSON.parse(text)?.MAGICID;

            expiredMagicLinkUrl = `${baseUrl}magic/${magicId}`;

            expireMagicLinkByToken(magicId);

            cy.get('.MuiButton-root').contains('Cancel').click();
            loginPage.adminAndTeacherLogout();
            cy.visit(expiredMagicLinkUrl);
            cy.wait(2000, { log: false });
            cy.get('.common_status_container > .paragraph').should(
                'have.text',
                'We have sent you another message with a new link. Please check your messages.'
            );
        });
    });

    it('Should verify that a new magic link is resent to parent upon accessing expired link', () => {
        loginPage.login(admin, adminpassword);

        goToParentDetailsFromAdminSide(
            mySchoolName,
            className,
            `${pupilFirstName} ${pupilLastName}`,
            `${parentFirstName} ${parentLastName}`
        );

        cy.wait(2000, { log: false });
        cy.get('.MuiTabs-flexContainer').contains('Notifications').click();
        cy.wait(2000, { log: false });

        cy.contains('.table_main .tr_row .td', `Updated Magic Link`).then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
                });
        });

        getTextAreaBoxByName('params')
            .invoke('val')
            .then((paramsValue) => {
                const text = paramsValue.toString();

                const topicParameters = JSON.parse(text);

                expect(topicParameters).to.include({
                    TARGET_URL: expiredMagicLinkUrl,
                    TARGET: readingTarget
                });
            });
    });
});
