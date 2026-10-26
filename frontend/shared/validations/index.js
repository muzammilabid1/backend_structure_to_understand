import { FeatureStatus, InviteMode, ReadingMode, SequenceTimingMode } from 'lwp-shared';
import moment from 'moment';
import * as Yup from 'yup';

import { findOrderErrors, findReversedWindowErrors } from '../../components/Admin/Sequences/sequenceOrdering';
import { emailRegex, phoneRegex } from '../Constant';
import { _get_iso_8601_date_format, doesHtmlContainsText, hasNonNullId } from '../Services/handler';

const regex = /^\d{4}[-](0?[1-9]|1[012])[-](0?[1-9]|[12][0-9]|3[01])$/;

const spaceRemoveTransformer = (value) => {
    return typeof value === 'string' && value !== null ? value.replace(' ', '') : value;
};

const SignupValidationForParent = (minPasswordLength) =>
    Yup.object().shape({
        firstname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),
        lastname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),

        phoneNumber: Yup.string()
            .transform(spaceRemoveTransformer)
            .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.email || this.parent.phoneNumber;
            }),

        email: Yup.string()
            .email('Please enter a valid email address.')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.email || this.parent.phoneNumber;
            }),

        password: Yup.string()
            .label('password')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.'),

        repeatPassword: Yup.string()
            .oneOf([Yup.ref('password'), null], 'Passwords do not match')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.'),

        policy: Yup.boolean().oneOf([true], 'Please agree to the terms and conditions to continue.')
    });
const SignupValidationForParentForSocialLogin = () =>
    Yup.object().shape({
        firstname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),
        lastname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),

        phoneNumber: Yup.string()
            .transform(spaceRemoveTransformer)
            .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.email || this.parent.phoneNumber;
            }),

        email: Yup.string()
            .email('Please enter a valid email address.')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.email || this.parent.phoneNumber;
            }),

        policy: Yup.boolean().oneOf([true], 'Please agree to the terms and conditions to continue.')
    });
const RegisterEmailValidation = Yup.object().shape({
    phoneNumber: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        }),

    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email || this.parent.repeatEmail;
        }),

    repeatEmail: Yup.string()
        .oneOf([Yup.ref('email'), null], 'Email addresses do not match')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email && this.parent.repeatEmail;
        })
});

const SignupValidationForTeacher = (minPasswordLength) =>
    Yup.object().shape({
        firstname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),

        lastname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),

        email: Yup.string()
            .email('Please enter a valid email address.')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .required('This field is required.'),
        phoneNumber: Yup.string()
            .transform(spaceRemoveTransformer)
            .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
            .nullable(),

        nameForChildren: Yup.string()
            .nullable()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Alias should be shorter than 50 characters.')
            .required('This field is required.'),

        password: Yup.string()
            .label('password')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.password || this.parent.socialLoginJwt;
            }),

        repeatPassword: Yup.string()
            .oneOf([Yup.ref('password'), null], 'Passwords do not match')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.repeatPassword || this.parent.socialLoginJwt;
            }),

        policy: Yup.boolean().oneOf([true], 'Please agree to the terms and conditions to continue.')
    });

const SignupValidationForAdmin = (minPasswordLength) =>
    Yup.object().shape({
        firstname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),

        lastname: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .required('This field is required.'),

        email: Yup.string()
            .email('Please enter a valid email address.')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .required('This field is required.'),
        phoneNumber: Yup.string()
            .transform(spaceRemoveTransformer)
            .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
            .nullable(),

        password: Yup.string()
            .label('password')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.password || this.parent.socialLoginJwt;
            }),

        repeatPassword: Yup.string()
            .oneOf([Yup.ref('password'), null], 'Passwords do not match')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .nullable()
            .test('oneOfRequired', 'This field is required.', function () {
                return this.parent.repeatPassword || this.parent.socialLoginJwt;
            }),

        policy: Yup.boolean().oneOf([true], 'Please agree to the terms and conditions to continue.')
    });

const LoginValidationWithEmail = Yup.object().shape({
    email: Yup.string().email('Please enter a valid email address or mobile number').required('This field is required.'),

    password: Yup.string()
        .label('password')
        .min(4, 'Password must be at least 4 characters long.')
        .max(200, 'Password must be shorter than 200 characters.')
        .required('This field is required.')
});
const PreLoginValidationWithEmail = Yup.object().shape({
    email: Yup.string().email('Please enter a valid email address or mobile number').required('This field is required.')
});

const addFeatureValidation = Yup.object().shape({
    description: Yup.string().nullable(),
    status: Yup.string().required('Status is required'),
    schoolTags: Yup.array().when('status', {
        is: FeatureStatus.LIMITED_RELEASE,
        then: (schema) => schema.min(1, 'At least one school tag is required for Limited Release').required('School tags are required'),
        otherwise: (schema) => schema.nullable()
    })
});

const addAndUpdateFeatureTooltipValidation = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    targetId: Yup.string().required('Target ID is required'),
    message: Yup.string().required('Message is required'),
    order: Yup.number().required('Order is required'),
    status: Yup.string().required('Status is required'),
    userTypes: Yup.array()
        .min(1, 'At least one user type is required')
        .max(50, 'You have added too many User types. The maximum is 50.')
        .required('User types are required')
});

const LoginValidationWithPhone = Yup.object().shape({
    email: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Please enter a valid email address or mobile number')
        .min(7, 'number must be at least 7 characters long.')
        .max(15, 'number must be shorter than 15 characters.')
        .required('This field is required.'),

    password: Yup.string()
        .label('password')
        .min(4, 'Password must be at least 4 characters long.')
        .max(200, 'Password must be shorter than 200 characters.')
        .required('This field is required.')
});

const PreLoginValidationWithPhone = Yup.object().shape({
    email: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Please enter a valid email address or mobile number')
        .min(7, 'number must be at least 7 characters long.')
        .max(15, 'number must be shorter than 15 characters.')
        .required('This field is required.')
});

export const forgotPasswordValidationWithEmail = Yup.object().shape({
    email: Yup.string()
        .email('Please enter a valid email address or mobile number')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.')
});

export const topicLibraryValidation = Yup.object().shape({
    isvalide: Yup.string().test('isvalide', 'You must select at least one of year group, subject, or domain', function () {
        const { year, subject, domain } = this.parent;

        return hasNonNullId(year)?.length > 0 || hasNonNullId(subject)?.length > 0 || hasNonNullId(domain)?.length > 0;
    })
});

