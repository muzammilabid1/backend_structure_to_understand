export const preLoginQuery = (userEmail) => ({
    operationName: 'preLogin',
    variables: {
        emailOrPhone: userEmail,
    },
    query: `query preLogin($emailOrPhone: String!) {
        preLogin(emailOrPhone: $emailOrPhone) {
            emailOrPhone
            status
            methods
            canSendEmail
            canSendSms
            __typename
        }
    }`,
});

export const refreshSessionQuery = (refreshToken) => ({
    operationName: 'refreshSession',
    variables: {
        refreshToken: refreshToken,
    },
    query: `mutation refreshSession($refreshToken: String!) {
        refreshSession(refreshToken: $refreshToken) {
            accessToken
            refreshToken
            __typename
        }
    }`,
});

export const createFeedbackReply = (feedbackId, reply) => ({
    operationName: 'createFeedbackReply',
    variables: {
        input: {
            feedbackId: feedbackId,
            reply: reply,
        },
    },
    query: `mutation createFeedbackReply($input: CreateFeedbackReplyInput!) {
        createFeedbackReply(input: $input) {
            id
            reply
            logCreatedAt
            logUpdatedAt
            type
            logCreatedBy {
                id
                nameForChildren
                __typename
            }
            __typename
        }
    }`,
});

export const loginQuery = (userEmail, userPassword, rememberUser = false) => ({
    operationName: 'login',
    variables: {
        emailOrPhone: userEmail,
        token: userPassword,
        remember: rememberUser,
        provider: 'Password',
    },
    query: `mutation login($emailOrPhone: String!, $token: String!, $remember: Boolean!, $provider: AuthMethod!) {
            login(
                emailOrPhone: $emailOrPhone
                authToken: $token
                provider: $provider
                remember: $remember
            ) {
                accessToken
                refreshToken
                __typename
            }
        }`,
});

export const getServerUptimeQuery = () => {
    return {
        operationName: 'getServerUptime',
        variables: {},
        query: `query getServerUptime {
            getServerUptime {
                buildType
                serverUptime
                __typename
            }
        }`,
    };
};

export const getPupilInvitationsQuery = (parentId) => ({
    operationName: 'getPupilInvitations',
    variables: {
        id: parentId,
    },
    query: `query getPupilInvitations($id: String!) {
        getPupilInvitations(id: $id) {
            id
            pupil {
                firstname
                lastname
                school {
                    schoolName
                    __typename
                }
                __typename
            }
            __typename
        }
    }`,
});

export const getPupilsQuery = (parentId, isActiveInCurrentAcademic = true) => ({
    operationName: 'getPupils',
    variables: {
        parentId: parentId,
        isActiveInCurrentAcademic: isActiveInCurrentAcademic,
    },
    query: `query getPupils($parentId: String!, $isActiveInCurrentAcademic: Boolean!) {
        getPupils(parentId: $parentId, isActiveInCurrentAcademic: $isActiveInCurrentAcademic) {
            id
            fullname
            firstname
            yearGroup
            parents {
                id
                pupilId
                parentId
                status
                showInterstitial
                __typename
            }
            currentClass {
                name
                yearGroup {
                    year
                    __typename
                }
                __typename
            }
            type
            school {
                schoolName
                __typename
            }
            currentMathscot {
                character
                colour
                __typename
            }
            mathscotUrl {
                thumbnailImage
                __typename
            }
            __typename
        }
    }`,
});

export const haveUnTickedFeedbacksQuery = (
    schoolId,
    teacherId,
    filter = {
        postedBefore: null,
        postedAfter: null,
        classIds: [],
        activity: 'ALL',
        media: 'ALL',
        sharingPermitted: false,
        bookName: '',
        academicYear: null,
    },
) => ({
    operationName: 'haveUnTickedFeedbacks',
    variables: {
        teacherId: teacherId,
        schoolId: schoolId,
        filter: filter,
    },
    query: `
        query haveUnTickedFeedbacks(
            $teacherId: String,
            $filter: PupilActivityFeedsFilterInput,
            $pupilId: String,
            $schoolId: String!
        ) {
            haveUnTickedFeedbacks(
                teacherId: $teacherId,
                pupilId: $pupilId,
                schoolId: $schoolId,
                filter: $filter
            )
        }
    `,
});

export const createFeedbackReplyQuery = (feedbackId, reply) => ({
    operationName: 'createFeedbackReply',
    variables: {
        input: {
            feedbackId: feedbackId,
            reply: reply,
        },
    },
    query: `mutation createFeedbackReply($input: CreateFeedbackReplyInput!) {
        createFeedbackReply(input: $input) {
            id
            reply
            logCreatedAt
            logUpdatedAt
            type
            logCreatedBy {
                id
                nameForChildren
                __typename
            }
            __typename
        }
    }`,
});

