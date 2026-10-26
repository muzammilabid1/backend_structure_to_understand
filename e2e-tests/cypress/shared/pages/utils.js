import {
    ACCESS_TOKEN_COOKIE,
    admin,
    adminpassword,
    baseUrl,
    graphqlEndpoint,
    password,
    releaseDate,
    socialLoginGoogle
} from '../constants';
import { loginPage } from './login';

/**
 * @param {string} name
 */
export const getInputBoxByName = (name) => cy.get(`input[name="${name}"]`);
export const getTextAreaBoxByName = (name) => cy.get(`textarea[name="${name}"]`);
export const getEmailBox = () => cy.get('input[name="email"]');
export const getRepeatEmailBox = () => cy.get('input[name="repeatEmail"]');
export const getPasswordBox = () => cy.get('input[name="password"]');
export const getRepeatPasswordBox = () => cy.get('input[name="repeatPassword"]');
export const getNumberBox = () => cy.get('input[name="phoneNumber"]');
export const getCheckBox = () => cy.get('.MuiFormControlLabel-root > .MuiTypography-root > .paragraph');

export const getSubmitButton = () => cy.get('button[type="submit"]');
export const getAlertBox = () => cy.get('.dialog-content-section');
// export const getAlertBoxClose = () => cy.get('.MuiAlert-message').click();
export const getModalCancelButton = () => cy.get('.modal-content').contains('Cancel').first();
export const getDialogContainer = () => cy.get('.MuiDialog-container');
export const getDialogCancelButton = () => cy.get('.MuiDialogContent-root').contains('Cancel').first();

export const getFirstNameBox = () => getInputBoxByName('firstname');
export const getLastNameBox = () => getInputBoxByName('lastname');
export const getNameUsedByChild = () => getInputBoxByName('nameForChildren');

/**
 * @param {boolean} unlockActivity
 * @param {string} buttonText
 *
 */

export const watchVideoAndUnlockActivities = (unlockActivity = true, buttonText = 'Unlock activities') => {
    cy.wait(5000, { log: false });
    cy.get('body').then((body) => {
        if (body.find('.play-icon').length > 0) {
            cy.get('.play-icon').then((btn) => {
                cy.wrap(btn).click();
                cy.wait(2000, { log: false });
            });
        } else {
            cy.log('No Video On Topic');
        }

        if (unlockActivity) {
            cy.wait(2000, { log: false });
            cy.get('.MuiButtonBase-root')
                .contains(buttonText)
                .then(($button) => {
                    if ($button.length) {
                        cy.wrap($button).click();
                        cy.wait(2000, { log: false });
                    } else {
                        cy.log('Unlock activities button not found');
                    }
                });
        }
    });
};

export const getActivityPermissions = () => {
    cy.wait(2000, { log: false });
    cy.get('body').then((body) => {
        if (body.find('.demo-activity-photo-permission-card').length > 0) {
            cy.get('.demo-activity-photo-permission-card .checkbox-container > .MuiTypography-root > .paragraph').first().click();
        } else {
            cy.get('.update-link').click();
        }
    });
};

/**
 * @param {string} familyComment
 * @param {string} childComment
 *
 */

export const submitPupilFeedback = (familyComment = 'Test commments', childComment = 'Test pupil comments') => {
    cy.wait(7000, { log: false });
    cy.get('body').then((body) => {
        let isModal = false;

        if (body.find('.pupil-activity-feedbacks-section').length > 0) {
            cy.get(`.MuiButtonBase-root`).contains('Add comments/photos').click();
            isModal = true;
        }

        cy.get(
            ':nth-child(1) > .MuiPaper-root > .comment-card-left-sec > .MuiGrid-root > .MuiFormControl-root > .MuiInputBase-root > .MuiOutlinedInput-input'
        )
            .first()
            .clear({ force: true })
            .type(familyComment);
        cy.get(
            ':nth-child(2) > .MuiPaper-root > .comment-card-left-sec > .MuiGrid-root > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input'
        )
            .first()
            .clear({ force: true })
            .type(childComment);

        let filepath = 'dp.jpg';

        cy.get('input[type="file"]').attachFile(filepath);
        cy.wait(2000, { log: false });
        cy.get(`.MuiButtonBase-root`).contains('Save changes').click();
        cy.wait(2000, { log: false });
        getActivityPermissions();
        if (isModal) {
            cy.get('.MuiDialogActions-root > .lwp-button-wrapper > .MuiButton-root').contains('Save').click({ force: true });
        } else {
            cy.get('.MuiButton-root').contains('Save comments').click({ force: true });
        }

        cy.wait(5000, { log: false });
    });
};

/**
 * @param {string} bookName
 * @param {string} comment
 * @param {boolean} includeInReadingTarget
 *
 */