export const emailHandlerValidation = Yup.object().shape({
    email: Yup.boolean(),
    sms: Yup.boolean(),
    notifications: Yup.boolean(),
    multipleSection: Yup.boolean(),

    isSelected: Yup.string().when(['email', 'sms'], {
        is: (email, sms) => email || sms,
        then: Yup.string().notRequired(),
        otherwise: Yup.string().required('You must select at least one of email or sms.')
    }),

    emailOption: Yup.string(),
    linkText: Yup.string(),
    link: Yup.string(),

    subject: Yup.string().when('email', {
        is: true,
        then: Yup.string().min(2, 'This value is too short. Please enter more than 2 characters.').required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    senderName: Yup.string().when('email', {
        is: true,
        then: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(200, 'Name should be shorter than 200 characters.')
            .required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    senderEmail: Yup.string().when('email', {
        is: true,
        then: Yup.string()
            .email('Please enter a valid email address')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    previewLine: Yup.string().nullable(),

    heading: Yup.string().when(['email', 'emailOption'], {
        is: (email, emailOption) => email && emailOption === 'LAYOUT',
        then: Yup.string().required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    wholeEmailContent: Yup.string().when(['email', 'emailOption'], {
        is: (email, emailOption) => email && emailOption === 'HTML',
        then: Yup.string().required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    bodyText: Yup.string()
        .test('has-text', 'Cannot save an empty note', function (value) {
            const { email, emailOption } = this.parent;

            if (email && emailOption === 'LAYOUT') {
                return (value ?? '').trim().length > 8;
            }

            return true;
        })
        .required('This field is required.'),

    multipleSectionContent: Yup.string().when('multipleSection', {
        is: true,
        then: Yup.string().required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    smsContent: Yup.string().when('sms', {
        is: true,
        then: Yup.string().min(2, 'This value is too short. Please enter more than 2 characters.').required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    notificationTitle: Yup.string().when('notifications', {
        is: true,
        then: Yup.string().max(65, 'title must be shorter than 65 characters.').required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    notificationDescription: Yup.string().when('notifications', {
        is: true,
        then: Yup.string().max(150, 'description must be shorter than 150 characters.').required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),

    notificationUrl: Yup.string().when('notifications', {
        is: true,
        then: Yup.string().required('This field is required.'),
        otherwise: Yup.string().notRequired()
    })
});

export const forgotPasswordValidationWithPhone = Yup.object().shape({
    email: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Please enter a valid email address or mobile number')
        .min(7, 'number must be at least 7 characters long.')
        .max(15, 'number must be shorter than 15 characters.')
        .required('This field is required.')
});

export const editSiteImageValidation = Yup.object().shape({
    fileName: Yup.string().required('This field is required'),
    photo: Yup.string().required('This field is required')
});

export const editStickerImageValidation = Yup.object().shape({
    fileName: Yup.string(),
    photo: Yup.string().when('isPhoto', {
        is: false,
        then: Yup.string().required('This field is required'),
        otherwise: Yup.string().nullable()
    }),
    alt: Yup.string().required('This field is required'),
    isPhoto: Yup.boolean()
});

export const resetPasswordValidationWithEmail = (minPasswordLength) =>
    Yup.object().shape({
        email: Yup.string()
            .email('Please enter a valid email address or mobile number')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .required('This field is required.'),
        password: Yup.string()
            .label('password')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.'),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password'), null], 'Password must match')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.')
    });

export const resetPasswordValidationWithPhone = (minPasswordLength) =>
    Yup.object().shape({
        email: Yup.string()
            .transform(spaceRemoveTransformer)
            .matches(phoneRegex, 'Please enter a valid email address or mobile number')
            .min(7, 'number must be at least 7 characters long.')
            .max(15, 'number must be shorter than 15 characters.')
            .required('This field is required.'),

        password: Yup.string()
            .label('password')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.'),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password'), null], 'Password must match')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.')
    });

const updateNonActiveParentDetailsValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'Names cannot be less than 2 characters.')
        .max(50, 'Names cannot be longer than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'Names cannot be less than 2 characters.')
        .max(50, 'Names cannot be longer than 50 characters.')
        .required('This field is required.'),
    phoneNumber: Yup.string()
        .nullable()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
        .min(7, 'Number cannot be less than 15 characters')
        .max(15, 'Number cannot be more than 15 characters')
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        }),
    email: Yup.string()
        .nullable()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        })
});
const transferPupilToNewParentValidation = Yup.object().shape({
    newFirstname: Yup.string()
        .min(2, 'Names cannot be less than 2 characters.')
        .max(50, 'Names cannot be longer than 50 characters.')
        .required('This field is required.'),
    newLastname: Yup.string()
        .min(2, 'Names cannot be less than 2 characters.')
        .max(50, 'Names cannot be longer than 50 characters.')
        .required('This field is required.'),
    newPhoneNumber: Yup.string()
        .nullable()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
        .min(7, 'Number cannot be less than 15 characters')
        .max(15, 'Number cannot be more than 15 characters')
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.newEmail || this.parent.newPhoneNumber;
        }),
    newEmail: Yup.string()
        .nullable()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.newEmail || this.parent.newPhoneNumber;
        })
});

export const purchaseClassModalValidation = Yup.object()
    .shape({
        emails: Yup.array().of(Yup.string().email('Invalid email address').required('This field is required.')),
        fullProgrammeCount: Yup.number()
            .typeError('Must be a number')
            .integer('Must be an integer')
            .required('This field is required.')
            .nullable(),
        readyTeddyCount: Yup.number()
            .typeError('Must be a number')
            .integer('Must be an integer')
            .required('This field is required.')
            .nullable(),
        readingLogCount: Yup.number()
            .typeError('Must be a number')
            .integer('Must be an integer')
            .required('This field is required.')
            .nullable(),
        upgradeExistingReadingClassCount: Yup.number()
            .typeError('Must be a number')
            .integer('Must be an integer')
            .required('This field is required.')
            .nullable(),
        authorizationCheckbox: Yup.boolean().oneOf([true], 'Please agree to the terms and conditions to continue.'),
        upgradeClassCount: Yup.number().when('upgradeExistingReadingClassCount', {
            is: (val) => val > 0,
            then: Yup.number()
                .typeError('Must be a number')
                .integer('Must be an integer')
                .required('This field is required.')
                .nullable()
                .test(
                    'isGreaterThanReadingOnlyCount',
                    'Upgraded classes count cannot be more than digital reading only class count.',
                    function (value) {
                        const ugradeClassCount = this.parent.upgradeExistingReadingClassCount;

                        if (ugradeClassCount > value) {
                            return false;
                        }

                        return true;
                    }
                )
        })
    })
    .test({
        name: 'atLeastOneFieldRequired',
        test: function (values) {
            const { fullProgrammeCount, readingLogCount, upgradeExistingReadingClassCount, readyTeddyCount } = values;

            const numOfTotal = fullProgrammeCount + readingLogCount + upgradeExistingReadingClassCount + readyTeddyCount;

            if (numOfTotal === 0) {
                return this.createError({
                    message: 'At least one of class purchase is required',
                    path: 'fullProgrammeCount'
                });
            }

            return true;
        }
    });

const addChildForParentValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.')
});

const addChildToClassFromParentValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.')
});

const editChildValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.')
});

const updateChildValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.')
});

const addTopicValidation = Yup.object().shape({
    // startDate: Yup.date()
    //     .required('This field is required.')
    //     .test('IsDate', 'Invalid date format - please use dd/mm/yyyy or select from the calendar', function (value) {
    //         if (regex.test(_get_iso_8601_date_format(value))) {
    //             return true;
    //         } else {
    //             return false;
    //         }
    //     })
    //     .test('IsDate', 'Start date should not be past date', function (value) {
    //         return moment(value, 'YYYY-MM-DD').isSameOrAfter(moment().format('YYYY-MM-DD'));
    //     })
    //     .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),
    //     .max(31, 'Invalid date format - please use dd/mm/yyyy or select from the calendar'),

    startDate: Yup.date()
        .required('This field is required.')
        .test('IsDate', 'Invalid date format - please use dd/mm/yyyy or select from the calendar', function (value) {
            if (regex.test(_get_iso_8601_date_format(value))) {
                return true;
            } else {
                return false;
            }
        })
        .test('IsDate', 'Start date should not be past date', function (value) {
            return this.parent.isUpdate ? true : moment(value, 'YYYY-MM-DD').isSameOrAfter(moment().format('YYYY-MM-DD'));
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),

    endDate: Yup.date()
        .nullable()
        .test('IsDate', 'Invalid date format - please use dd/mm/yyyy or select from the calendar', function (value) {
            let isValidDate = regex.test(_get_iso_8601_date_format(value));

            if (value == null) {
                return true;
            } else if (!isValidDate) {
                return false;
            } else {
                return true;
            }
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .min(Yup.ref('startDate'), "end date can't be before start date"),
    topicMessage: Yup.string().max(150, 'Topic message should be shorter than 150 characters.').nullable()
});

const addTeacherValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    nameForChildren: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Alias should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.'),
    role: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Role should be shorter than 50 characters.')
        .required('This field is required.')
});

const addClassValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class name should be shorter than 50 characters.')
        .required('This field is required.'),
    // classSize: Yup.string()
    //     .max(50, 'Class size should be shorter than 50 characters.')
    //     .nullable(),
    readingTarget: Yup.number().min(1, 'Target cannot be zero.').max(7, 'Target cannot be more than 7.').nullable(),
    readingStartDay: Yup.number().nullable(),
    mainTeacher: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Teacher name should be shorter than 50 characters.')
        .required('This field is required.'),
    yearGroup: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Year group should be shorter than 50 characters.')
        .required('This field is required.'),
    teachers: Yup.array().max(50, 'You have added too many teachers. The maximum is 50.'),
    isRegistrationClass: Yup.boolean(),
    isLocked: Yup.boolean(),
    isReadingLogsEnabled: Yup.boolean().when('isRegistrationClass', {
        is: false,
        then: Yup.boolean().oneOf([false], 'Reading is only allowed on registration class').nullable(),
        otherwise: Yup.boolean()
    }),
    readingLaunchDate: Yup.date().test(
        'IsDate',
        'Please ensure that the reading log launch date is the same day of the week as the chosen “start of the reading week”.',
        function (value) {
            const readingStartDay = this.parent.readingStartDay;
            const readingLaunchDateDay = moment(value).day();

            if (readingLaunchDateDay === readingStartDay) {
                return true;
            } else {
                return false;
            }
        }
    )
    // totalClassesAllowed: Yup.number().test('isZero', function (value) {
    //     const totalClassesAllowed = value;
    //     const fullProgrammeClassesAllowed = this.parent.fullProgrammeClassesAllowed;

    //     if (totalClassesAllowed === 0 && fullProgrammeClassesAllowed === 0) {
    //         throw new Yup.ValidationError("Can't add more class", value, 'totalClassesAllowed');
    //     } else if (totalClassesAllowed === 0) {
    //         throw new Yup.ValidationError("Can't add reading log enabled class", value, 'totalClassesAllowed');
    //     } else if (fullProgrammeClassesAllowed === 0) {
    //         throw new Yup.ValidationError("Can't add full programme class", value, 'totalClassesAllowed');
    //     }

    //     return true;
    // })
});
const addClassFromAdminClassDetailsPageValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class name should be shorter than 50 characters.')
        .required('This field is required.'),
    mainTeacher: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Teacher name should be shorter than 50 characters.')
        .required('This field is required.'),
    yearGroup: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Year group should be shorter than 50 characters.')
        .required('This field is required.'),
    teachers: Yup.array().max(50, 'You have added too many teachers. The maximum is 50.'),
    isLocked: Yup.boolean()
});

const activateClassValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class name should be shorter than 50 characters.')
        .required('This field is required.'),
    readingTarget: Yup.number().min(1, 'Target cannot be zero.').max(7, 'Target cannot be more than 7.').nullable(),
    readingStartDay: Yup.number().nullable(),
    mainTeacher: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Teacher name should be shorter than 50 characters.')
        .required('This field is required.'),
    yearGroup: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Year group should be shorter than 50 characters.')
        .required('This field is required.'),
    teachers: Yup.array().max(50, 'You have added too many teachers. The maximum is 50.'),
    isRegistrationClass: Yup.boolean(),
    isFullProgramme: Yup.boolean(),
    isReadyTeddy: Yup.boolean(),
    isReadingLogsEnabled: Yup.boolean().when('isRegistrationClass', {
        is: false,
        then: Yup.boolean().oneOf([false], 'Reading is only allowed on registration class').nullable(),
        otherwise: Yup.boolean()
    }),
    readingLaunchDate: Yup.date().test(
        'IsDate',
        'Please ensure that the reading log launch date is the same day of the week as the chosen “start of the reading week”.',
        function (value) {
            const readingStartDay = this.parent.readingStartDay;
            const readingLacunchDateDay = moment(value).day();

            if (readingLacunchDateDay === readingStartDay) {
                return true;
            } else {
                return false;
            }
        }
    )
    // totalClassesAllowed: Yup.number().test('isZero', function (value) {
    //     const totalClassesAllowed = value;
    //     const fullProgrammeClassesAllowed = this.parent.fullProgrammeClassesAllowed;

    //     if (totalClassesAllowed === 0 && fullProgrammeClassesAllowed === 0) {
    //         throw new Yup.ValidationError("Can't add more class", value, 'totalClassesAllowed');
    //     } else if (totalClassesAllowed === 0) {
    //         throw new Yup.ValidationError("Can't add reading log enabled class", value, 'totalClassesAllowed');
    //     } else if (fullProgrammeClassesAllowed === 0) {
    //         throw new Yup.ValidationError("Can't add full programme class", value, 'totalClassesAllowed');
    //     }

    //     return true;
    // })
});

const addAcademicYearValidation = Yup.object().shape({
    year: Yup.date('Year is Required').typeError('Year is required').required('Year is required'),
    shortName: Yup.string().min(2, 'Too Short!').max(50, 'Too Long!').required('Short Name is required'),
    longName: Yup.string().min(2, 'Too Short!').max(50, 'Too Long!').required('Long Name is required'),
    characterOne: Yup.string().required('This field is required.').nullable('This field is required.'),
    characterTwo: Yup.string().required('This field is required').nullable('This field is required.'),
    characterThree: Yup.string().required('This field is required').nullable('This field is required.'),
    colourOne: Yup.string().required('This field is required').nullable('This field is required.'),
    colourTwo: Yup.string().required('This field is required').nullable('This field is required.'),
    colourThree: Yup.string().required('This field is required').nullable('This field is required.'),
    isCurrentPeriod: Yup.boolean(),
    isPreviousPeriod: Yup.boolean()
});
const addYearGroupValidation = Yup.object().shape({
    index: Yup.string('Year is Required').required('Year is required'),
    year: Yup.string('Year is Required').typeError('Year is required').required('Year is required'),
    shortName: Yup.string().min(1, 'Too Short!').max(50, 'Too Long!').required('Short Name is required'),
    mathscotOne: Yup.string().required('This field is required').nullable('This field is required.'),
    mathscotTwo: Yup.string().required('This field is required').nullable('This field is required.'),
    mathscotThree: Yup.string().required('This field is required').nullable('This field is required.'),
    hiddenFromLists: Yup.boolean()
});

const addPupilToASchoolClassValidation = Yup.object().shape({
    firstName: Yup.string().trim().required('First name is required'),
    lastName: Yup.string().trim().required('Last name is required'),
    isUpnNotAvailable: Yup.boolean(),
    upn: Yup.string()
        .trim()
        .when('isUpnNotAvailable', {
            is: false,
            then: Yup.string().required('UPN is required')
        }),
    gender: Yup.string()
        .nullable()
        .required('Gender is required')
        .test('gender-is-not-null', 'Gender is required', (value) => value !== null),
    dateOfBirth: Yup.date()
        .nullable()
        .required('Date of birth is required')
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .max(new Date(), 'The date should not be in the future.'),

    yearGroup: Yup.string().required('Year group is required'),
    isPupilPremium: Yup.string().nullable().required('Pupil premium status is required'),
    parentDetails: Yup.array().min(1, 'At least one parent is required')
});

export const addFormValidation = Yup.object().shape({
    text: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(2000, 'Text should be shorter than 2000 characters.')
        .nullable(),
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .nullable(),
    heading: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Heading should be shorter than 50 characters.')
        .required('This field is required.'),
    typeformId: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Typeform Id should be shorter than 50 characters.')
        .required('This field is required.'),
    subjectId: Yup.string().nullable(),
    averageTime: Yup.number()
        .required('This field is required.')
        .test('not-zero', 'averageTime cannot be zero', (value) => value !== 0),
    userOptions: Yup.array()
        .min(1)
        .max(50, 'You have added too many User types. The maximum is 50.')
        .required('This field is required.')
        .test(
            'stopNewUsersFromSubjectBasedSurvey',
            "'New Parents' and 'New Teachers' options are only allowed when no subject is selected. Please remove them to proceed.",
            function (value) {
                const { subjectId } = this.parent;
                const includesNewUserTypes =
                    Array.isArray(value) && value.some((item) => item?.key === 'NEW_PARENT' || item?.key === 'NEW_TEACHER');

                if (subjectId !== '-1' && includesNewUserTypes) {
                    return false;
                }

                return true;
            }
        )
});

export const addTagValidation = Yup.object().shape({
    name: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    color: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces')
});
export const addTopicTagValidation = Yup.object().shape({
    name: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    color: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    topics: Yup.array()
});
export const addTagSchoolValidation = Yup.object().shape({
    name: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    color: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    school: Yup.array()
});