export const createFeedbackReplyWithStickerQuery = (feedbackId, stickerId) => ({
    operationName: 'createFeedbackReply',
    variables: {
        input: {
            feedbackId: feedbackId,
            stickerId: stickerId,
        },
    },
    query: `mutation createFeedbackReply($input: CreateFeedbackReplyInput!) {
        createFeedbackReply(input: $input) {
            id
            logCreatedAt
            logUpdatedAt
            type
            sticker {
                id
                alt
                imageUrl
                __typename
            }
            logCreatedBy {
                id
                nameForChildren
                __typename
            }
            __typename
        }
    }`,
});

export const createFeedbackReplyWithCommentQuery = (feedbackId, comment) => ({
    operationName: 'createFeedbackReply',
    variables: {
        input: {
            feedbackId: feedbackId,
            reply: comment,
        },
    },
    query: `mutation createFeedbackReply($input: CreateFeedbackReplyInput!) {
        createFeedbackReply(input: $input) {
            id
            logCreatedAt
            logUpdatedAt
            type
            logCreatedBy {
                id
                nameForChildren
                __typename
            }
            __typename
        }
    }`,
});

export const getStickersForTeacherQuery = (schoolId) => ({
    operationName: 'getStickersForTeacher',
    variables: {
        schoolId: schoolId,
    },
    query: `query getStickersForTeacher($schoolId: String!) {
      getStickersForTeacher(schoolId: $schoolId) {
        id
        fileName
        imageUrl
        alt
        __typename
      }
    }`,
});

export const getPupilActivityFeedsQuery = (
    teacherId,
    offset = 0,
    limit = 5,
    filter = {
        postedBefore: null,
        postedAfter: null,
        classIds: [],
        activity: 'ALL',
        media: 'ALL',
    },
) => ({
    operationName: 'getPupilActivityFeeds',
    variables: {
        teacherId: teacherId,
        offset: offset,
        limit: limit,
        filter: filter,
    },
    query: `query getPupilActivityFeeds(
        $teacherId: String!,
        $offset: Float,
        $limit: Float,
        $filter: PupilActivityFeedsFilterInput
    ) {
        getPupilActivityFeeds(
            teacherId: $teacherId,
            offset: $offset,
            limit: $limit,
            filter: $filter
        ) {
            total
            limit
            offset
            results {
                id
                pupilComment
                parentComment
                logCreatedAt
                className
                isFeedbackForMultipleClasses
                pupilCount
                school {
                    id
                    __typename
                }
                feedbackReplies {
                    id
                    reply
                    logCreatedAt
                    logUpdatedAt
                    originalFeedbackReplyId
                    originalFeedbackReplyDeletedAt
                    type
                    sticker {
                        id
                        alt
                        imageUrl
                        __typename
                    }
                    logCreatedBy {
                        id
                        nameForChildren
                        __typename
                    }
                    __typename
                }
                tickedAt
                tickedBy {
                    nameForChildren
                    __typename
                }
                photos {
                    id
                    filename
                    __typename
                }
                bookName
                bookReadAt
                pageNumber
                isBookFinished
                comment
                privateNote
                includeInReadingTarget
                type
                audios {
                    id
                    filename
                    __typename
                }
                userId
                userType
                logCreatedBy {
                    id
                    firstname
                    lastname
                    nameForChildren
                    __typename
                }
                pupilTopic {
                    id
                    class {
                        id
                        name
                        __typename
                    }
                    __typename
                }
                type
                description
                sharingAllowed
                pupil {
                    id
                    fullname
                    mathscotUrl {
                        thumbnailImage
                        __typename
                    }
                    parents {
                        parent {
                            firstname
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                activity {
                    topic {
                        id
                        classTopic {
                            id
                            topic {
                                id
                                teacherTopicName
                                __typename
                            }
                            class {
                                id
                                name
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    activity {
                        name
                        topic {
                            teacherTopicName
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                lastAction {
                    updatedAt
                    __typename
                }
                entryDeletedAt
                originalFeedbackId
                __typename
            }
            __typename
        }
    }
    `,
});

export const shouldCountTowardsWeeklyReadingTargetQuery = (
    pupilIds = [],
    readingDate = null,
) => ({
    operationName: 'shouldCountTowardsWeeklyReadingTarget',
    variables: {
        pupilIds: pupilIds,
        readingDate: readingDate,
    },
    query: `
    query shouldCountTowardsWeeklyReadingTarget($pupilIds: [String!]!, $readingDate: DateTime!) {
      shouldCountTowardsWeeklyReadingTarget(
        pupilIds: $pupilIds
        readingDate: $readingDate
      )
    }`,
});