export const submitTeacherReadingFeedback = (bookName = 'Harry Potter', comment = 'Best book ever', includeInReadingTarget = false) => {
    // const imageFile = 'Winter_11.png';

    cy.wait(2000, { log: false });

    cy.get(
        '.hide-on-mobile > .slider-parent > .slick-slider > .slick-list > .slick-track > .slick-current > :nth-child(1) > .item > .material-icons'
    ).click();

    cy.get('body').then((body) => {
        if (body.find('[data-test=dialog-title-heading]').length > 0) {
            cy.get('[data-test="dialog-cancel-btn"]').click();
        }

        cy.wait(2000, { log: false });
        getInputBoxByName('bookName').type(bookName);
        cy.get(':nth-child(1) > .MuiRadio-root > .PrivateSwitchBase-input').click();
        if (includeInReadingTarget) getInputBoxByName('includeInReadingTarget').check().should('be.checked');
        cy.get('.readinglog-input-card-image-text > .heading-two').contains('Comment').click();
        cy.get('.readinglog-input-card-image-text > .heading-two').contains('Record an audio clip').click();
        cy.get('textarea[name="comments"]').type(comment);
        cy.get('.MuiButton-root').contains('Record audio').click();
        cy.wait(6000, { log: false });
        cy.get('.MuiButton-root').contains('Stop recording').click();
        cy.wait(3000, { log: false });

        cy.get('.MuiButton-root').contains('Add reading log').click();
        cy.wait(3000, { log: false });
    });
};

/**
 * @param {string} bookName
 * @param {string} comment
 * @param {number} dayOfWeek The day of the week to submit feedback on. Defaults to -1, which resolves to today.
 *
 */

export const submitParentReadingFeedback = (bookName = 'Harry Potter', comment = 'Best book ever', dayOfWeek = -1) => {
    // const imageFile = 'Winter_11.png';

    cy.wait(2000, { log: false });

    if (dayOfWeek === -1) {
        cy.get(
            '.hide-on-mobile > .slider-parent > .slick-slider > .slick-list > .slick-track > .slick-current > :nth-child(1) > .item > .material-icons'
        )
            .first()
            .click();
    } else {
        cy.get(
            `.hide-on-mobile > .slider-parent > .slick-slider > .slick-list > .slick-track > [data-index="${
                dayOfWeek - 1
            }"] > :nth-child(1) > .item > .material-icons`
        )
            .first()
            .click();
    }

    cy.get('body').then((body) => {
        if (body.find('[data-test=dialog-title-heading]').length > 0) {
            cy.get('[data-test="dialog-cancel-btn"]').click();
        }

        cy.wait(2000, { log: false });
        cy.get('[data-test="read-aloud-card"]').first().click();
        cy.get('[data-test="school-book-card"]').first().click();
        cy.get('.MuiOutlinedInput-root').first().type(bookName);
        cy.get('input[name="finishedBook"]').first().check({ force: true });
        cy.get('.readinglog-input-card-image-text > .heading-one').contains('Comment').click();
        cy.get('.readinglog-input-card-image-text > .heading-one').contains('Audio').click();
        cy.get('.MuiOutlinedInput-root').last().type(comment);
        cy.get('.MuiButton-root').contains('Record audio').click();
        cy.wait(6000, { log: false });
        cy.get('.MuiButton-root').contains('Stop recording').click();
        cy.wait(3000, { log: false });
        getInputBoxByName('shareWithTeacher').check({ force: true }).should('be.checked');

        cy.get('.MuiButton-root').contains('Add reading log').click();
        cy.wait(3000, { log: false });
    });
};

/**
 * @param {string} familyComment
 * @param {string} childComment
 *
 */

export const editFeedbackAndCompare = (familyComment = 'New test commments', childComment = 'New test pupil comments') => {
    cy.wait(2000, { log: false });
    // cy.get('[data-testid="CreateIcon"]').first().click();
    cy.get('.activity-feed-edit-container .material-icons').first().click();
    cy.get(
        ':nth-child(1) > .MuiPaper-root > .comment-card-left-sec > .MuiGrid-root > .MuiFormControl-root > .MuiInputBase-root > .MuiOutlinedInput-input'
    )
        .first()
        .clear({ force: true })
        .type(familyComment);
    cy.get(
        ':nth-child(2) > .MuiPaper-root > .comment-card-left-sec > .MuiGrid-root > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input'
    )
        .first()
        .clear({ force: true })
        .type(childComment);
    cy.get('.MuiButtonBase-root').contains('Save').click({ force: true });
    cy.wait(2000, { log: false });
    cy.get('.MuiAccordionSummary-expandIconWrapper').first().click();

    cy.contains('.activity-feed-comment-section > .activity-feed-card .heading-one', 'Family comment').then((el) => {
        cy.wrap(el)
            .parent()
            .then((div) => {
                cy.wrap(div).find('.paragraph').contains(familyComment);
            });
    });

    cy.contains('.activity-feed-comment-section > .activity-feed-card .heading-one', 'Child comment').then((el) => {
        cy.wrap(el)
            .parent()
            .then((div) => {
                cy.wrap(div).find('.paragraph').contains(childComment);
            });
    });
};

