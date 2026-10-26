import React from 'react';

import Heading2 from './../../Shared/Typography/Heading2';
import CommonParameterCard from './commonParameterCard';

const ParametersOverviewAdmin = () => {
    return (
        <div className="schools_overview" data-test={'site-parameters-page'}>
            <div className="header">
                <Heading2 text="Parameters" />
            </div>
            <CommonParameterCard
                heading="Login Page"
                parameterContent={[
                    { key: 'LOGIN_PAGE_MSG_TITLE', infoText: 'Message title shown on login page.', title: 'Title', multiline: true },
                    { key: 'LOGIN_PAGE_MSG', infoText: 'Message shown on login page.', title: 'Message', multiline: true }
                ]}
            />
            <CommonParameterCard
                heading="Release Email"
                parameterContent={[
                    {
                        key: 'WEEKDAY_TOPIC_RELEASE_EMAILS',
                        infoText: 'Time of day after which parent notification emails are sent.',
                        title: 'Weekday'
                    },
                    {
                        key: 'WEEKEND_TOPIC_RELEASE_EMAILS',
                        infoText: 'Time of day after which parent notification emails are sent.',
                        title: 'Weekend'
                    }
                ]}
            />

            <CommonParameterCard
                heading="Comment and Photo Permissions"
                list
                parameterContent={[
                    {
                        key: 'COMMENT_PHOTO_PERMISSIONS',
                        list: [
                            {
                                infoText: 'Users have to accept this condition.',
                                key: 'Mandatory',
                                title: 'mandatory',
                                multiline: true
                            },
                            {
                                infoText: 'Appears when users click the info icon shown after the mandatory checkbox text.',
                                key: 'Optional',
                                title: 'optional',
                                multiline: true
                            },
                            {
                                infoText: 'Users have to accept this condition.',
                                key: 'Mandatory info',
                                title: 'mandatory_info',
                                multiline: true
                            },
                            {
                                infoText: 'Users have to accept this condition.',
                                key: 'Optional info',
                                title: 'optional_info',
                                multiline: true
                            },
                            {
                                infoText: 'Users have to accept this condition.',
                                key: 'Mandatory privacy text',
                                title: 'mandatory_privacy_text'
                            },
                            {
                                infoText: 'Users have to accept this condition.',
                                key: 'Opted out summary',
                                title: 'opted_out_summary',
                                multiline: true
                            },
                            {
                                infoText: 'Users have to accept this condition.',
                                key: 'Opted in summary',
                                title: 'opted_in_summary',
                                multiline: true
                            },
                            {
                                infoText: 'This text will be show to the teachers when logging reading.',
                                key: 'Teacher feedback permission',
                                title: 'teacher_permission',
                                multiline: true
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Support Email"
                parameterContent={[
                    {
                        key: 'PARENT_SUPPORT_EMAIL',
                        infoText: 'Email address for parent support enquiries.',
                        title: 'parent'
                    },
                    {
                        key: 'TEACHER_SUPPORT_EMAIL',
                        infoText: 'Email address for teacher/school support enquiries.',
                        title: 'Teacher'
                    },
                    {
                        key: 'ADMIN_EMAIL_FOR_PURCHASE_LICENCE',
                        infoText: 'Admin email for license purchase.',
                        title: 'Admin'
                    }
                ]}
            />

            <CommonParameterCard
                heading="Support Phone Number"
                parameterContent={[
                    {
                        key: 'GENERAL_SUPPORT_PHONE_NUMBER',
                        infoText: 'Phone Number for general support enquiries.',
                        title: 'General'
                    },
                    {
                        key: 'TEACHER_SUPPORT_PHONE_NUMBER',
                        infoText: 'Phone Number for teacher/school support enquiries.',
                        title: 'Teacher'
                    }
                ]}
            />

            <CommonParameterCard
                heading="Magic Link Timeouts"
                list
                parameterContent={[
                    {
                        key: 'MAGIC_LINK_TIMEOUT',
                        text: 'The timeout (in hours) for magic links. If a user tries to access a magic link after it has expired, they will be sent a new link.',
                        list: [
                            {
                                key: 'Reset Password (In hours)',
                                title: 'RESETPASSWORD'
                            },
                            {
                                key: 'Invitation (In hours)',
                                title: 'INVITATION'
                            },
                            {
                                key: 'Demo Topic (In hours)',
                                title: 'DEMOTOPIC'
                            },
                            {
                                key: 'Topic Access (In hours)',
                                title: 'TOPICACCESS'
                            },
                            {
                                key: 'Reject Invitation (In hours)',
                                title: 'REJECT_INVITATION'
                            },
                            {
                                key: 'Reading (In hours)',
                                title: 'READING'
                            },
                            {
                                key: 'Trophy (In hours)',
                                title: 'TROPHY'
                            },
                            {
                                key: 'School Impact Report (In hours)',
                                title: 'SCHOOL_IMPACT_REPORT'
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="User bad login limit and timeouts"
                list
                parameterContent={[
                    {
                        key: 'MIN_BAD_LOGIN_ALLOWED',
                        text: 'The number of bad login attempts allowed if user enters wrong credentials.',
                        list: [
                            {
                                key: 'For Parent',
                                title: 'PARENT'
                            },
                            {
                                key: 'For Teacher',
                                title: 'TEACHER'
                            },
                            {
                                key: 'For Admin',
                                title: 'ADMIN'
                            }
                        ]
                    },
                    {
                        key: 'USER_LOCKED_ACCOUNT_TIMEOUT',
                        text: 'The timeout (in seconds) of user account locked.',
                        list: [
                            {
                                key: 'For Parent',
                                title: 'PARENT'
                            },
                            {
                                key: 'For Teacher',
                                title: 'TEACHER'
                            },
                            {
                                key: 'For Admin',
                                title: 'ADMIN'
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Admin social login permissions"
                list
                parameterContent={[
                    {
                        key: 'ADMIN_SOCIAL_LOGIN_PERMISSIONS',
                        list: [
                            {
                                key: 'Email',
                                title: 'email',
                                selectField: true
                            },
                            {
                                key: 'Google',
                                title: 'google',
                                selectField: true
                            },
                            {
                                key: 'Microsoft',
                                title: 'microsoft',
                                selectField: true
                            }
                        ],
                        option: [
                            { value: 'true', key: 'true' },
                            { value: 'false', key: 'false' }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Parent social login permissions"
                list
                parameterContent={[
                    {
                        key: 'PARENT_SOCIAL_LOGIN_PERMISSIONS',
                        list: [
                            {
                                key: 'Google',
                                title: 'google',
                                selectField: true
                            },
                            {
                                key: 'Microsoft',
                                title: 'microsoft',
                                selectField: true
                            }
                        ],
                        option: [
                            { value: 'true', key: 'true' },
                            { value: 'false', key: 'false' }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Minimum Password Length For Users"
                list
                parameterContent={[
                    {
                        key: 'MIN_PASSWORD_LENGTH',
                        list: [
                            {
                                key: 'For Parent',
                                title: 'PARENT'
                            },
                            {
                                key: 'For Teacher',
                                title: 'TEACHER'
                            },
                            {
                                key: 'For Admin',
                                title: 'ADMIN'
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Quota for sending emails and sms"
                list
                parameterContent={[
                    {
                        key: 'SITE_QUOTA',
                        list: [
                            {
                                key: 'For Email',
                                title: 'EMAIL'
                            },
                            {
                                key: 'For Sms',
                                title: 'SMS'
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Prices to purchase additional class licences"
                list
                parameterContent={[
                    {
                        key: 'CLASS_LICENCE_PRICE',
                        list: [
                            {
                                key: 'Full program',
                                title: 'FULL_PROGRAM'
                            },
                            {
                                key: 'Reading only',
                                title: 'READING'
                            },
                            {
                                key: 'Ready teddy',
                                title: 'READY_TEDDY'
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Cron job notification times"
                list
                parameterContent={[
                    {
                        key: 'WEEKDAY_PARENT_NOTIFICATION_TIME',
                        text: 'Time of week day during which parent emails are sent.',
                        list: [
                            {
                                key: 'Start time (use 24-hour clock system)',
                                title: 'startTime'
                            },
                            {
                                key: 'End Time (use 24-hour clock system)',
                                title: 'endTime'
                            }
                        ]
                    },
                    {
                        key: 'WEEKEND_PARENT_NOTIFICATION_TIME',
                        text: 'Time of weekend during which parent emails are sent.',
                        list: [
                            {
                                key: 'Start time (use 24-hour clock system)',
                                title: 'startTime'
                            },
                            {
                                key: 'End Time (use 24-hour clock system)',
                                title: 'endTime'
                            }
                        ]
                    },
                    {
                        key: 'TEACHER_NOTIFICATION_TIME',
                        text: 'Time of day during which teacher emails are sent.',
                        list: [
                            {
                                key: 'Start time (use 24-hour clock system)',
                                title: 'startTime'
                            },
                            {
                                key: 'End Time (use 24-hour clock system)',
                                title: 'endTime'
                            }
                        ]
                    }
                ]}
            />

            <CommonParameterCard
                heading="Others"
                parameterContent={[
                    {
                        key: 'RELEASED_TIME',
                        infoText: 'Time of day from which new topics are available to pupils.',
                        title: 'Released time'
                    },
                    {
                        key: 'CSV_CHUNK_LIMIT',
                        infoText: 'The number of rows read from the database at a time.',
                        title: 'CSV chunk limit'
                    },
                    {
                        key: 'TYPEFORM_ACCESS_TOKEN',
                        title: 'Typeform Access Token',
                        infoText: 'Typeform access token to fetch information about forms from typeform api'
                    },
                    {
                        key: 'WONDE_REIMPORT_FREQUENCY',
                        infoText: 'How frequently to reimport data for all schools from Wonde.',
                        title: 'Wonde reimport frequency',
                        option: [
                            { value: 'DAILY', key: 'DAILY' },
                            { value: 'WEEKLY', key: 'WEEKLY' },
                            { value: 'NEVER', key: 'NEVER' }
                        ],
                        selectFeild: true
                    },
                    {
                        key: 'SET_AUDIO_LIMIT',
                        infoText: 'Set audio in seconds',
                        title: 'Audio limit'
                    },
                    // {
                    //     key: 'SAVE_USER_AUDIO_AS_MP3',
                    //     infoText: 'If this parameter is true then user audio will be save in .mp3 format otherwise in webm',
                    //     title: 'Save user audio as mp3',
                    //     option: [
                    //         { value: 'true', key: 'true' },
                    //         { value: 'false', key: 'false' }
                    //     ],
                    //     selectFeild: true
                    // },
                    {
                        key: 'SEND_TOPIC_EMAILS_TO_INVITED_USER',
                        infoText: 'If this parameter is true then pupil topic emails will go to invited users also.',
                        title: 'Send topic emails to invited user',
                        option: [
                            { value: 'true', key: 'true' },
                            { value: 'false', key: 'false' }
                        ],
                        selectFeild: true
                    }
                ]}
            />
        </div>
    );
};

export default ParametersOverviewAdmin;