export const PupilActivityFeedsFilterValidation = Yup.object().shape({
    classes: Yup.array().max(50, 'You have added too many classes. The maximum is 50.').required('This field is required.'),
    afterDate: Yup.date().nullable().typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),
    beforeDate: Yup.date()
        .nullable()
        .test('IsDate', 'The date should not be in the future.', function (value) {
            if (!value) {
                return true;
            }

            return moment(value, 'DD-MM-YYYY').isSameOrBefore(moment(), 'day');
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .test('IsDate', "The date should be after 'From' date", function (value) {
            const { afterDate } = this.parent;

            if (afterDate && moment(value, 'DD-MM-YYYY').isBefore(moment(afterDate, 'DD-MM-YYYY'))) {
                return false;
            } else {
                return true;
            }
        })
});

export const AdminActivityFeedsFilterValidation = Yup.object().shape({
    afterDate: Yup.date().nullable().typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),
    beforeDate: Yup.date()
        .nullable()
        .test('IsDate', 'The date should not be in the future.', function (value) {
            if (!value) {
                return true;
            }

            return moment(value, 'DD-MM-YYYY').isSameOrBefore(moment(), 'day');
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .test('IsDate', "The date should be after 'From' date", function (value) {
            const { afterDate } = this.parent;

            if (afterDate && moment(value, 'DD-MM-YYYY').isBefore(afterDate, 'DD-MM-YYYY')) {
                return false;
            } else {
                return true;
            }
        })
});

export const TeacherActivityFeedsFilterValidation = Yup.object().shape({
    postedAfter: Yup.date().nullable().typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),
    postedBefore: Yup.date()
        .nullable()
        .test('IsDate', 'The date should not be in the future.', function (value) {
            if (!value) {
                return true;
            }

            return moment(value, 'DD-MM-YYYY').isSameOrBefore(moment(), 'day');
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .test('IsDate', "The date should be after 'From' date", function (value) {
            const { postedAfter } = this.parent;

            if (postedAfter && moment(value, 'DD-MM-YYYY').isBefore(moment(postedAfter, 'DD-MM-YYYY'))) {
                return false;
            } else {
                return true;
            }
        })
});

export const MessageLogsFilterValidation = Yup.object().shape({
    afterDate: Yup.date().nullable().typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),
    beforeDate: Yup.date()
        .nullable()
        .test('IsDate', 'The date should not be in the future.', function (value) {
            return !moment(value, 'DD-MM-YYYY').isSameOrAfter(moment());
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .test('IsDate', "The date should be after 'From' date", function (value) {
            if (!value) {
                return true;
            }

            const { afterDate } = this.parent;

            if (afterDate && moment(value, 'DD-MM-YYYY') < moment(afterDate, 'DD-MM-YYYY')) {
                return false;
            } else {
                return true;
            }
        })
});

export const addTrophyCertificateValidation = Yup.object().shape({
    title: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Text should be shorter than 50 characters.')
        .required('This field is required.'),
    order: Yup.string().min(1, 'This value is too short. Please enter a value more than 0.').required('This field is required.')
});

export const updateSchoolDetailsValidation = Yup.object().shape({
    schoolName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class name should be shorter than 50 characters.')
        .required('This field is required.'),
    ignoreAcademicYearCheckDuringImport: Yup.boolean().required('This field is required.'),
    organisations: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Organisations name should be shorter than 50 characters.')
        .required('This field is required.'),
    termsAndConditions: Yup.string()
        .when('showTermsAndConditions', {
            is: true,
            then: (schema) => schema.required('This field is required.')
        })
        .test('has-text', 'Cannot save an empty note', function (value) {
            if (!this.parent.showTermsAndConditions) {
                return true;
            }

            return doesHtmlContainsText(value);
        }),
    privacyPolicy: Yup.string()
        .when('showPrivacyPolicy', {
            is: true,
            then: (schema) => schema.required('This field is required.')
        })
        .test('has-text', 'Cannot save an empty note', function (value) {
            if (!this.parent.showPrivacyPolicy) {
                return true;
            }

            return doesHtmlContainsText(value);
        })
});

export const updateSchoolClassLicenceDetailsValidation = Yup.object().shape({
    fullProgrammedClassesAllowed: Yup.number()
        .typeError('Must be a number')
        .integer('Must be an integer')
        .min(0, "Can't be less than zero")
        .required('This field is required.'),

    classesAllowed: Yup.number()
        .typeError('Must be a number')
        .integer('Must be an integer')
        .min(0, "Can't be less than zero")
        .required('This field is required.')
        .test('sumDoesNotExceedClassesAllowed', function (value) {
            const totalNumberOfClasses = this.parent.fullProgrammedClassesAllowed || 0;

            return (
                value >= totalNumberOfClasses ||
                this.createError({
                    message: 'Sum of full programme classes should not exceed total classes allowed.'
                })
            );
        })
});

const leaderSettingValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name length should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name length should be shorter than 50 characters.')
        .required('This field is required.'),
    nameForChildren: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Alias should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.')
});

const adminSettingValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name length should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name length should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.')
});

const parentSettingValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name length should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name length should be shorter than 50 characters.')
        .required('This field is required.'),

    phoneNumber: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
        .nullable(),

    email: Yup.string()
        .nullable()
        .when('phoneNumber', {
            is: (value) => !value?.length,
            then: Yup.string()
                .email('Please enter a valid email address.')
                .max(1000, 'Email address should be shorter than 1000 characters.')
                .required('This field is required.')
        })
});

const ChangePasswordValidation = (minPasswordLength) =>
    Yup.object().shape({
        currentPassword: Yup.string()
            .label('password')
            .min(4, 'Password must be at least 4 characters long.')
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.'),
        newPassword: Yup.string()
            .label('password')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.')
    });

const IsUserWithPassowrdExistValidation = Yup.object().shape({
    password: Yup.string()
        .label('password')
        .min(4, 'Password must be at least 4 characters long.')
        .max(200, 'Password must be shorter than 200 characters.')
        .required('This field is required.')
});

const ChangeUserPasswordValidation = (minPasswordLength) =>
    Yup.object().shape({
        newPassword: Yup.string()
            .label('newPassword')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.'),
        confirmNewPassword: Yup.string()
            .oneOf([Yup.ref('newPassword'), null], 'Password must match')
            .min(minPasswordLength, `Password must be at least ${minPasswordLength} characters long.`)
            .max(200, 'Password must be shorter than 200 characters.')
            .required('This field is required.')
    });

const otherActivityValidation = Yup.object().shape({
    description: Yup.string()
        .min(20, 'This value is too short. Please enter more than 20 characters.')
        .max(5000, 'This description should be shorter than 5000 characters.')
        .required('This field is required.'),
    isOther: Yup.boolean()
});

const topicActivityValidation = Yup.object().shape({
    parentComment: Yup.string().max(5000, 'This comment should be shorter than 5000 characters.'),
    pupilComment: Yup.string().max(5000, 'This comment should be shorter than 5000 characters.'),
    photo: Yup.object().nullable(),
    shareWithTeacher: Yup.boolean().oneOf([true], 'Field must be checked').nullable(),
    shareWithParent: Yup.boolean(),
    sharingAllowedGlobal: Yup.boolean()
});
const topicDemoActivityValidation = Yup.object().shape({
    parentComment: Yup.string().max(5000, 'This comment should be shorter than 5000 characters.'),
    pupilComment: Yup.string().max(5000, 'This comment should be shorter than 5000 characters.'),
    photo: Yup.object().nullable()
    // shareWithParents: Yup.boolean().oneOf([true], 'Field must be checked').nullable(),
    // shareGlobal: Yup.boolean().nullable(),
    // rememberSettings: Yup.boolean().nullable()
    // rating: Yup.string.nullable()
});

export const teacherCommentValidation = Yup.object().shape({
    comment: Yup.string().max(5000, 'This comment should be shorter than 5000 characters.').trim().required('This field is required.')
});

const photoPermissionValidation = Yup.object().shape({
    shareWithTeacher: Yup.boolean().oneOf([true], 'Field must be checked').nullable(),
    shareWithParent: Yup.boolean(),
    sharingAllowedGlobal: Yup.boolean()
});

const photoPermissionsValidation = Yup.object().shape({
    allowSharing: Yup.mixed().nullable(),
    askConsent: Yup.mixed().nullable(),
    dontAllowSharing: Yup.mixed()
        .nullable()
        .test('isAllowed', 'Field must be checked', function (value) {
            if (this?.parent?.askConsent === 'true') return true;
            if (value === true) return true;

            return false;
        })
});

const notificationSettingsValidation = Yup.object().shape({
    email: Yup.boolean().nullable(),
    textMessage: Yup.boolean().nullable()
});

const addParentValidationWithEmail = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address or mobile number')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.')
});

const addParentValidation = Yup.object().shape({
    parentFirstname: Yup.string()
        .min(2, 'Names cannot be less than 2 characters.')
        .max(50, 'Names cannot be longer than 50 characters.')
        .required('This field is required.'),
    parentLastname: Yup.string()
        .min(2, 'Names cannot be less than 2 characters.')
        .max(50, 'Names cannot be longer than 50 characters.')
        .required('This field is required.'),
    phoneNumber: Yup.string()
        .nullable()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
        .min(7, 'Number cannot be less than 15 characters')
        .max(15, 'Number cannot be more than 15 characters')
        .test('oneOfRequired', 'Either email or mobile is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        }),
    email: Yup.string()
        .nullable()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .test('oneOfRequired', 'Either email or mobile is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        })
});

const addParentValidationWithPhone = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Please enter a valid email address or mobile number')
        .min(7, 'number must be at least 7 characters long.')
        .max(15, 'number must be shorter than 15 characters.')
        .required('This field is required.')
});

const addAdminValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.')
});

const addSchoolValidation = Yup.object().shape({
    schoolName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'School name should be shorter than 50 characters.')
        .required('This field is required.'),
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    nameForChildren: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Alias should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.'),
    inviteMode: Yup.string().oneOf(Object.values(InviteMode)).required('This field is required.'),
    emailAndPassword: Yup.boolean()
        .nullable()
        .test('oneOfRequired', '', function () {
            return this.parent.emailAndPassword || this.parent.google || this.parent.microsoft;
        }),
    google: Yup.boolean()
        .nullable()
        .test('oneOfRequired', '', function () {
            return this.parent.emailAndPassword || this.parent.google || this.parent.microsoft;
        }),
    microsoft: Yup.boolean()
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.emailAndPassword || this.parent.google || this.parent.microsoft;
        }),

    fullProgrammedClassesAllowed: Yup.number()
        .nullable()
        .typeError('Must be a number')
        .integer('Must be an integer')
        .min(0, "Can't be less than zero")
        .required('This field is required.'),

    classesAllowed: Yup.number()
        .nullable()
        .typeError('Must be a number')
        .integer('Must be an integer')
        .required('This field is required.')
        .min(0, "Can't be less than zero")
        .test('greaterThan', 'Total class should be greater than full programme classes allowed.', function (value) {
            const { fullProgrammedClassesAllowed } = this.parent;

            return value >= fullProgrammedClassesAllowed;
        })
});
const addQueryValidation = Yup.object().shape({
    name: Yup.string().required('This field is required.'),
    sqlQuery: Yup.string().required('This field is required.'),
    csvFileLocation: Yup.string().nullable(),
    order: Yup.number().typeError('Must be a number').integer('Must be an integer').required('This field is required.')
});

export const schoolDataValidation = Yup.object().shape({
    order: Yup.number().typeError('Must be a number').integer('Must be an integer').required('This field is required.'),
    description: Yup.string().max(5000, 'Too Long!').nullable()
});

const askQuestionValidation = Yup.object().shape({
    question: Yup.string().max(2000, 'Your question should be shorter than 2000 characters.').required('This field is required.')
});

const addFAQValidation = Yup.object().shape({
    question: Yup.string().max(5000, 'Your question should be shorter than 5000 characters.').required('This field is required.')
});

const addNewsValidation = Yup.object().shape({
    title: Yup.string().max(50, 'Headline should be shorter than 50 characters.').required('This field is required.')
});

const addTermValidation = Yup.object().shape({
    termName: Yup.string().max(50, 'Name should be shorter than 50 characters.').required('This field is required.'),
    startDate: Yup.date().required('This field is required.'),
    endDate: Yup.date().min(Yup.ref('startDate'), "end date can't be before start date").required('This field is required.'),
    period: Yup.number().required('This field is required.')
});

const scheduleTopicValidation = Yup.object().shape({
    classAndGroupNames: Yup.array().min(1, 'At least one class must be selected'),
    startDate: Yup.date()
        .required('This field is required.')
        .test('IsDate', 'Invalid date format - please use dd/mm/yyyy or select from the calendar', function (value) {
            if (regex.test(_get_iso_8601_date_format(value))) {
                return true;
            } else {
                return false;
            }
        })
        .test('IsDate', 'Start date should not be past date', function (value) {
            return this.parent.isUpdate ? true : moment(value, 'YYYY-MM-DD').isSameOrAfter(moment().format('YYYY-MM-DD'));
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar'),

    endDate: Yup.date()
        .nullable()
        .test('IsDate', 'Invalid date format - please use dd/mm/yyyy or select from the calendar', function (value) {
            let isValidDate = regex.test(_get_iso_8601_date_format(value));

            if (value == null) {
                return true;
            } else if (!isValidDate) {
                return false;
            } else {
                return true;
            }
        })
        .typeError('Invalid date format - please use dd/mm/yyyy or select from the calendar')
        .min(Yup.ref('startDate'), "end date can't be before start date"),
    topicMessage: Yup.string().max(150, 'Topic message should be shorter than 150 characters.').nullable()
});

const addHolidayValidation = Yup.object().shape({
    holidayName: Yup.string().max(50, 'Name should be shorter than 50 characters.').required('This field is required.'),
    startDate: Yup.date().min(new Date(), 'Start date cannot be before today').required('This field is required.'),
    endDate: Yup.date().min(Yup.ref('startDate'), "End date can't be before start date").required('This field is required.'),
    period: Yup.mixed()
        .when('isSchoolHoliday', {
            is: true,
            then: Yup.number().required('This field is required'),
            otherwise: Yup.number().notRequired().nullable()
        })
        .nullable()
});

const updateHolidayValidation = Yup.object().shape({
    holidayName: Yup.string().max(50, 'Name should be shorter than 50 characters.').required('This field is required.'),
    startDate: Yup.date()
        .required('This field is required.')
        .test('IsDate', 'Start date should not be past date', function (value) {
            return moment(value, 'YYYY-MM-DD').isSameOrAfter(moment().format('YYYY-MM-DD'));
        }),
    endDate: Yup.date().min(Yup.ref('startDate'), "End date can't be before start date").required('This field is required.')
});

const addResourceValidation = Yup.object().shape({
    title: Yup.string().max(50, 'Too Long!').required('This field is required.'),
    description: Yup.string().max(5000, 'Too Long!').required('This field is required.'),
    file: Yup.mixed().required('File is required').nullable(),
    leaderOnly: Yup.boolean()
});

export const uploadFileForAdminValidation = Yup.object().shape({
    file: Yup.mixed().required('File is required')
});

const updateTeacherValidation = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    nameForChildren: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Alias should be shorter than 50 characters.')
        .required('This field is required.'),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.'),
    role: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Role should be shorter than 50 characters.')
        .required('This field is required.')
});

const addTopicFromAdminValidation = Yup.object().shape({
    teacherTopicName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    domainAndYearGroupIds: Yup.array()
        .min(1, 'At least one year must be selected')
        .max(50, 'You have added too many year. The maximum is 50.')
        .required('This field is required.'),
    teacherDescription: Yup.string().nullable(),
    video: Yup.number().typeError('Must be a number').positive('Must be a positive number').integer('Must be an integer').nullable(),
    isDemo: Yup.bool().nullable(),
    isHidden: Yup.bool().nullable(),
    isTeacherPdfRequired: Yup.bool().nullable(),
    videoThumb: Yup.string().nullable(),
    parentTopicName: Yup.string().nullable(),
    teacherEmailBody: Yup.string().nullable(),
    schoolTags: Yup.array().test('schoolTags', 'At least one school tag must be selected', function () {
        return this.parent?.limitedRelease ? this.parent.schoolTags.length > 0 : true;
    }),
    scrapbookPrompt: Yup.string().nullable()
});

const addDomainFromAdminValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    year: Yup.array()
        .min(1, 'At least one year must be selected')
        .max(50, 'You have added too many year. The maximum is 50.')
        .required('This field is required.'),
    subject: Yup.string().required('This field is required.')
});

export const addSubjectFromAdminValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .trim()
        .required('This field is required.'),
    programmeType: Yup.string().required('This field is required.')
});

export const createProgramFromAdminValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    schoolTagId: Yup.string(),
    logoFileName: Yup.string().nullable(),
    characterFileName: Yup.string().nullable()
});