export const runCronJobWithoutLogin = (dataValue = 'sendReleasedPupilTopicNotifications') => {
    cy.wait(5000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Run tasks').click();
    cy.wait(2000, { log: false });
    cy.get('#demo-simple-select-outlined').click();
    cy.get(`[data-value="${dataValue}"]`).click();
    cy.get('.MuiButton-root').contains('Run Cron Job').click();
};

/**
 * @param {string} dataValue
 * @param {boolean} login
 *

 *
 */

export const runCronJob = (dataValue = 'sendReleasedPupilTopicNotifications', login = true) => {
    if (login) loginPage.login(admin, adminpassword);
    cy.get('.side-drawer-arrow > .material-icons').click();
    cy.get(`.sidebar-options-list`).contains('Run tasks').click();
    cy.get('#demo-simple-select-outlined').click();
    cy.get(`[data-value="${dataValue}"]`).click();
    cy.get('.MuiButton-root').contains('Run Cron Job').click();
};

/**
 * @param {string} date
 * @param {boolean} login
 *

 *
 */

export const releaseTopicsUpToADate = (date = null, login = true) => {
    const topicReleaseDate = date ? date : getFutureDate(0);

    if (login) loginPage.login(admin, adminpassword);
    cy.get(`.sidebar-options-list`).contains('Run tasks').click();
    getInputBoxByName('date').type(topicReleaseDate);
    cy.get('.MuiButton-root').contains('Release topics').click();
};

/**
 * @param {string} title
 * @param {number} nthColor
 * @param {number} nthBorder
 *

 *
 */

export const createSticker = (title, nthColor = 3, nthBorder = 5) => {
    cy.get('.MuiButtonBase-root').contains('Add sticker').click();
    cy.wait(2000, { log: false });
    getInputBoxByName('title').type(title);
    cy.get('[data-test="text-colors"]').eq(nthColor).click();
    cy.get('[data-test="border-colors"]').eq(nthBorder).click();
    cy.get('[data-test="Character-item-image"]').first().click();
    cy.get('[data-test="Item-item-image"]').first().click();
    cy.get('.MuiButtonBase-root').contains('Add').click();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} date
 * @param {string} dataValue
 * @param {boolean} login
 *

 *
 */

export const sendReminderEmailFromAdminSide = (date, dataValue, login = true) => {
    if (login) loginPage.login(admin, adminpassword);
    cy.wait(5000, { log: false });
    cy.get('.side-drawer-arrow > .material-icons').click();
    cy.get(`.sidebar-options-list`).contains('Run tasks').click();
    cy.wait(2000, { log: false });
    cy.get(
        '.schedule-cron-job > .text-fields > .MuiGrid-grid-md-12 > .MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined'
    ).click();
    cy.get(`[data-value="${dataValue}"]`).click();
    cy.get('.schedule-cron-job > .text-fields > .MuiGrid-grid-xs-12 > .MuiFormControl-root > .MuiInputBase-root').click().type(date);
    cy.get('.MuiButton-root').contains('Send reminder email').click();
    cy.wait(2000, { log: false });
};

export const releasePupilTopicsFromAdminSide = () => {
    cy.wait(5000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Run tasks').click();

    cy.wait(2000, { log: false });
    cy.get('.MuiInputAdornment-root > .MuiButtonBase-root').first().click();
    cy.get('.MuiButtonBase-root.MuiPickersDay-root').contains(releaseDate).click();
    cy.get(`.MuiButtonBase-root`).contains('Release topics').click();
    cy.wait(3000, { log: false });
};

export const choosePupilMathscot = () => {
    cy.get(`.MuiButtonBase-root`).contains('Choose new Mathscot').click();
    cy.wait(5000, { log: false });
    cy.get('.MuiGrid-container > :nth-child(2) > .MuiPaper-root').click();
    cy.get('.MuiGrid-container > :nth-child(5) > .MuiPaper-root').click();
    cy.get('.MuiGrid-container > :nth-child(7) > .MuiPaper-root').click();
    cy.get(`.MuiButtonBase-root`).contains('Create my new mathscot').click();
    cy.get(`.MuiButtonBase-root`).contains('Confirm').click();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} schoolName
 * @param {string} className
 * @param {string} pupilName
 * @param {string} parentName
 *

 *
 */

export const signUpParent = (schoolName, className, pupilName, parentName) => {
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid=school-details-link]').contains(schoolName).should('exist').click();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer').contains('Classes').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(pupilName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(parentName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiButtonBase-root').contains('Re-Invite Parent').click();
    cy.wait(2000, { log: false });
    cy.reload();
    cy.wait(2000, { log: false });
    cy.get(`.MuiTabs-flexContainer`).contains('Notifications').click();
    cy.wait(2000, { log: false });
    cy.contains('.table_main .tr_row .td', 'User Requested Signup Link Email').then((el) => {
        cy.wrap(el)
            .parent()
            .then((div) => {
                cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
            });
    });
    cy.wait(2000, { log: false });
    cy.get(':nth-child(4) > .undefined > .MuiOutlinedInput-root > [aria-invalid="false"]').then(($span) => {
        const text = $span.text();
        const parsed = JSON.parse(text);
        const magicLink = `${parsed?.['BASEURL']}/magic/${parsed?.['MAGICID']}`;

        cy.log('magicLink', magicLink);
        cy.get('.MuiButton-root').contains('Cancel').click();
        loginPage.adminAndTeacherLogout();
        cy.wait(5000, { log: false });
        cy.visit(magicLink);
        cy.wait(5000, { log: false });
        cy.get('.MuiButton-root').contains('Continue to set password').click();
        cy.wait(3000, { log: false });
        getInputBoxByName('password').type(password);
        getInputBoxByName('repeatPassword').type(password);
        getInputBoxByName('policy').check();
        cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
        cy.wait(3000, { log: false });
    });
};

/**
 * @param {string} schoolName
 * @param {string} teacherName
 *

 *
 */

export const gotoTeacherDetailsPageFromAdminSide = (schoolName, teacherName) => {
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.get('[data-testid=school-details-link]').contains(schoolName).should('exist').click();
    cy.get(`.MuiTabs-flexContainer`).contains('Staff').click();
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(teacherName).dblclick();
};
/**
 * @param {string} schoolName
 * @param {string} teacherName
 * @param {string} password
 * @param {boolean} onlyVisit
 *

 *
 */

export const signUpSchoolTeacher = (schoolName, teacherName, password, onlyVisit = false, isSchoolleader = true) => {
    gotoTeacherDetailsPageFromAdminSide(schoolName, teacherName);
    cy.get(`.MuiTabs-flexContainer`).contains('Notifications').click();
    cy.wait(2000, { log: false });
    cy.contains('.table_main .tr_row .td', isSchoolleader ? 'School Leader Invitation Email' : 'Teacher Invitation Email').then((el) => {
        cy.wrap(el)
            .parent()
            .then((div) => {
                cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
            });
    });
    cy.get(':nth-child(4) > .undefined > .MuiOutlinedInput-root > [aria-invalid="false"]').then(($span) => {
        const text = $span.text();
        const parsed = JSON.parse(text);
        const magicLink = `${parsed?.['BASEURL']}/magic/${parsed?.['MAGICID']}`;

        cy.log('magicLink', magicLink);
        cy.get('.MuiButton-root').contains('Cancel').click();
        loginPage.adminAndTeacherLogout();
        cy.visit(magicLink);
        if (onlyVisit) return;
        cy.get('.MuiButton-root').contains('Continue to set password').click();
        getInputBoxByName('password').type(password);
        getInputBoxByName('repeatPassword').type(password);
        getInputBoxByName('policy').check();
        cy.get(`.MuiButtonBase-root`).contains('Create an account').click();
        acceptFeatureTooltipPrompt();
    });
};

/**
 * @param {string} schoolName
 * @param {string} className
 * @param {string} pupilName
 * @param {string} parentName
 * @param {string} notificationType
 * @param {string} link
 *

 *
 */

export const visitMagicLinkUrlOfParent = (
    schoolName,
    className,
    pupilName,
    parentName,
    notificationType = 'Send Pupil Topics',
    link = 'MAGICID'
) => {
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer').contains('Classes').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(pupilName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(parentName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(4)').click();
    cy.wait(2000, { log: false });
    cy.contains('.table_main .tr_row .td', notificationType).then((el) => {
        cy.wrap(el)
            .parent()
            .then((div) => {
                cy.wrap(div).children().find('.material-icons:contains("visibility")').click();
            });
    });
    cy.wait(2000, { log: false });
    cy.get(':nth-child(4) > .undefined > .MuiOutlinedInput-root > [aria-invalid="false"]').then(($span) => {
        const text = $span.text();
        const magicLink = JSON.parse(text)?.[link];

        cy.log('magicLink', magicLink);
        cy.get('.MuiButton-root').contains('Cancel').click();
        loginPage.adminAndTeacherLogout();
        cy.wait(5000, { log: false });
        cy.visit(`${baseUrl}magic/${magicLink}`);
        cy.wait(5000, { log: false });
        acceptMultiChildPrompt();
    });
};

/**
 * @param {string} schoolName
 * @param {string} className
 * @param {string} pupilName
 * @param {string} parentName

 *
 */

export const visitNotificationsTabOfParent = (schoolName, className, pupilName, parentName) => {
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer').contains('Classes').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(pupilName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(parentName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(4)').click();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} schoolName
 * @param {string} allowFor

 *
 */