export const getClassesAndGroupsInfoOfPupilsQuery = (
    schoolId,
    readingOnly = true,
    classId = null,
) => ({
    operationName: 'getClassesAndGroupsInfoOfPupils',
    variables: {
        schoolId: schoolId,
        readingOnly: readingOnly,
        classId: classId,
    },
    query: `
    query getClassesAndGroupsInfoOfPupils($schoolId: String!, $classId: String, $readingOnly: Boolean!) {
      getClassesAndGroupsInfoOfPupils(
        schoolId: $schoolId
        classId: $classId
        readingOnly: $readingOnly
      ) {
        id
        pupilName
        groups {
          id
          name
          yearGroup
          __typename
        }
        classes {
          id
          name
          yearGroup
          __typename
        }
        __typename
      }
    }
  `,
});

export const getFeedbackForGroupReadingQuery = (
    schoolId,
    offset = 0,
    limit = 5,
    pupilIds = [],
) => ({
    operationName: 'getFeedbackForGroupReading',
    variables: {
        schoolId: schoolId,
        classId: null,
        offset: offset,
        limit: limit,
        pupilIds: pupilIds,
    },
    query: `
        query getFeedbackForGroupReading(
            $schoolId: String!,
            $classId: String,
            $offset: Float,
            $limit: Float,
            $pupilIds: [String!]
        ) {
            getFeedbackForGroupReading(
                schoolId: $schoolId
                classId: $classId
                offset: $offset
                limit: $limit
                pupilIds: $pupilIds
            ) {
                total
                limit
                offset
                results {
                    id
                    pupilComment
                    parentComment
                    logCreatedAt
                    className
                    pupilCount
                    photos {
                        id
                        filename
                        __typename
                    }
                    school {
                        id
                        __typename
                    }
                    bookName
                    bookReadAt
                    pageNumber
                    isBookFinished
                    comment
                    privateNote
                    includeInReadingTarget
                    type
                    feedbackReplies {
                        id
                        reply
                        logCreatedAt
                        logUpdatedAt
                        type
                        originalFeedbackReplyId
                        originalFeedbackReplyDeletedAt
                        sticker {
                            alt
                            id
                            imageUrl
                            __typename
                        }
                        logCreatedBy {
                            id
                            nameForChildren
                            __typename
                        }
                        __typename
                    }
                    tickedAt
                    tickedBy {
                        nameForChildren
                        __typename
                    }
                    audios {
                        id
                        filename
                        __typename
                    }
                    pupil {
                        id
                        fullname
                        __typename
                    }
                    pupils {
                        id
                        __typename
                    }
                    userId
                    userType
                    logCreatedBy {
                        id
                        firstname
                        lastname
                        nameForChildren
                        __typename
                    }
                    description
                    sharingAllowed
                    readingType
                    userName
                    pupilTopic {
                        id
                        __typename
                    }
                    activity {
                        id
                        earnedStar
                        topic {
                            id
                            __typename
                        }
                        activity {
                            name
                            topic {
                                id
                                teacherTopicName
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    lastAction {
                        updatedAt
                        __typename
                    }
                    originalFeedbackId
                    entryDeletedAt
                    __typename
                }
                __typename
            }
        }
    `,
});

export const getClassesForFeedbackFilterQuery = (
    periodIndex = null,
    teacherId,
) => ({
    operationName: 'getClassesForFeedbackFilter',
    variables: {
        periodIndex: periodIndex,
        teacherId: teacherId,
    },
    query: `query getClassesForFeedbackFilter($periodIndex: String, $teacherId: String!) {
      getClassesForFeedbackFilter(periodIndex: $periodIndex, teacherId: $teacherId) {
        id
        name
        isMyClass
        hasReadingTopics
        topicCount
        hasCurrentTopic
        classGroups {
          id
          name
          hasReadingTopics
          topicCount
          hasCurrentTopic
          __typename
        }
        __typename
      }
    }`,
});

export const getSchoolClassesAndGroupsQuery = (schoolId, myClasses = true) => ({
    operationName: 'getSchoolClassesAndGroups',
    variables: {
        schoolId: schoolId,
        myClasses: myClasses,
    },
    query: `query getSchoolClassesAndGroups($schoolId: String!, $myClasses: Boolean!) {
        getSchoolClassesAndGroups(schoolId: $schoolId, myClasses: $myClasses) {
            id
            name
            isMyClass
            isFullProgramme
            IsReadingLogsEnabled
            isReadyTeddyClass
            status
            groups {
                id
                name
                isMyGroup
                isReadingClass
                hasTopics
            }
        }
    }`,
});