const addTrophyCertificateFromAdminValidation = Yup.object().shape({
    title: Yup.string()
        .min(2, 'Title is too short. Please enter more than 2 characters.')
        .max(50, 'Title should be shorter than 50 characters.')
        .required('This field is required.'),
    order: Yup.number()
        .min(1, 'Order cannot be zero')
        .typeError('Order must be a number')
        .integer('Order must be an integer')
        .required('This field is required.'),
    startDate: Yup.date().required('This field is required.'),
    endDate: Yup.date().min(Yup.ref('startDate'), "end date can't be before start date").required('This field is required.'),
    isActive: Yup.bool().required('This field is required.'),
    isPupilMail: Yup.bool().required('This field is required.'),
    isTeacherMail: Yup.bool().required('This field is required.'),
    hasMathscot: Yup.boolean().nullable(),
    subjects: Yup.array().min(1, 'At least one subject must be selected').required('This field is required.'),
    mathscotXValue: Yup.number().when('hasMathscot', {
        is: true,
        then: Yup.number().required('This field is required.').typeError('Must be a number').integer('Must be an integer'),
        otherwise: Yup.number().nullable()
    }),
    mathsoctYValue: Yup.number().when('hasMathscot', {
        is: true,
        then: Yup.number().required('This field is required.').typeError('Must be a number').integer('Must be an integer'),
        otherwise: Yup.number().nullable()
    }),
    mathscotScale: Yup.number().when('hasMathscot', {
        is: true,
        then: Yup.number().required('This field is required.').typeError('Must be a number').integer('Must be an integer'),
        otherwise: Yup.number().nullable()
    }),
    fieldData: Yup.array().of(
        Yup.object().shape({
            xValue: Yup.number()
                .typeError('Must be a number')
                .positive('Must be a positive number')
                .integer('Must be an integer')
                .required('This field is required.'),
            yValue: Yup.number()
                .typeError('Must be a number')
                .positive('Must be a positive number')
                .integer('Must be an integer')
                .required('This field is required.'),
            fontSize: Yup.number()
                .typeError('Must be a number')
                .positive('Must be a positive number')
                .integer('Must be an integer')
                .required('This field is required.')
        })
    )
});

export const addActivityFromAdminValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    welcomeMessage: Yup.string().required(),
    activityType: Yup.string().required(),
    cardImage: Yup.mixed().nullable(),
    order: Yup.number().typeError('Must be a number').positive('Must be a positive number').integer('Must be an integer').required(),
    tags: Yup.array().max(50, 'You have added too many tags. The maximum is 50.'),
    details: Yup.string().nullable()
});

export const generateCsvValidation = Yup.object().shape({
    query: Yup.string().required('This field is required.')
});
export const cronJobSelectValidation = Yup.object().shape({
    cronJob: Yup.string().required('This field is required.')
});

export const reminderEmailValidation = Yup.object().shape({
    type: Yup.string().required('This field is required.'),
    scheduleDate: Yup.date()
        .nullable()
        .typeError('Invalid date format - please use DD/MM/YYYY or select from the calendar')
        .required('This field is required.')
});

export const updatePupilTopicFromAdminValidation = Yup.object().shape({
    watchedVideo: Yup.bool().required('This field is required.')
});

export const updatePupilActivityFromAdminValidation = Yup.object().shape({
    earnedStar: Yup.bool().required('This field is required.'),
    rating: Yup.number().typeError('Must be a number').integer('Must be an integer').nullable()
});

export const addModalFromAdminValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    nameForContentDev: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .nullable()
});

export const editStaticModalFromAdminValidation = Yup.object().shape({
    name: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    nameForContentDev: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .nullable()
});

export const addEmailTemplateFromAdminValidation = Yup.object().shape({
    subject: Yup.string().min(2, 'This value is too short. Please enter more than 2 characters.').required('This field is required.'),
    senderName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(200, 'Name should be shorter than 200 characters.')
        .required('This field is required.'),
    senderEmail: Yup.string()
        .email('Please enter a valid email address')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.'),
    type: Yup.string().min(1, 'This value is too short. Please enter more than 1 character.').required('This field is required.'),
    sms: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.sms || this.parent.email;
        }),

    email: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.sms || this.parent.email;
        }),
    params: Yup.string().min(2, 'This value is too short. Please enter more than 2 characters.')
});
export const editEmailTemplateFromAdminValidation = Yup.object().shape({
    subject: Yup.string().min(2, 'This value is too short. Please enter more than 2 characters.').required('This field is required.'),
    senderName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(200, 'Name should be shorter than 200 characters.')
        .required('This field is required.'),
    senderEmail: Yup.string()
        .email('Please enter a valid email address')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .required('This field is required.'),
    type: Yup.string().min(1, 'This value is too short. Please enter more than 1 character.').required('This field is required.'),
    sms: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.sms || this.parent.email;
        }),

    email: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.sms || this.parent.email;
        }),
    sentTo: Yup.string('Enter your Email/Phone Number')
        .nullable()
        .test('IsEmailOrPhone', 'Enter Valid Phone/Email', function (value) {
            if (value == null) {
                return true;
            }

            let isValidEmail = emailRegex.test(value);
            let isValidPhone = phoneRegex.test(value);

            if (!isValidEmail && !isValidPhone) {
                return false;
            }

            return true;
        })
});