export const allowSocialLoginForSchool = (schoolName, allowFor) => {
    loginPage.login(admin, adminpassword);
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
    cy.wait(2000, { log: false });
    getInputBoxByName(allowFor).check().should('be.checked');
    cy.get('.MuiButton-root').contains('Save changes').click();
    cy.wait(2000, { log: false });
    loginPage.adminAndTeacherLogout();
};
/**
 * @param {string} allowFor
 * @param {boolean} login

 *
 */

export const allowSocialLoginForParent = (allowFor, login = true) => {
    if (login) loginPage.login(admin, adminpassword);
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Site parameters').click();
    cy.wait(2000, { log: false });
    cy.get(
        `:nth-child(9) > .MuiPaper-root > :nth-child(${
            allowFor === socialLoginGoogle ? 4 : 5
        }) > .MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined`
    ).click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('true').click();
    cy.get(':nth-child(9) > .MuiPaper-root > .lwp-button-wrapper > .MuiButton-root').click();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} schoolName
 * @param {string} className
 * @param {string} pupilName

 *
 */

export const goToPupilDetailsFromAdminSide = (schoolName, className, pupilName) => {
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer').contains('Classes').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(pupilName).dblclick();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} schoolName
 * @param {string} className
 * @param {string} pupilName
 * @param {string} parentName

 *
 */

export const goToParentDetailsFromAdminSide = (schoolName, className, pupilName, parentName) => {
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer').contains('Classes').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(pupilName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer > :nth-child(1)').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph').contains(parentName).dblclick();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} schoolName
 * @param {string} className

 *
 */

export const goToClassDetailsFromAdminSide = (schoolName, className) => {
    cy.wait(2000, { log: false });
    cy.get(`.sidebar-options-list`).contains('Schools').click();
    cy.wait(2000, { log: false });
    cy.get('[data-testid="school-details-link"]').contains(schoolName).dblclick();
    cy.wait(2000, { log: false });
    cy.get('.MuiTabs-flexContainer').contains('Classes').click();
    cy.wait(2000, { log: false });
    cy.get('.table_main > .table > .tbody > .tr_row > .td > a > .paragraph > .programme-info-alert-container > .paragraph')
        .contains(className)
        .dblclick();
    cy.wait(2000, { log: false });
};

/**
 * @param {boolean} shouldAcceptInvitation
 *
 */

export const acceptPupilInvitation = (shouldAcceptInvitation = true) => {
    cy.wait(2000, { log: false });

    cy.get('.MuiButton-root').each(($button) => {
        const buttonText = $button.text();

        if (buttonText === 'Get started' || buttonText === 'Let’s go') {
            if (!shouldAcceptInvitation) return;
            getInputBoxByName('policy').check().should('be.checked');
            cy.wait(2000, { log: false });
            cy.wrap($button).click();
            cy.wait(2000, { log: false });

            return;
        } else if (buttonText === 'Next') {
            cy.wrap($button).click();
            cy.wait(2000, { log: false });

            acceptPupilInvitation(shouldAcceptInvitation);
        }

        return;
    });
};

/**
 * @param {string} className
 * @param {boolean} setDifferentTopicsForGroup
 * @param {string} mainTeacherName
 *
 */

export const addClassGroup = (
    className,
    setDifferentTopicsForGroup = true,
    mainTeacherName = null,
    pupilName = null,
    subjectName = null
) => {
    cy.get(`.sidebar-options-list-container`).contains(className).click();
    cy.get(`.MuiTabs-flexContainer`).contains('Class groups').click();
    cy.get('.MuiButtonBase-root').contains('Create a group').click();
    getInputBoxByName('groupName').type(`${className} Group`);

    if (subjectName) {
        cy.get('div[data-test="class-group-subjects-select"] #checkboxes-tags-demo').first().click().type(subjectName);
    } else {
        cy.get('div[data-test="class-group-subjects-select"] #checkboxes-tags-demo').first().click();
    }

    cy.get('#checkboxes-tags-demo-option-0').click();
    if (!setDifferentTopicsForGroup)
        cy.get('.border_unActive > .MuiFormControlLabel-root > .MuiButtonBase-root > .PrivateSwitchBase-input').click();
    cy.get('.MuiAutocomplete-root > .MuiFormControl-root > .MuiInputBase-root > #checkboxes-tags-demo').eq(1).click();
    if (pupilName) {
        cy.get('.MuiAutocomplete-popper').find('li').contains(pupilName).should('be.visible').click();
    } else {
        cy.get('#checkboxes-tags-demo-option-0').click();
    }

    cy.get('#demo-simple-select-outlined').click();
    if (mainTeacherName) {
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(mainTeacherName).click();
    } else {
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
    }

    cy.get('.MuiButtonBase-root').contains('Create group').click();
};

/**
 * @param {string} oldPassword
 * @param {string} newPassword
 *
 */

export const changePassword = (oldPassword, newPassword) => {
    cy.get('.MuiButtonBase-root').contains('Change password').click();
    getInputBoxByName('oldPassword').type(oldPassword);
    getInputBoxByName('newPassword').type(newPassword);
    getInputBoxByName('confirmNewPassword').type(newPassword);
    cy.get('.MuiButtonBase-root').contains('Change password').click();
    cy.wait(2000, { log: false });
};

/**
 * @param {object} input
 *
 */

export const purchaseClassLicence = (input) => {
    const { fullProgrammeCount, readingLogCount, upgradeExistingReadingClassCount, readyTeddyClassCount } = input;

    cy.get('.school-overview-alert-text > .paragraph > .cp').click();
    if (fullProgrammeCount > 0) getInputBoxByName('fullProgrammeCount').type(fullProgrammeCount).should('have.value', fullProgrammeCount);
    if (readingLogCount > 0) getInputBoxByName('readingLogCount').type(readingLogCount).should('have.value', readingLogCount);
    if (upgradeExistingReadingClassCount > 0)
        getInputBoxByName('upgradeExistingReadingClassCount')
            .type(upgradeExistingReadingClassCount)
            .should('have.value', upgradeExistingReadingClassCount);
    if (readyTeddyClassCount > 0)
        getInputBoxByName('readyTeddyCount').type(readyTeddyClassCount).should('have.value', readyTeddyClassCount);
    getInputBoxByName('authorizationCheckbox').check().should('be.checked');
    cy.get(`.MuiButtonBase-root`).contains('Submit').click();
    cy.wait(2000);
};

/**
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} email
 *
 */

export const addParentFromChildDetails = (firstName, lastName, email) => {
    cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a parent').click();
    cy.get('.MuiDialogContent-root > :nth-child(1) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
        .clear()
        .type(firstName);
    cy.get('.MuiDialogContent-root > :nth-child(2) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input')
        .clear()
        .type(lastName);
    cy.get(':nth-child(3) > .MuiFormControl-root > .MuiInputBase-root > .MuiInputBase-input').clear().type(email);
    cy.get('.btn_group > :nth-child(2) > .MuiButtonBase-root').click();
    cy.wait(2000);
    cy.get('.MuiTypography-root > .material-icons').click();
    cy.get('.MuiList-root .MuiListItemText-root .MuiTypography-root .paragraph').contains('Sign out').click({ force: true });
};

/**
 * @param {string} password
 *
 */

export const setPassword = (password) => {
    cy.get('.MuiButtonBase-root').contains('Set password').click();
    cy.wait(2000, { log: false });
    getInputBoxByName('newPassword').type(password).should('have.value', password);
    getInputBoxByName('confirmNewPassword').type(password).should('have.value', password);
    cy.get('.MuiButtonBase-root').contains('Set password').click();
};

/**
 * @param {string} pupilName
 * @param {string} to
 *
 */

export const switchToPupil = (pupilName, to) => {
    cy.get('.pupil_tab_container').click();
    if (!to) {
        cy.get('[data-test="child-switch-pupil-name"]').contains(pupilName).click({ force: true });

        return;
    }

    cy.get('[data-test="child-switch-pupil-name"]').contains(`${pupilName}’s ${to}`).click({ force: true });

    return;
};

/**
 * @param {string} pupilName
 *
 */

export const selectPupil = (pupilName) => {
    cy.wait(3000, { log: false });
    cy.get(`.child-card-footer-contanier`).contains(pupilName).click();
    acceptMultiChildPrompt();
};

export const acceptMultiChildPrompt = () => {
    cy.wait(3000, { log: false });
    cy.get('body').then((body) => {
        if (body.find('.feedback_tooltip_text').length > 0) {
            cy.get('.MuiButtonBase-root').contains('Got it').click();
        }
    });
};

export const openSideDrawer = () => {
    cy.get('body').then((body) => {
        if (body.find('.side-drawer-close').length > 0) {
            cy.get('.side-drawer-arrow > .material-icons').click();
        }
    });
};

export const waitForStatus = () => {
    waitForLoading();
    cy.get('.school-wonde-status').then(($element) => {
        const status = $element.text();

        cy.log('STATUS', status);

        if (status === 'Import in progress') {
            cy.wait(5000);
            waitForStatus();
        } else {
            cy.log('status: Completed/Failed');

            return;
        }
    });
};

/**
 * @param {string} className
 * @param {boolean} isReadingLogsEnabled
 * @param {boolean} isFullProgramme
 * @param {string} mainTeacherName
 */

export const addClassFromSchoolOverviewPage = (className, isReadingLogsEnabled = true, isFullProgramme = true, mainTeacherName = null) => {
    cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a class').click();
    getInputBoxByName('name').type(className);
    cy.get('.MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined').first().click();
    cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains('Year 1').click();
    cy.get('.MuiFormControl-root > .MuiInputBase-root > #demo-simple-select-outlined').last().click();
    if (mainTeacherName) {
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').contains(mainTeacherName).click();
    } else {
        cy.get('.MuiPaper-root > .MuiList-root > .MuiButtonBase-root').first().click();
    }

    if (isReadingLogsEnabled) getInputBoxByName('isReadingLogsEnabled').check().should('be.checked');
    if (isFullProgramme) getInputBoxByName('isFullProgramme').check().should('be.checked');
    cy.get(`.MuiButton-root`).contains('Create class').click();
};

/**
 * @param {Array<string>} operations
 */

export const interceptGraphQL = (operations) => {
    cy.intercept('POST', '/graphql', (req) => {
        const operationName = req.body.operationName;

        if (operations.includes(operationName)) req.alias = `${operationName}-request`;
    });
};

/**
 * @param {number} daysAfter
 */

export const getFutureDate = (daysAfter) => {
    const today = new Date();
    const futureDate = new Date(today);

    futureDate.setDate(futureDate.getDate() + daysAfter);

    const dd = String(futureDate.getDate()).padStart(2, '0');
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const yyyy = futureDate.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
};

/**
 * @param {number} daysToAdd
 */

export const getFutureDateForReadingTopic = (daysToAdd) => {
    const today = new Date();
    let adjustmentDays;

    if (today.getDay() === 1) {
        adjustmentDays = -6;
    } else {
        adjustmentDays = -((today.getDay() + 6) % 7);
    }

    const startDate = new Date(today);

    startDate.setDate(today.getDate() + adjustmentDays);

    const resultDate = new Date(startDate);

    resultDate.setDate(startDate.getDate() + daysToAdd);

    const dd = String(resultDate.getDate()).padStart(2, '0');
    const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
    const yyyy = resultDate.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
};

const clickNextUntilGotIt = () => {
    cy.get('body').then(($body) => {
        // Check if the "Got it" button is present
        if ($body.find('.MuiButtonBase-root:contains("Got it")').length > 0) {
            // Click the "Got it" button if found
            cy.get('.MuiButtonBase-root').contains('Got it').click();
            cy.wait(2000, { log: false });
        }
        // If "Got it" is not found, check for the "Next" button
        else if ($body.find('.MuiButtonBase-root:contains("Next")').length > 0) {
            // Click the "Next" button if found
            cy.get('.lwp-button').contains('Next').click();
            cy.wait(2000, { log: false });

            // Recursively call the function to check again
            clickNextUntilGotIt();
        }
    });
};

export const acceptFeatureTooltipPrompt = () => {
    cy.wait(5000, { log: false });

    // Start the process by checking if the feedback tooltip is present
    cy.get('body').then(($body) => {
        cy.log('found tooltip', $body.find('.feedback_tooltip_text').length > 0);
        if ($body.find('.feedback_tooltip_text').length > 0) {
            clickNextUntilGotIt();
        }
    });
};

/**
 * @param {string} preference
 * @param {string} recipient
 * @param {string} event
 */

const sendMockNotification = (preference, recipient, event) => {
    cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
        const input = { recipient: recipient };

        if (preference === 'sms') {
            input.twilioStatus = event;
        } else {
            input.mailgunStatus = event;
        }

        cy.request({
            method: 'POST',
            url: graphqlEndpoint,
            headers: {
                Authorization: `Bearer ${cookie?.value}`
            },
            body: {
                operationName: 'updateNotificationStatusForTesting',
                query: `
                mutation updateNotificationStatusForTesting($input: UpdateNotificationStatusInputForTesting!) {
                    updateNotificationStatusForTesting(input: $input)
                }
                `,
                variables: {
                    input
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
};

/**
 * @param {string} event
 * @param {string} recipient
 */

export const updateEmaiStatus = (event, recipient) => {
    sendMockNotification('email', recipient, event);
};

/**
 * @param {string} event
 * @param {string} recipient
 */

export const updateMobileNumberStatus = (event, recipient) => {
    sendMockNotification('sms', recipient, event);
};

/**
 * @param {string} email
 * @param {string} status
 */

export const notificationStatusShouldBe = (email, status) => {
    cy.get('.email_template_Table .tbody .tr_row > .td')
        .contains(email)
        .then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find('.MuiChip-label').contains(status);
                });
        });
};

/**
 * @param {string} status
 */

export const updateAllLeaderQueriesStatus = (status) => {
    cy.get('.table_main .tbody .tr_row').each((el) => {
        cy.wrap(el).then((div) => {
            cy.wrap(div).children().find(`.MuiButtonBase-root`).click();

            cy.get('#demo-simple-select-outlined').click();

            cy.get(`[data-value="${status}"]`).click();
            cy.get('.MuiButtonBase-root').contains('Confirm').click();
            cy.wait(2000);
        });
    });
};

/**
 * @param {string} category
 */

export const publishLeaderQueryByCategory = (category) => {
    cy.get('.table_main .tbody .tr_row > .td')
        .contains(category)
        .then((el) => {
            cy.wrap(el)
                .parent()
                .then((div) => {
                    cy.wrap(div).children().find(`.MuiButtonBase-root`).click();

                    cy.get('#demo-simple-select-outlined').click();

                    cy.get('[data-value="PUBLISHED"]').click();
                    cy.get('.MuiButtonBase-root').contains('Confirm').click();
                    cy.wait(2000);
                });
        });
};

/**
 * @param {string} filename
 */

export const isFileDownloaded = (filename) => {
    const downloadsFolder = 'cypress/downloads';

    cy.task('readDir', downloadsFolder).then((files) => {
        if (Array.isArray(files)) {
            const csvFiles = files.filter((file) => file.startsWith(filename) && file.endsWith('.csv'));

            expect(csvFiles.length).to.be.greaterThan(0, 'CSV file should be downloaded');
        }
    });
};

/**
 * @param {string} topicName
 */

export const addTopicFromAdminSide = (topicName = 'Test Topic') => {
    cy.get(`.sidebar-options-list`).contains('Topics').click();
    cy.wait(2000, { log: false });
    cy.get('.MuiList-root > .MuiListItem-root > .MuiListItemText-root').contains('Add a topic').click();
    getInputBoxByName('teacherTopicName').clear().type(topicName);
    cy.get('#checkboxes-tags-demo').click().type('Reading');
    cy.get('#checkboxes-tags-demo-option-2').click();
    cy.get(`.MuiButtonBase-root`).contains('Publish').click();
    cy.wait(3000, { log: false });
};

/**
 * @param {string} pupilName
 */

export const gotoPupilReadingLogFromClassPage = (pupilName) => {
    cy.get('[data-test=pupil-name-on-week-by-week-reading-view]').contains(pupilName).should('exist').click();
    cy.wait(2000, { log: false });
    cy.get('[data-test=reading-log-menu-on-pupil-details-page]').should('exist').click();
    cy.wait(2000, { log: false });
};

/**
 * @param {string} className
 * @param {string} bookName
 * @param {string} comment
 */

export const submitReadingAsAGroupForAClass = (className, bookName, comment) => {
    cy.log(className);
    cy.get(`.sidebar-options-list-container`).contains('Log reading').click();
    cy.wait(2000, { log: false });
    cy.get('#mui-component-select-pupilIds').click();
    cy.get('[data-test=multi-select-main-options]').contains(className).should('exist').click();
    cy.get('body').click(0, 0);
    getInputBoxByName('bookName').type(bookName);
    getInputBoxByName('includeInReadingTarget').check().should('be.checked');
    cy.get('.extra-width > .readinglog-input-card-image-text > .heading-two').contains('Comment to share with parents').click();
    cy.get('.MuiOutlinedInput-root').eq(3).type(comment);
    cy.get('.MuiButtonBase-root').contains('Add').click();
    cy.wait(2000, { log: false });
};

/**
 * Formats a given date into 'Weekday Day Month' format.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
export function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    const dayName = days[date.getDay()];
    const dayNumber = date.getDate().toString().padStart(2, '0');
    const monthName = months[date.getMonth()];

    return `${dayName} ${dayNumber} ${monthName}`;
}

/**
 * @param {string} token
 */

export const expireMagicLinkByToken = (token) => {
    cy.log(token);
    cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
        cy.request({
            method: 'POST',
            url: graphqlEndpoint,
            headers: {
                Authorization: `Bearer ${cookie?.value}`
            },
            body: {
                operationName: 'expireMagicLinkByToken',
                query: `
                query expireMagicLinkByToken($token: String!) {
                    expireMagicLinkByToken(token: $token)
                }
                `,
                variables: { token: token }
            }
        });
    });
};