export const getSchoolQuery = (schoolId) => ({
    operationName: 'getSchool',
    variables: {
        id: schoolId,
    },
    query: `query getSchool($id: String!) {
        getSchool(id: $id) {
            schoolName
            impactReportExists
            isMoneySkillsAvailable
            isDownloadSchoolData
            features {
                code
                __typename
            }
            curentPeriod {
                index
                shortName
                nextPeriod {
                    index
                    shortName
                    __typename
                }
                __typename
            }
            pupilsWithoutClassesCount {
                currentYear
                nextYearNonIgnoredPupils
                __typename
            }
            __typename
        }
    }`,
});

export const pupilQuery = (pupilId) => ({
    operationName: 'pupil',
    variables: {
        id: pupilId,
    },
    query: `query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            isActiveInCurrentAcademicYear
            currentClass {
                id
                isFullProgramme
                IsReadingLogsEnabled
                isReadyTeddyEnabled
                isPreAdmissionClass
                __typename
            }
            previousMathscotImage
            parentWatchedIntroVideo
            currentMathscot {
                character
                colour
                __typename
            }
            type
            mathscotUrl {
                bigImage
                thumbnailImage
                __typename
            }
            __typename
        }
    }`,
});

export const getUserQuery = (id) => ({
    operationName: 'getUser',
    variables: {
        id: id,
    },
    query: `query getUser($id: String!) {
        getUser(id: $id) {
            type
            showInterstitial {
                id
                name
                __typename
            }
            __typename
        }
    }`,
});

export const getUnseenFeatureTooltipsQuery = () => ({
    operationName: 'getUnseenFeatureTooltips',
    variables: {},
    query: `query getUnseenFeatureTooltips {
        getUnseenFeatureTooltips {
            id
            targetId
            message
            order
            imageUrl
            __typename
        }
    }`,
});

export const getRecommendedPupilTopicsQuery = (pupilId) => ({
    operationName: 'getRecommendedPupilTopics',
    variables: {
        id: pupilId,
    },
    query: `query getRecommendedPupilTopics($id: String!) {
        getRecommendedPupilTopics(id: $id) {
            id
            period {
                index
                __typename
            }
            silverStars
            earnedGoldStar
            releaseDate
            watchedVideo
            readingTarget
            activities {
                id
                activity {
                    name
                    cardImage
                    __typename
                }
                feedbacks {
                    pupilComment
                    __typename
                }
                __typename
            }
            pupil {
                school {
                    curentPeriod {
                        index
                        __typename
                    }
                    __typename
                }
            }
            classTopic {
                dueDate
                __typename
            }
            topic {
                id
                parentTopicName
                teacherTopicName
                videoThumb
                isReading
                video
                isReading
                __typename
            }
            __typename
        }
    }`,
});

export const allPupilReadingLogsQuery = (pupilId, offset = 0, limit = 5) => ({
    operationName: 'allPupilReadingLogs',
    variables: {
        pupilId: pupilId,
        offset: offset,
        limit: limit,
    },
    query: `query allPupilReadingLogs($pupilId: String!, $limit: Float, $offset: Float) {
        allPupilReadingLogs(pupilId: $pupilId, limit: $limit, offset: $offset) {
            total
            limit
            offset
            page_total
            results {
                id
                bookName
                bookReadAt
                isBookFinished
                comment
                sharingAllowed
                logCreatedAt
                type
                pupilCount
                includeInReadingTarget
                readingType
                feedbackReplies {
                    id
                    reply
                    logCreatedAt
                    logUpdatedAt
                    originalFeedbackReplyId
                    originalFeedbackReplyDeletedAt
                    type
                    sticker {
                        alt
                        imageUrl
                        __typename
                    }
                    logCreatedBy {
                        nameForChildren
                        __typename
                    }
                    __typename
                }
                tickedAt
                tickedBy {
                    nameForChildren
                    __typename
                }
                audios {
                    id
                    filename
                    __typename
                }
                photos {
                    id
                    filename
                    __typename
                }
                userId
                userType
                pageNumber
                userName
                logCreatedBy {
                    nameForChildren
                    id
                    firstname
                    lastname
                    __typename
                }
                pupilTopic {
                    id
                    releaseDate
                    __typename
                }
                lastAction {
                    updatedAt
                    __typename
                }
                originalFeedbackId
                entryDeletedAt
                __typename
            }
            __typename
        }
    }`,
});

export const getPupilReadingNoteQuery = (pupilId, pupilTopicId) => ({
    operationName: 'getPupilReadingNote',
    variables: {
        pupilId: pupilId,
        pupilTopicId: pupilTopicId,
    },
    query: `query getPupilReadingNote($pupilId: String!, $pupilTopicId: String!) {
        getPupilReadingNote(pupilId: $pupilId, pupilTopicId: $pupilTopicId) {
            headingText
            messageText
            classReadingTarget
            pupilEarnedStars
            __typename
        }
    }`,
});