const updateParentValidationForAdmin = Yup.object().shape({
    firstname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    lastname: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .required('This field is required.'),
    phoneNumber: Yup.string()
        .transform(spaceRemoveTransformer)
        .matches(phoneRegex, 'Not a valid mobile number. Please check and try again.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        }),
    techToolKit: Yup.boolean(),
    siteData: Yup.boolean(),
    siteAdmins: Yup.boolean(),
    email: Yup.string()
        .email('Please enter a valid email address.')
        .max(1000, 'Email address should be shorter than 1000 characters.')
        .nullable()
        .test('oneOfRequired', 'This field is required.', function () {
            return this.parent.email || this.parent.phoneNumber;
        })
});

const updateSchoolImpactReportCommentCardForAdmin = Yup.object().shape({
    content: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(500, 'Name should be shorter than 500 characters.')
        .required('This field is required.')
});

export const sendTestPhoneValidationForAdmin = (sendSms) =>
    Yup.object().shape({
        email: Yup.string()
            .transform(spaceRemoveTransformer)
            .matches(phoneRegex, 'Please enter a valid email address or mobile number')
            .min(7, 'number must be at least 7 characters long.')
            .max(15, 'number must be shorter than 15 characters.')
            .required('This field is required.')
            .test('oneOfRequired', 'This template does not have an SMS option. You can only send email.', function () {
                return sendSms;
            })
    });

export const sendTestEmailValidationForAdmin = (sendEmail) =>
    Yup.object().shape({
        email: Yup.string()
            .email('Please enter a valid email address or mobile number')
            .max(1000, 'Email address should be shorter than 1000 characters.')
            .required('This field is required.')
            .test('oneOfRequired', 'This template does not have an email option. You can only send SMS.', function () {
                return sendEmail;
            })
    });

const readingLogValidationForAdmin = Yup.object().shape({
    bookName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .trim()
        .required('This field is required.'),
    // readDate: Yup.string().required('This field is required.').required('This field is required.'),
    finishedBook: Yup.boolean().nullable(),
    pageNumber: Yup.string().max(50, 'Page number should be shorter than 50 characters.').nullable(),
    comments: Yup.string().max(5000, 'This description should be shorter than 5000 characters.').nullable(),
    thoughts: Yup.object().when(['comments', 'audioFile', 'photo'], {
        is: (comments, audioFile, photo) => !comments && !audioFile && !photo,
        then: Yup.object().required('Please add at least one of the following').nullable(),
        otherwise: Yup.object().notRequired().nullable()
    }),
    sharingAllowed: Yup.boolean(),
    rememberPermissions: Yup.boolean()
});

// The reading mode itself is not validated here: the save button only renders once one is chosen
// (Parent/ReadingLog), so a schema rule could never surface its message.
const readingLogValidationForParent = (enableBookNameOnlyReadingLog = false, hasSavingLock, { requireReadDate = true } = {}) =>
    Yup.object().shape({
        readingMode: Yup.string().nullable(),
        // The day is picked from the slider and has no field in the form, so it can be missing at
        // submit with nothing on screen looking wrong. Editing keeps the day the entry already has
        // and never sets this value, so that path opts out or every edit would fail.
        readDate: requireReadDate
            ? Yup.string().nullable().required('Please choose which day this reading was on.')
            : Yup.string().nullable(),
        // Real-world reading hides this question, so requiring it there would make the entry
        // impossible to save against a field the parent cannot see.
        readingType: Yup.string()
            .nullable()
            .when('readingMode', {
                is: ReadingMode.READ_IN_REAL_WORLD,
                then: Yup.string().nullable(),
                otherwise: Yup.string().nullable().required('Please choose what you are reading.')
            }),
        bookName: Yup.string()
            .min(2, 'This value is too short. Please enter more than 2 characters.')
            .max(50, 'Name should be shorter than 50 characters.')
            .trim()
            .required('This field is required.'),
        finishedBook: Yup.boolean().nullable(),
        pageNumber: Yup.string().max(50, 'Page number should be shorter than 50 characters.').nullable(),
        comments: Yup.string().max(5000, 'This description should be shorter than 5000 characters.').nullable(),
        audioFile: Yup.object().nullable(),
        photo: Yup.mixed().nullable(),
        thoughts: Yup.object().when(['comments', 'audioFile', 'photo'], {
            is: (comments, audioFile, photo) =>
                enableBookNameOnlyReadingLog ? !enableBookNameOnlyReadingLog : !comments && !audioFile && !photo && !hasSavingLock(),
            then: Yup.object().required('Please add at least one of the following').nullable(),
            otherwise: Yup.object().notRequired().nullable()
        }),
        shareWithTeacher: Yup.boolean().oneOf([true], 'Field must be checked').nullable(),
        sharingAllowed: Yup.boolean(),
        rememberPermissions: Yup.boolean()
    });

const scrapbookEntryValidation = (showPhotoPermission) =>
    Yup.object().shape({
        comment: Yup.string().max(5000, 'This description should be shorter than 5000 characters.').nullable(),
        audioFile: Yup.object().nullable(),
        photo: Yup.mixed().nullable(),
        thoughts: Yup.object().when(['comment', 'audioFile', 'photo'], {
            is: (comment, audioFile, photo) => !comment && !audioFile && !photo,
            then: Yup.object().required('Please add at least one of the following').nullable(),
            otherwise: Yup.object().notRequired().nullable()
        }),
        shareWithTeacher: showPhotoPermission ? Yup.boolean().oneOf([true], 'Field must be checked').nullable() : Yup.boolean().nullable(),
        sharingAllowed: Yup.boolean(),
        rememberPermissions: Yup.boolean()
    });

const readingLogValidationForTeacher = Yup.object().shape({
    bookName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .trim()
        .required('This field is required.'),
    // readDate: Yup.string().required('This field is required.').required('This field is required.'),
    finishedBook: Yup.boolean().nullable(),
    pageNumber: Yup.string().max(50, 'Page number should be shorter than 50 characters.').nullable()
    // sharingAllowed: Yup.boolean(),
    // rememberPermissions: Yup.boolean()
});

const updateReadingLogValidationForTeacher = Yup.object().shape({
    bookName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .trim()
        .required('This field is required.'),
    finishedBook: Yup.boolean().nullable(),
    pageNumber: Yup.string().max(50, 'Page number should be shorter than 50 characters.').nullable(),

    pupilIds: Yup.array().when('isReadingWithGroup', {
        is: true,
        then: Yup.array().min(1, 'At least one pupil must be selected').required('This field is required.'),
        otherwise: Yup.array().nullable()
    }),

    isReadingWithGroup: Yup.boolean().nullable()
});

const readingLogValidationForReadingAsGroup = Yup.object().shape({
    bookName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Name should be shorter than 50 characters.')
        .trim()
        .required('This field is required.'),
    readDate: Yup.string().required('This field is required.').required('This field is required.'),
    finishedBook: Yup.boolean().nullable(),
    pageNumber: Yup.string().max(50, 'Page number should be shorter than 50 characters.').nullable(),
    // .when('finishedBook', {
    //     is: (value) => !value,
    //     then: Yup.number()
    //         .typeError('Must be a number')
    //         .positive('Must be a positive number')
    //         .integer('Must be an integer')
    //         .required('This field is required.')
    // }),
    pupilIds: Yup.array().min(1, 'At least one pupil must be selected')
});

const importWondeSchoolValidation = Yup.object().shape({
    wondeSchoolId: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(20, 'Name should be shorter than 10 characters.')
        .required('This field is required.')
});

const socialLoginCheck = Yup.object({
    emailAndPassword: Yup.boolean(),
    google: Yup.boolean(),
    microsoft: Yup.boolean(),
    tenantDomain: Yup.string().nullable(),
    msTenantIssuer: Yup.string().nullable()
}).test('myCustomTest', null, (obj) => {
    if (!obj.emailAndPassword && !obj.google && !obj.microsoft) {
        return new Yup.ValidationError('Please check one checkbox', null, 'socialLoginCheck');
    }

    if (obj.microsoft && obj.tenantDomain && !obj.msTenantIssuer) {
        return new Yup.ValidationError(
            'Tenant domain for a Microsoft login enabled school must be a Microsoft domain if specified',
            null,
            'socialLoginCheck'
        );
    }

    return true;
});

const awardTrophyValidation = Yup.object().shape({
    trophyId: Yup.string().required('This field is required.')
});

const TestEmailForAdminValidation = Yup.object().shape({
    sentTo: Yup.string('Enter your Email/Phone Number')
        .required('This field is required.')
        .test('IsEmailOrPhone', 'Enter Valid Phone/Email', function (value) {
            if (value == null) {
                return true;
            }

            let isValidEmail = emailRegex.test(value);
            let isValidPhone = phoneRegex.test(value);

            if (!isValidEmail && !isValidPhone) {
                return false;
            }

            return true;
        })
});

const addStaffValidation = Yup.object().shape({
    fullName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Full Name should be shorter than 50 characters.')
        .required('This field is required.'),
    jobTitle: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Job title should be shorter than 50 characters.')
        .required('This field is required.'),

    description: Yup.string().max(5000, 'Too Long!'),
    order: Yup.number().required('This field is required.'),
    isTrustee: Yup.boolean().required('This field is required.'),
    photo: Yup.mixed().nullable()
});

export const addLogoValidation = Yup.object().shape({
    alt: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Full Name should be shorter than 50 characters.')
        .required('This field is required.'),
    section: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Job title should be shorter than 50 characters.')
        .required('This field is required.'),
    image: Yup.mixed().required()
});

export const addBlogPostValidation = Yup.object().shape({
    title: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Full Name should be shorter than 50 characters.')
        .required('This field is required.'),
    authorName: Yup.string().max(50, 'Job title should be shorter than 50 characters.'),
    shortDescription: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Job title should be shorter than 50 characters.')
        .required('This field is required.'),
    longHtml: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Job title should be shorter than 50 characters.')
        .required('This field is required.'),
    authorImage: Yup.mixed().nullable()
});

export const addVideoTutorialValidation = Yup.object().shape({
    title: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Full Name should be shorter than 50 characters.')
        .required('This field is required.'),
    video: Yup.string().required('This field is required.'),
    file: Yup.mixed().nullable()
});

export const welcomePageValidation = Yup.object().shape({
    policy: Yup.boolean().oneOf([true], 'Please agree to the terms and conditions to continue.')
});

export const addClassGroupValidation = Yup.object().shape({
    groupName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class groupName should be shorter than 50 characters.')
        .required('This field is required.'),
    mainTeacher: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Teacher name should be shorter than 50 characters.')
        .required('This field is required.'),
    otherteachers: Yup.array().max(50, 'You have added too many teachers. The maximum is 50.'),
    subjects: Yup.array().min(1)
});

export const AddGroupAcrossClassesValidation = Yup.object().shape({
    groupName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class groupName should be shorter than 50 characters.')
        .required('This field is required.'),
    mainTeacher: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Teacher name should be shorter than 50 characters.')
        .required('This field is required.'),
    yearGroup: Yup.string().required('This field is required.'),
    otherteachers: Yup.array().max(50, 'You have added too many teachers. The maximum is 50.')
});

export const classGroupSettingsValidation = Yup.object().shape({
    groupName: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class groupName should be shorter than 50 characters.')
        .required('This field is required.'),
    mainTeacher: Yup.string()
        .min(1, 'This value is too short. Please enter more than 1 character.')
        .max(50, 'Teacher name should be shorter than 50 characters.')
        .required('This field is required.'),
    otherteachers: Yup.array().max(50, 'You have added too many teachers. The maximum is 50.')
});

export const createStickerValidation = Yup.object().shape({
    title: Yup.string()
        .min(2, 'This value is too short. Please enter more than 2 characters.')
        .max(50, 'Class groupName should be shorter than 50 characters.')
        .required('This field is required.'),
    textColor: Yup.string().required('This field is required.'),
    borderColor: Yup.string().required('This field is required.'),
    characterType: Yup.string(),
    itemType: Yup.string()
});

export const addPupilTagValidation = Yup.object().shape({
    name: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    color: Yup.string().required('This field is required.').trim('The contact name cannot include leading and trailing spaces'),
    pupilIds: Yup.array()
});

export const editPupilTagValidation = (isNameAllow) =>
    Yup.object().shape({
        name: Yup.string()
            .trim('The contact name cannot include leading and trailing spaces')
            .when([], {
                is: () => isNameAllow,
                then: Yup.string().required('This field is required.'),
                otherwise: Yup.string()
            }),
        color: Yup.string(),
        tags: Yup.array()
    });

export const impactReportEamilTemplateValidation = Yup.object().shape({
    impactReportEmailTemplate: Yup.string().required('This field is required.')
});

export const addPupilsInClassValidation = Yup.object().shape({
    class: Yup.object().required('This field is required.'),
    isCreateNewClass: Yup.boolean(),
    className: Yup.string().when('isCreateNewClass', {
        is: true,
        then: Yup.string().required('This field is required.'),
        otherwise: Yup.string().notRequired()
    }),
    yearGroup: Yup.string().when('isCreateNewClass', {
        is: true,
        then: Yup.string().required('This field is required.'),
        otherwise: Yup.string().notRequired()
    })
});

export const linkingValidationSchema = (links) => {
    const shape = {};

    Object.keys(links).forEach((key) => {
        shape[key] = Yup.object().nullable();
    });

    return Yup.object().shape(shape);
};

/**
 * Admin topic sequences.
 *
 * The cross-topic date rules delegate to the pure helpers the sequence form also
 * renders its per-row messages from, so the gate that blocks submit and the message
 * that explains why cannot disagree. Overlapping windows are deliberately absent:
 * they warn in the form and never block.
 */
export const topicSequenceValidation = Yup.object().shape({
    name: Yup.string().trim().required('This field is required.'),
    subjectId: Yup.string().required('This field is required.'),
    yearGroupId: Yup.string().required('This field is required.'),
    // The academic year the sequence is for, and FIXED sequences only. An interval sequence carries
    // no dates, so it belongs to no year and the form does not show the field at all; requiring it
    // there would block a save on something the admin cannot see.
    //
    // Required for fixed so the field is caught before submit rather than by the API. Whether the
    // topic dates actually fall inside that year is checked server-side, which is where the period's
    // own start and end dates live.
    periodIndex: Yup.string().when('timingMode', {
        is: SequenceTimingMode.FIXED,
        then: (schema) => schema.required('This field is required.'),
        otherwise: (schema) => schema.nullable()
    }),
    timingMode: Yup.string().required('This field is required.'),
    // Required for interval, which has no other timing at all: a sequence saved without one could
    // never be assigned, and since a teacher is not offered a cadence of their own (LEA-6624) no
    // school could rescue it. Whole days only, matching the API, because half a day is not something
    // a schedule can express.
    intervalDays: Yup.mixed().when('timingMode', {
        is: SequenceTimingMode.INTERVAL,
        then: (schema) =>
            schema.test(
                'interval-whole-days-at-least-one',
                'Enter a whole number of days, at least 1.',
                (value) => Number.isInteger(Number(value)) && Number(value) >= 1
            ),
        otherwise: (schema) => schema.nullable()
    }),
    // No rule for a sequence-level start date, because no such field exists any more (LEA-6586). An
    // interval sequence takes its anchor from the class, and a fixed one's dates live on its topics.
    items: Yup.array()
        .min(1, 'Add at least one topic.')
        // The end date is optional, matching the optional due date a teacher gets when scheduling a
        // topic by hand, so only the start date is required.
        .test('every-topic-started', 'Every topic in a fixed sequence needs a start date.', function (value) {
            if (this.parent.timingMode !== SequenceTimingMode.FIXED) return true;

            return (value || []).every((item) => item.startDate);
        })
        .test('no-reversed-window', 'A topic cannot end before it starts.', function (value) {
            if (this.parent.timingMode !== SequenceTimingMode.FIXED) return true;

            return findReversedWindowErrors(value || [], (date) => date).length === 0;
        })
        .test('dates-match-order', 'Change the topic dates so they match the order of the list.', function (value) {
            if (this.parent.timingMode !== SequenceTimingMode.FIXED) return true;

            return findOrderErrors(value || [], (date) => date).length === 0;
        })
});

export const pageAnnouncementValidation = Yup.object().shape({
    message: Yup.string()
        .required('This field is required.')
        .test('noOnlySpaces', 'This field cannot contain only spaces.', function () {
            return doesHtmlContainsText(this.parent.message);
        }),
    title: Yup.string().trim().required('This field is required.'),
    priority: Yup.number().typeError('Must be a number').integer('Must be an integer').required('This field is required.'),
    userOptions: Yup.array().test(
        'userOptions-or-schoolTags',
        'Please select at least one User Option or one School Tag.',
        function (value) {
            const { schoolTags } = this.parent;
            const hasUserOptions = Array.isArray(value) && value.length > 0;
            const hasSchoolTags = Array.isArray(schoolTags) && schoolTags.length > 0;

            return hasUserOptions || hasSchoolTags;
        }
    ),
    schoolTags: Yup.array().test(
        'schoolTags-or-userOptions',
        'Please select at least one User Option or one School Tag.',
        function (value) {
            const { userOptions } = this.parent;
            const hasSchoolTags = Array.isArray(value) && value.length > 0;
            const hasUserOptions = Array.isArray(userOptions) && userOptions.length > 0;

            return hasSchoolTags || hasUserOptions;
        }
    ),
    includeImage: Yup.boolean(),
    image: Yup.mixed().nullable(),
    predefinedImageKey: Yup.string()
        .nullable()
        .test('image-or-predefined-required', 'Please select an image (upload or select one).', function (value) {
            const { includeImage, image } = this.parent;

            if (!includeImage) return true;

            return Boolean(value || image);
        })
});

export {
    activateClassValidation,
    addAcademicYearValidation,
    addAdminValidation,
    addAndUpdateFeatureTooltipValidation,
    addChildForParentValidation,
    addChildToClassFromParentValidation,
    addClassFromAdminClassDetailsPageValidation,
    addClassValidation,
    addDomainFromAdminValidation,
    addFAQValidation,
    addFeatureValidation,
    addHolidayValidation,
    addNewsValidation,
    addParentValidation,
    addParentValidationWithEmail,
    addParentValidationWithPhone,
    addPupilToASchoolClassValidation,
    addQueryValidation,
    addResourceValidation,
    addSchoolValidation,
    addStaffValidation,
    addTeacherValidation,
    addTermValidation,
    addTopicFromAdminValidation,
    addTopicValidation,
    addTrophyCertificateFromAdminValidation,
    addYearGroupValidation,
    adminSettingValidation,
    askQuestionValidation,
    awardTrophyValidation,
    ChangePasswordValidation,
    ChangeUserPasswordValidation,
    editChildValidation,
    importWondeSchoolValidation,
    IsUserWithPassowrdExistValidation,
    leaderSettingValidation,
    LoginValidationWithEmail,
    LoginValidationWithPhone,
    notificationSettingsValidation,
    otherActivityValidation,
    parentSettingValidation,
    photoPermissionsValidation,
    photoPermissionValidation,
    PreLoginValidationWithEmail,
    PreLoginValidationWithPhone,
    readingLogValidationForAdmin,
    readingLogValidationForParent,
    readingLogValidationForReadingAsGroup,
    readingLogValidationForTeacher,
    RegisterEmailValidation,
    scheduleTopicValidation,
    scrapbookEntryValidation,
    SignupValidationForAdmin,
    SignupValidationForParent,
    SignupValidationForParentForSocialLogin,
    SignupValidationForTeacher,
    socialLoginCheck,
    TestEmailForAdminValidation,
    topicActivityValidation,
    topicDemoActivityValidation,
    transferPupilToNewParentValidation,
    updateChildValidation,
    updateHolidayValidation,
    updateNonActiveParentDetailsValidation,
    updateParentValidationForAdmin,
    updateReadingLogValidationForTeacher,
    updateSchoolImpactReportCommentCardForAdmin,
    updateTeacherValidation
};

/**
 * Admin whole-school sequences.
 *
 * Two fields, both required, because subject plus academic year is the whole identity of one. There
 * is no name to validate, deliberately: see IStaticLwpWholeSchoolSequence.
 *
 * Whether that pair is already taken is checked server-side, which is the only place that can know.
 */
export const wholeSchoolSequenceValidation = Yup.object().shape({
    subjectId: Yup.string().required('This field is required.'),
    periodIndex: Yup.string().required('This field is required.')
});