/**
 * @param {Date} date
 */

export const formatDateInDMY = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * @param {Date} date
 */

export const getDay = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return days[date.getDay()];
};

export const waitForLoading = () => {
    cy.get('body').then((body) => {
        if (body.find('.common_loading').length > 0) {
            cy.log('Loading...');
            cy.wait(200, { log: false });
            waitForLoading();
        }

        return;
    });
};

export const verifyLastEditedFeedbackDate = () => {
    // Format the date as "Monday 03 February" (weekday day month)
    const date = new Date()
        .toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'long'
        })
        .replace(',', ''); // Remove comma for consistency

    cy.get('.last-edited p').contains(`Last edited on ${date}`);

    cy.get('.last-edited-container > div > .common_drop_down').first().trigger('mouseover');
    cy.get('.last-edited-popover p').contains(date);
    cy.get('body').click(0, 0);
};

/**
 * @param {string} updatedComment
 * @param {number} nthCard
 */

export const updateReadingComment = (updatedComment, nthCard = 0) => {
    cy.get('[data-test=edit-activity-feedback-icon]').eq(nthCard).click();
    waitForLoading();
    cy.get('textarea[name="comments"]').clear().type(updatedComment);
    cy.get('[data-test=update-reading-log-button]').contains('Update reading log').click();
    cy.get('[data-test=feedback-reading-comment]').first().should('contain', updatedComment);
};