export const getParameterByKeyQuery = (key) => ({
    operationName: 'getParameterByKey',
    variables: {
        key: key,
    },
    query: `query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
            __typename
        }
    }`,
});

export const getPupilReadingTopicQuery = (pupilId, topicId) => ({
    operationName: 'getPupilReadingTopic',
    variables: {
        pupilId: pupilId,
        topicId: topicId,
    },
    query: `query getPupilReadingTopic($pupilId: String!, $topicId: String!) {
        getPupilReadingTopic(pupilId: $pupilId, topicId: $topicId) {
            prevReadingTopicId
            nextReadingTopicId
            readingTopic {
                id
                releaseDate
                class {
                    id
                    name
                    __typename
                }
                readingLogFeedbacks {
                    id
                    bookReadAt
                    logCreatedAt
                    bookName
                    __typename
                }
                __typename
            }
            __typename
        }
    }`,
});

export const getReadingTopicsQuery = (pupilId) => ({
    operationName: 'getReadingTopics',
    variables: {
        pupilId: pupilId,
    },
    query: `query getReadingTopics($pupilId: String!) {
        getReadingTopics(pupilId: $pupilId) {
            releaseDate
            id
            readingLogFeedbacks {
                id
                userType
                bookReadAt
                includeInReadingTarget
                logCreatedAt
                bookName
                lastAction {
                    updatedAt
                    __typename
                }
                __typename
            }
            __typename
        }
    }`,
});

export const getPupilRecentBookLogsQuery = (
    pupilId,
    bookName = '',
    readingType = 'SCHOOL_BOOK',
) => ({
    operationName: 'getPupilRecentBookLogs',
    variables: {
        input: {
            pupilId: pupilId,
            bookName: bookName,
            readingType: readingType,
        },
    },
    query: `query getPupilRecentBookLogs($input: PupilRecentBookLogsInput!) {
        getPupilRecentBookLogs(input: $input) {
            bookName
            isBookFinished
            pageNumber
            __typename
        }
    }`,
});

function pickRandomDateOneWeekInPast() {
    const now = new Date();
    const oneWeekAgoInMilliseconds = new Date(
        now.getTime() - 7 * 24 * 60 * 1000,
    );

    const randomTimeWithinAPastWeek =
        oneWeekAgoInMilliseconds.getTime() +
        Math.random() * (now.getTime() - oneWeekAgoInMilliseconds.getTime());

    return new Date(randomTimeWithinAPastWeek);
}

export const addReadingLogMutation = (
    pupilId,
    readingType = 'SCHOOL_BOOK',
    bookName = 'Animal Farm',
    includeInReadingTarget = false,
    userName = null,
    userType = 'PARENT',
    comment = 'test',
    isBookFinished = true,
    pageNumber = '',
    bookReadAt = pickRandomDateOneWeekInPast(),
    pupilTopicId,
    sharingAllowedGlobal = true,
    sharingAllowed = true,
    photo = null,
    audio = null,
) => ({
    operationName: 'addReadingLog',
    variables: {
        input: {
            pupilId: pupilId,
            readingType: readingType,
            bookName: bookName,
            includeInReadingTarget: includeInReadingTarget,
            userName: userName,
            userType: userType,
            comment: comment,
            isBookFinished: isBookFinished,
            pageNumber: pageNumber,
            bookReadAt: bookReadAt,
            pupilTopicId: pupilTopicId,
            sharingAllowedGlobal: sharingAllowedGlobal,
            sharingAllowed: sharingAllowed,
            photo: photo,
            audio: audio,
        },
    },
    query: `mutation addReadingLog($input: AddReadingLogInput!) {
        addReadingLog(input: $input) {
            id
            bookName
            bookReadAt
            isBookFinished
            comment
            sharingAllowed
            readingType
            includeInReadingTarget
            audios {
                id
                filename
                __typename
            }
            photos {
                id
                filename
                __typename
            }
            userId
            userType
            pageNumber
            userName
            logCreatedBy {
                nameForChildren
                __typename
            }
            pupilTopic {
                id
                releaseDate
                __typename
            }
            pupilCount
            __typename
        }
    }`,
});

export const getReadyTeddyClassesQuery = (schoolId) => ({
    operationName: 'getReadyTeddyClasses',
    variables: {
        schoolId: schoolId,
    },
    query: `query getReadyTeddyClasses($schoolId: String!) {
        getReadyTeddyClasses(schoolId: $schoolId) {
            id
            name
            isMyClass
            status
            isReadyTeddyClass
            groups {
                id
                name
                isMyGroup
            }
            __typename
        }
    }`,
});

