export const appConstants = {
    jwt: {
        secret: '$2y$12$ScZusrKd/mTM0UjJVjhEq./8vJBfiXY0Q.LzDALfiX3RIZ8o8a6cW ',
        expiresIn: '12h'
    },
    media: {
        bigImage: 600,
        thumbnailSize: 200,
        presignedDurationInMins: 5
    },
    mailTemplateIds: {
        parentInvitationTemplateId: 61,
        schoolLeaderInvitationTemplateId: 60,
        teacherInvitationTemplateId: 59,
        adminInvitationTemplateId: 66,
        forgottenPasswordTemplateId: 62,
        assignTeacherToClassTemplateId: 58,
        assignParentToPupilTemplateId: 57,
        parentSignedUpWelcomeTemplateId: 53, // no longer used but reserved
        teacherSignedUpWelcomeTemplateId: 56, // no longer used but reserved
        questionUserEmailTemplateId: 67,
        questionStaffEmailTemplateId: 68,
        topicsReleaseForPupilTemplateId: 54,
        topicToBeReleasedForTeacherTemplateId: 69,
        oneThirdPupilSignUpTemplateId: 63, // no longer used but reserved
        twoThirdPupilSignUpTemplateId: 64, // no longer used but reserved
        allPupilSignUpTemplateId: 65, // no longer used but reserved
        topicReminderAfter7daysTemplateId: 55,
        parentReInvitationTemplateId: 61,
        pupilGenerateCertificateId: 112,
        pupilTrophyId: 164,
        teacherTrophyId: 165,
        pupilInvitationForParentTemplateId: 231
    },
    vimeoBaseUrl: 'https://player.vimeo.com/video',
    minioPaths: {
        public: {
            mathscotItems: 'static/img/mathscots/MONKEY',
            cardIconsForActivites: 'static/img/activity_icon',
            cardIconsForTopics: 'static/img/topic_icon',
            imageActivitySteps: 'static/img/activity_step',
            fileActivitySteps: 'static/activity_file_step',
            topicTeacherResources: 'static/topic_teacher_resources',
            trophies: 'static/trophies',
            siteImage: 'static/img/site',
            featureTooltipIcon: 'static/img/feature_tooltip_icon',
            schoolLogoImage: 'user/img/school_logos',
            teacherResources: 'static/teacher_resources',
            generatedMathscotImages: 'generated/img/mathscots',
            mathscotItemIcons: 'static/img/mathscot_items',
            staticCertificates: 'static/certificates',
            adminResources: 'static/assets/docs',
            pupilMathscots: 'static/img/mathscots',
            pupilMathscotIcons: 'static/img/mathscots/icons',
            uploadedStickers: 'upload/photos/stickers',
            uploadedPageAnnouncementIcons: 'upload/photos/page_announcement_icons',
            defaultPageAnnouncementIcons: 'upload/photos/page_announcement_icons/default',
            uploadedStickersCharacterItem: 'upload/photos/character_item',
            uploadedProgramLogo: 'upload/program/logo',
            uploadedSetByTeacherImage: 'upload/set_by_teacher/images',
            uploadedSetByTeacherAudio: 'upload/set_by_teacher/audios',
            uploadedProgramCharacter: 'upload/program/character'
        },
        usermedia: {
            uploadedImages: 'upload/parent_photos',
            uploadedReadingImages: 'upload/readingphoto',
            uploadedReadingAudio: 'upload/readingaudio',
            uploadedScrapbookImages: 'upload/scrapbook_photos',
            uploadedScrapbookAudio: 'upload/scrapbook_audio',
            schoolImpactReportPhotos: 'upload/school_impact_report_photos',
            classData: 'generated/classdata',
            adminData: 'generated/admin_data',
            queryData: 'generated/query_data',
            schoolStatistics: 'generated/schoolStatistics',
            generatedCertificates: 'generated/pdf/certificates'
        }
    },
    testing: {
        mockUPNPrefix: 'LWP_TESTING_'
    }
};