export function getReadingTopicReleaseDate() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const result = new Date(today);

    if (dayOfWeek === 1) {
        result.setDate(today.getDate() - 6);
    } else {
        const daysSinceMonday = (dayOfWeek + 6) % 7;

        result.setDate(today.getDate() - daysSinceMonday);
    }

    result.setHours(0, 0, 0, 0);

    return result;
}

/**
 * @param {string} comment
 * @param {string} deletedBy
 * @param {Date} date
 * @param {number} nthCard
 */

export const deleteFeedback = (comment, deletedBy, date = null, isReadingFeedback = true, nthCard = 0) => {
    const deletedFeedbackDate = date ? date : getReadingTopicReleaseDate();

    if (isReadingFeedback) {
        cy.get('[data-test=feedback-reading-comment]')
            .contains(comment)
            .parents('.activity-feed-container')
            .within(() => {
                cy.get('[data-test=delete-activity-feedback-icon]').eq(nthCard).click();
            });
    } else {
        cy.get('[data-test=feedback-family-comment]')
            .contains(comment)
            .parents('.activity-feed-container')
            .within(() => {
                cy.get('[data-test=delete-activity-feedback-icon]').eq(nthCard).click();
            });
    }

    cy.get('[data-test="delete-feedback-confirmation-btn"]').contains('Delete').click();

    cy.wait(2000);

    cy.get('[data-test=deleted-feedback-entry]')
        .should('contain.text', `An entry from ${formatDate(deletedFeedbackDate)} has been deleted by `)
        .find('b')
        .should('have.text', deletedBy);

    cy.get('.activity-deleted-feedback > .common_drop_down').trigger('mouseover');

    cy.get('[data-test=deleted-feedback-entry-info]').contains(`Deleted on ${formatDate(new Date())}`);

    cy.get('body').click(0, 0);
};

/**
 *
 * @param {string} settingsId
 * @param {string} title
 */

export const schoolSettingsPage = (settingsId, title) => {
    cy.get('[data-test="school-settings"]').click();
    cy.get('.heading-one').contains('Settings').should('be.visible');
    cy.get(`[data-test=${settingsId}]`).click();
    cy.get('.heading-one').contains(title).should('be.visible');
};