/**
 * @typedef {Object} AddReadingLogAsGroupInput
 * @property {string[]} pupilIds
 * @property {string} bookName
 * @property {string} userName
 * @property {string} userType
 * @property {string} comment
 * @property {boolean} includeInReadingTarget
 * @property {string} privateNote
 * @property {boolean} isBookFinished
 * @property {number} pageNumber
 * @property {string} bookReadAt
 * @property {string} schoolId
 * @property {string} audio
 */

/**
 * Creates a mutation for adding a reading log as a group.
 *
 * @param {AddReadingLogAsGroupInput} input - The parameters for the mutation.
 * @returns {{operationName: string, variables: {readingLogInput: AddReadingLogAsGroupInput}}}
 */

export const addReadingLogAsGroupMutation = (readingLogInput) => ({
    operationName: 'addReadingLogAsGroup',
    variables: {
        input: {
            pupilIds: readingLogInput.pupilIds,
            bookName: readingLogInput.bookName,
            userName: readingLogInput.userName,
            userType: readingLogInput.userType,
            comment: readingLogInput.comment,
            includeInReadingTarget: readingLogInput.includeInReadingTarget,
            privateNote: readingLogInput.privateNote,
            isBookFinished: readingLogInput.isBookFinished,
            pageNumber: readingLogInput.pageNumber,
            bookReadAt: readingLogInput.bookReadAt,
            schoolId: readingLogInput.schoolId,
            audio: readingLogInput.audio,
        },
    },
    query: `
        mutation addReadingLogAsGroup($input: AddReadingLogAsGroupInput!) {
            addReadingLogAsGroup(input: $input) {
                id
                pupilComment
                parentComment
                logCreatedAt
                className
                pupilCount
                photos {
                    id
                    filename
                    __typename
                }
                school {
                    id
                    __typename
                }
                bookName
                bookReadAt
                pageNumber
                isBookFinished
                comment
                privateNote
                includeInReadingTarget
                type
                feedbackReplies {
                    id
                    reply
                    logCreatedAt
                    logUpdatedAt
                    type
                    originalFeedbackReplyId
                    originalFeedbackReplyDeletedAt
                    sticker {
                        alt
                        id
                        imageUrl
                        __typename
                    }
                    logCreatedBy {
                        id
                        nameForChildren
                        __typename
                    }
                    __typename
                }
                tickedAt
                tickedBy {
                    nameForChildren
                    __typename
                }
                audios {
                    id
                    filename
                    __typename
                }
                pupil {
                    id
                    fullname
                    __typename
                }
                pupils {
                    id
                    __typename
                }
                userId
                userType
                logCreatedBy {
                    id
                    firstname
                    lastname
                    nameForChildren
                    __typename
                }
                description
                sharingAllowed
                readingType
                userName
                pupilTopic {
                    id
                    __typename
                }
                activity {
                    id
                    earnedStar
                    topic {
                        id
                        __typename
                    }
                    activity {
                        name
                        topic {
                            id
                            teacherTopicName
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                lastAction {
                    updatedAt
                    __typename
                }
                originalFeedbackId
                entryDeletedAt
                __typename
            }
        }
    `,
});

export const getSchoolClassAndGroupsQuery = (id, myClasses = true) => ({
    operationName: 'getSchoolClassesAndGroups',
    variables: {
        schoolId: id,
        myClasses: myClasses,
    },
    query: `query getSchoolClassesAndGroups($schoolId: String!, $myClasses: Boolean!) {
      getSchoolClassesAndGroups(schoolId: $schoolId, myClasses: $myClasses) {
        id
        name
        isMyClass
        isFullProgramme
        IsReadingLogsEnabled
        isReadyTeddyClass
        status
        groups {
          id
          name
          isMyGroup
          isReadingClass
          hasTopics
          __typename
        }
        __typename
      }
    }`,
});

export const schoolClassQuery = (id) => ({
    operationName: 'schoolClass',
    variables: {
        id: id,
    },
    query: `query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            registerCount
            missingCount
            activeCount
            status
            isFullProgramme
            IsReadingLogsEnabled
            isReadyTeddyClass
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
            }
            teachers {
                id
                firstname
                lastname
            }
            school {
                id
                schoolName
            }
            period {
                index
                shortName
            }
        }
    }`,
});

export const getClassTopicForWeekByWeekQuery = (classId, topicId = null) => ({
    operationName: 'getClassTopicForWeekByWeek',
    variables: {
        classId: classId,
        ...(topicId && { topicId: topicId }),
    },
    query: `query getClassTopicForWeekByWeek($classId: String!, $topicId: String) {
        getClassTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
            topicId
            nextTopicId
            previousTopicId
            teacherTopicName
            releaseDate
            dueDate
            teacherMessage
            isReleased
            statistics {
                completed
                notStarted
                inProgress
            }
            pupilTopics {
                id
                watchedVideo
                pupil {
                    id
                    fullname
                    pupilStatus
                }
                activities {
                    id
                    earnedStar
                }
            }
        }
    }`,
});

export const getClassTopicsQuery = (classId) => ({
    operationName: 'getClassTopics',
    variables: {
        classId: classId,
    },
    query: `query getClassTopics($classId: String!) {
        getClassTopics(classId: $classId) {
            id
            releaseDate
            dueDate
            teacherMessage
            released
            readingNote
            readingTarget
            statistics {
                completed
                notStarted
                inProgress
            }
            topic {
                id
                teacherTopicName
                year
                isReading
                teacherDescription
                yearGroups {
                    id
                    year
                    shortName
                }
                domains {
                    id
                    title
                    subject {
                        id
                        name
                    }
                }
            }
            class {
                id
                name
                IsReadingLogsEnabled
                yearGroup {
                    year
                }
            }
        }
    }`,
});

export const getClassReadingTopicForWeekByWeekQuery = (
    classId,
    topicId = null,
) => ({
    operationName: 'getClassReadingTopicForWeekByWeek',
    variables: { classId, topicId },
    query: `query getClassReadingTopicForWeekByWeek($classId: String!, $topicId: String) {
        getClassReadingTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
            topicId
            nextTopicId
            previousTopicId
            teacherTopicName
            releaseDate
            readingNote
            readingTarget
            isReleased
            activeDateString
            readingStartDay
            statistics {
                completed
                inProgress
                notStarted
                __typename
            }
            pupilTopics {
                id
                earnedGoldStar
                silverStars
                feedbacks {
                    bookReadAt
                    isReadAtHome
                    isReadAtSchool
                    isReadingWithGroup
                    __typename
                }
                pupil {
                    id
                    fullname
                    pupilStatus
                    school {
                        id
                        __typename
                    }
                    tags {
                        id
                        name
                        color
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }`,
});

export const schoolClassDetailQuery = (id) => ({
    operationName: 'schoolClass',
    variables: { id },
    query: `query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            registerCount
            schoolClassName
            missingCount
            subjects {
                id
                name
                __typename
            }
            status
            isRegistrationClass
            activeCount
            readingStartDay
            isLocked
            readingTarget
            IsReadingLogsEnabled
            readingLaunchDate
            isFullProgramme
            isReadyTeddyClass
            attentionRequiredPupilsCount
            parentClass {
                id
                name
                __typename
            }
            yearGroup {
                id
                year
                __typename
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
                __typename
            }
            teachers {
                id
                firstname
                lastname
                __typename
            }
            classTopicContext {
                hasReadingTopic
                hasTopics
                __typename
            }
            school {
                id
                schoolName
                misName
                isMoneySkillsAvailable
                isMoneySkillsEnabledForSchool
                isWondeDataSyncedWithLwp
                curentPeriod {
                    index
                    __typename
                }
                __typename
            }
            period {
                index
                shortName
                __typename
            }
            importedSchoolClass {
                id
                name
                code
                __typename
            }
            currentReadingWeek {
                id
                __typename
            }
            __typename
        }
    }`,
});

export const addClassTopicMutation = (input) => ({
    operationName: 'addClassTopic',
    variables: { input },
    query: `mutation addClassTopic($input: ClassTopicInput!) {
        addClassTopic(input: $input) {
            id
            __typename
        }
    }`,
});

export const schoolClassPupilsQuery = (id) => ({
    operationName: 'schoolClass',
    variables: { id },
    query: `query schoolClass($id: String!) {
        schoolClass(id: $id) {
            isRegistrationClass
            school {
                curentPeriod {
                    index
                    __typename
                }
                __typename
            }
            pupils {
                classes {
                    id
                    isRegistrationClass
                    period {
                        index
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }`,
});

export const allYearGroupsWithTopicsQuery = (schoolId, classId) => ({
    operationName: 'allYearGroupsWithTopics',
    variables: {
        schoolId: schoolId,
        classId: classId,
    },
    query: `query allYearGroupsWithTopics($schoolId: String!, $classId: String) {
        allYearGroupsWithTopics(schoolId: $schoolId, classId: $classId) {
            id
            year
            shortName
            __typename
        }
    }`,
});

export const allSubjectsWithTopicsQuery = (
    yearGroupIds,
    classId,
    schoolId,
) => ({
    operationName: 'allSubjectsWithTopics',
    variables: {
        yearGroupIds: yearGroupIds,
        classId: classId,
        schoolId: schoolId,
    },
    query: `query allSubjectsWithTopics($yearGroupIds: [String!], $classId: String, $schoolId: String!) {
        allSubjectsWithTopics(yearGroupIds: $yearGroupIds, classId: $classId, schoolId: $schoolId) {
            id
            name
        }
    }`,
});

export const allTopicDomainsWithTopicsQuery = (
    yearGroupIds,
    subjects,
    schoolId,
    classId,
) => ({
    operationName: 'allTopicDomainsWithTopics',
    variables: {
        yearGroupIds: yearGroupIds,
        subjects: subjects,
        schoolId: schoolId,
        classId: classId,
    },
    query: `query allTopicDomainsWithTopics($yearGroupIds: [String!], $subjects: [String!], $schoolId: String!, $classId: String) {
        allTopicDomainsWithTopics(yearGroupIds: $yearGroupIds, subjects: $subjects, schoolId: $schoolId, classId: $classId) {
            id
            title
            subject {
                id
                name
            }
            yearGroups {
                id
                year
            }
            topics {
                id
                teacherTopicName
                parentTopicName
                year
                isReading
            }
        }
    }`,
});

export const allTopicsQuery = (filter, schoolId, classId) => ({
    operationName: 'allTopics',
    variables: {
        filter: filter,
        schoolId: schoolId,
        classId: classId,
    },
    query: `query allTopics($filter: TopicFilter, $schoolId: String, $classId: String) {
        allTopics(filter: $filter, schoolId: $schoolId, classId: $classId) {
            id
            teacherTopicName
            parentTopicName
            year
            isReading
            yearGroups {
                id
                year
                shortName
            }
            domains {
                id
                title
                subject {
                    name
                }
            }
        }
    }`,
});

export const topicQuery = (id) => ({
    operationName: 'topic',
    variables: {
        id: id,
    },
    query: `query topic($id: String!) {
        topic(id: $id) {
            id
            parentTopicName
            teacherTopicName
            teacherDescription
            video
            videoThumb
            year
            isReading
            yearGroups {
                id
                year
            }
            domains {
                id
                title
                subject {
                    name
                }
            }
            activities {
                id
                name
                cardImage
            }
        }
    }`,
});

export const getScheduleClassesGroupsQuery = (schoolId) => ({
    operationName: 'getScheduleClassesGroups',
    variables: {
        schoolId: schoolId,
    },
    query: `query getScheduleClassesGroups($schoolId: String!) {
        getScheduleClassesGroups(schoolId: $schoolId) {
            id
            name
            isMyClass
            isFullProgramme
            IsReadingLogsEnabled
            isReadyTeddyClass
            status
            yearGroup {
                id
                year
            }
            groups {
                id
                name
                isMyGroup
                isReadingClass
                hasTopics
                isReadyTeddyClass
            }
        }
    }`,
});

export const getPreviouslySetTopicDateQuery = (topicId, classId) => ({
    operationName: 'getPreviouslySetTopicDate',
    variables: {
        topicId: topicId,
        classId: classId,
    },
    query: `query getPreviouslySetTopicDate($topicId: String!, $classId: String!) {
        getPreviouslySetTopicDate(topicId: $topicId, classId: $classId) {
            releaseDate
            dueDate
        }
    }`,
});

export const addTopicToClassesQuery = (input) => ({
    operationName: 'addTopicToClasses',
    variables: {
        input: input,
    },
    query: `mutation addTopicToClasses($input: AddTopicToClassesInput!) {
        addTopicToClasses(input: $input) {
            id
            releaseDate
            dueDate
            teacherMessage
            topic {
                id
                teacherTopicName
            }
            class {
                id
                name
            }
        }
    }`,
});

export const getSchoolLeaderQueriesQuery = () => ({
    operationName: 'getSchoolLeaderQueries',
    variables: {},
    query: `query getSchoolLeaderQueries {
        getSchoolLeaderQueries {
            id
            name
            description
            order
        }
    }`,
});

export const getActiveStaticTrophyQuery = () => ({
    operationName: 'getActiveStaticTrophy',
    variables: {},
    query: `query getActiveStaticTrophy {
        getActiveStaticTrophy {
            id
            title
            certificate
            order
        }
    }`,
});

export const isActiveStaticTrophyExistQuery = () => ({
    operationName: 'isActiveStaticTrophyExist',
    variables: {},
    query: `query isActiveStaticTrophyExist {
        isActiveStaticTrophyExist
    }`,
});

export const getSchoolClassesForSchoolOverviewQuery = (schoolId) => ({
    operationName: 'getSchoolClassesForSchoolOverview',
    variables: {
        schoolId: schoolId,
    },
    query: `query getSchoolClassesForSchoolOverview($schoolId: String!) {
        getSchoolClassesForSchoolOverview(schoolId: $schoolId) {
            id
            name
            schoolClassName
            classSize
            activeCount
            status
            yearGroup {
                year
            }
            mainTeacher {
                firstname
                lastname
            }
        }
    }`,
});