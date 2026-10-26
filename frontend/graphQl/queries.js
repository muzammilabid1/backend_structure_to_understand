import gql from 'graphql-tag';

const getPupilList = gql`
    query getPupilList {
        allPupil {
            id
            fullname
        }
    }
`;

const getUser = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            firstname
            lastname
            email
            phoneNumber
            nameForChildren
            isSchoolLeader
            sharingAllowed
            type
            userStatus
            notificationPreference
            showInterstitial {
                id
                heading
                text
                typeformId
            }
            school {
                id
                curentPeriod {
                    index
                    shortName
                    isCurrentPeriod
                }
            }
        }
    }
`;

const getPupilClasses = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            fullname
            school {
                id
                schoolName
                classes {
                    id
                    name
                }
            }
            classes {
                id
                name
                period {
                    longName
                    shortName
                    index
                    isCurrentPeriod
                }
                school {
                    curentPeriod {
                        index
                    }
                }
                yearGroup {
                    id
                    year
                }
            }
            currentClass {
                id
            }
        }
    }
`;

const getPupilClassesForAdmin = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            classes {
                id
                name
                yearGroup {
                    year
                }
                period {
                    shortName
                }
                school {
                    schoolName
                }
                mainTeacher {
                    firstname
                    lastname
                }
            }
        }
    }
`;

const getPupilForAwardTrophy = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            currentClassOrGroupAcrossClasses {
                id
            }
        }
    }
`;

const getPupilForWelcomeChild = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            firstname
            lastname
        }
    }
`;

const getAllTopicsForFeedFilter = gql`
    query allTopics {
        allTopics {
            id
            teacherTopicName
            yearGroups {
                shortName
            }
            domains {
                title
            }
        }
    }
`;

const getTopicForPreview = gql`
    query getTopicForPreview($id: String!) {
        getTopicForPreview(id: $id) {
            id
            parentTopicName
            teacherTopicName
            teacherDescription
            video
            videoThumb
            year
            isReading
            noVideo
            yearGroups {
                id
                year
            }
            activities {
                id
                name
                cardImage
            }
        }
    }
`;
const getTopic = gql`
    query getTopic($id: String!) {
        topic(id: $id) {
            id
            parentTopicName
            teacherTopicName
            teacherDescription
            video
            videoThumb
            year
            isReading
            activities {
                id
                name
                cardImage
            }
        }
    }
`;

const getTopicForAdmin = gql`
    query getTopicForAdmin($id: String!) {
        getTopicForAdmin(id: $id) {
            id
            teacherTopicName
            video
            year
            teacherDescription
            parentTopicName
            teacherEmailBody
            isDemo
            isHidden
            isTeacherPdfRequired
            videoThumb
            teacherPdf
            teacherResource
            isPublished
            scrapbookPrompt
            noVideo
            schoolTags {
                id
                name
                color
            }
            yearGroups {
                id
                year
                shortName
            }
            tags {
                id
                name
                color
            }
            domains {
                id
                title
                subject {
                    name
                }
                yearGroups {
                    id
                }
            }
            domainsAndYearGroups {
                id
                domain {
                    id
                    title
                    subject {
                        name
                        programmeType
                    }
                }
                yearGroup {
                    id
                    year
                }
            }
        }
    }
`;

const getTopicActivitiesForAdmin = gql`
    query getTopicWithActivitiesForAdmin($id: String!) {
        getTopicWithActivitiesForAdmin(id: $id) {
            id
            teacherTopicName
            activities {
                id
                name
                order
                isHidden
                activityType
            }
        }
    }
`;

const getSchoolClassesForForPupilActivityFeedFilter = gql`
    query getSchoolClasses($schoolId: String!) {
        getSchoolClasses(schoolId: $schoolId) {
            id
            name
        }
    }
`;
const getSchoolClassesForDashboard = gql`
    query getSchoolClasses($schoolId: String!) {
        getSchoolClasses(schoolId: $schoolId) {
            id
            name
            classSize
            registerCount
            missingCount
            readingTarget
            status
            isRegistrationClass
            activeCount
            IsReadingLogsEnabled
            isFullProgramme
            school {
                id
                misName
                curentPeriod {
                    index
                }
            }
            period {
                index
                shortName
            }
            importedSchoolClass {
                id
            }
            teachers {
                id
                firstname
                lastname
            }
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
                lastLogin
                lastAccess
            }
            pupils {
                id
                trophies {
                    id
                    lastCertificateDownloaded
                    trophy {
                        id
                        title
                        isActive
                    }
                }
            }
        }
    }
`;
const getSchoolClassForClassDetailsPage = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            registerCount
            isGroupAcrossClasses
            isRegistrationClass
            subjects {
                name
                id
            }
            academicYearInfo {
                shortName
                isInPreviousAcademicYear
            }
            isLocked
            missingCount
            activeCount
            readingTarget
            readingStartDay
            IsReadingLogsEnabled
            skipGroupPupils
            readingLaunchDate
            isFullProgramme
            isReadyTeddyEnabled
            isPreAdmissionClass
            attentionRequiredPupilsCount
            status
            parentClass {
                id
                name
                subjects {
                    name
                    id
                }
            }
            schoolClassName
            pupils {
                id
            }
            school {
                id
                misName
                curentPeriod {
                    index
                }
                isReadyTeddyEnabled
                isReadyTeddyAvailable
                isMoneySkillsAvailable
                numOfTotalClassesAllowed
                numOfFullProgrammeClassesAllowed
                remainingAllowedClassesInfo {
                    fullProgramme
                    total
                }
            }
            period {
                index
                shortName
            }
            importedSchoolClass {
                id
                name
            }
            teachers {
                id
                firstname
                lastname
                userStatus
            }
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                lastLogin
                lastAccess
                nameForChildren
            }
            classTopicContext {
                hasReadingTopic
                hasTopics
            }
        }
    }
`;

const getSchoolClasses = gql`
    query getSchoolClasses($schoolId: String!) {
        getSchoolClasses(schoolId: $schoolId) {
            id
            name
            yearGroup {
                id
                year
            }
            classSize
            mainTeacher {
                id
                firstname
                lastname
                lastLogin
                lastAccess
            }
            teachers {
                id
                firstname
                lastname
            }
        }
    }
`;

const getSchoolClassMainTeacher = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            mainTeacher {
                id
            }
        }
    }
`;

const getSchoolClassName = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            name
            id
        }
    }
`;

const getSchoolClass = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            registerCount
            schoolClassName
            isGroupAcrossClasses
            missingCount
            subjects {
                id
                name
            }
            academicYearInfo {
                shortName
                isInPreviousAcademicYear
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
            isReadyTeddyEnabled
            isPreAdmissionClass
            attentionRequiredPupilsCount
            parentClass {
                id
                name
            }
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
            classTopicContext {
                hasReadingTopic
                hasTopics
            }
            school {
                id
                schoolName
                misName
                isMoneySkillsAvailable
                isWondeDataSyncedWithLwp
                isScrapbookEnabledForSchool
                curentPeriod {
                    index
                }
            }
            period {
                index
                shortName
            }
            importedSchoolClass {
                id
                name
                code
            }
            currentReadingWeek {
                id
            }
        }
    }
`;
const getSchoolClassforSelectTopic = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            isRegistrationClass
            school {
                id
                curentPeriod {
                    index
                }
            }
            pupils {
                classes {
                    id
                    isRegistrationClass
                    period {
                        index
                    }
                }
            }
        }
    }
`;
const getSchoolClassSchoolData = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            school {
                id
            }
        }
    }
`;

const getSchoolClassWithImportedStudents = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            name
            IsReadingLogsEnabled
            isLocked
            isRegistrationClass
            school {
                misName
                isWondeDataSyncedWithLwp
            }
            pupils {
                pupilStatus
                trophies {
                    id
                    lastCertificateDownloaded
                    trophy {
                        id
                        title
                        isActive
                    }
                }
                importedStudent {
                    id
                }
            }
            importedSchoolClass {
                id
                name
                code
                yearGroup {
                    year
                }
                students {
                    id
                    forename
                    surname
                }
            }
        }
    }
`;

const getImportedSchoolPupils = gql`
    query getImportedSchoolPupils($id: String!) {
        getImportedSchoolPupils(id: $id) {
            id
            forename
            surname
            importedClassName
            importedClassYearGroup
            importedContacts {
                forename
                surname
                email
                phoneNumber
            }
        }
    }
`;

/**
 * Just enough to label a pupil in the "link pupils to MIS" dropdown.
 *
 * Deliberately NOT the query above: this list is school-wide, so pulling `importedContacts` for every
 * imported pupil costs hundreds of unused objects on a secondary school. The modal only ever renders the
 * name and the MIS class, so it only asks for those.
 */
const getImportedSchoolPupilsForSimsLinking = gql`
    query getImportedSchoolPupils($id: String!) {
        getImportedSchoolPupils(id: $id) {
            id
            forename
            surname
            importedClassName
            importedClassYearGroup
        }
    }
`;

export const getImportedContact = gql`
    query getImportedContact($importedContactId: String!) {
        getImportedContact(importedContactId: $importedContactId) {
            id
            email
            phoneNumber
            forename
            surname
            gender
            school {
                lwpSchool {
                    id
                }
            }
            importedStudentContacts {
                parental_responsibility
                priority
                relationship
                importedStudent {
                    forename
                    surname
                    id
                    UPN
                    gender
                }
            }
        }
    }
`;

export const getImportedStudent = gql`
    query getImportedStudent($importedStudentId: String!) {
        getImportedStudent(importedStudentId: $importedStudentId) {
            id
            forename
            surname
            UPN
            gender
            school {
                lwpSchool {
                    id
                }
            }
            schoolClasses {
                id
                name
                code
                yearGroup {
                    year
                }
            }
            importedStudentContacts {
                parental_responsibility
                priority
                relationship
                importedContact {
                    id
                    forename
                    surname
                    initials
                    email
                    phoneNumber
                }
            }
        }
    }
`;

const getImportedSchoolClass = gql`
    query getImportedSchoolClass($importedSchoolClassId: String!) {
        getImportedSchoolClass(importedSchoolClassId: $importedSchoolClassId) {
            id
            name
            code
            yearGroup {
                year
            }
            school {
                lwpSchool {
                    id
                }
            }
            students {
                id
                forename
                surname
                initials
                gender
                isPremium
                UPN
            }
        }
    }
`;

const getClassTopics = gql`
    query getClassTopics($classId: String!) {
        getClassTopics(classId: $classId) {
            id
            releaseDate
            dueDate
            teacherMessage
            released
            readingNote
            readingTarget
            # Non-null only for a topic created by assigning a sequence, which is what drives the
            # auto-scheduled label on the schedule. Manually scheduled topics leave it null.
            classSequenceAssignment {
                id
            }
            statistics {
                completed
                notStarted
                inProgress
            }
            topic {
                id
                teacherTopicName
                year
                teacherPdf
                scrapbookPrompt
                hasSetByTeacherSteps
                isTeacherPdfRequired
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
                isReading
                teacherDescription
            }
            class {
                id
                name
                IsReadingLogsEnabled
                yearGroup {
                    year
                }
                school {
                    id
                }
            }
        }
    }
`;

const getPupilTopicsForClassTopicOverview = gql`
    query getPupilTopic($id: String!) {
        getPupilTopic(id: $id) {
            id
            watchedVideo
            releaseDate
            pupil {
                id
            }
            classTopic {
                id
            }
        }
    }
`;

const getPupilTopicsForPupilTopicsOverview = gql`
    query getPupilTopicsForPupilTopicsOverview($id: String!) {
        getPupilTopicsForPupilTopicsOverview(id: $id) {
            id
            watchedVideo
            silverStars
            earnedGoldStar
            releaseDate
        }
    }
`;

const getPupilActivitiesOfPupilTopic = gql`
    query getPupilActivitiesOfPupilTopic($pupilTopicId: String!) {
        getPupilActivitiesOfPupilTopic(pupilTopicId: $pupilTopicId) {
            id
            earnedStar
            rating
        }
    }
`;

const getPupilFeedbacksOfPupilActivity = gql`
    query getPupilFeedbacksOfPupilActivity($pupilActivityId: String!) {
        getPupilFeedbacksOfPupilActivity(pupilActivityId: $pupilActivityId) {
            id
            parentComment
            pupilComment
        }
    }
`;

const getPupilActivityForPupilActivityOverview = gql`
    query getPupilActivity($id: String!) {
        getPupilActivity(id: $id) {
            id
            rating
            earnedStar
            topic {
                id
            }
        }
    }
`;

const getAllPupils = gql`
    query getAllPupils($parentId: String!) {
        getAllPupils(parentId: $parentId) {
            id
            status
            lastInvitationEmailSent
            logLastStatusChange
            parent {
                id
                firstname
                lastname
            }
            pupil {
                id
                fullname
                firstname
                pupilStatus
                lastLogin
                currentMathscot {
                    character
                    colour
                }
                mathscotUrl {
                    thumbnailImage
                }
            }
        }
    }
`;
const getPupils = gql`
    query getPupils($parentId: String!) {
        getPupils(parentId: $parentId) {
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
            }
            currentClass {
                name
                yearGroup {
                    year
                }
            }
            type
            school {
                schoolName
            }
            currentMathscot {
                character
                colour
            }
            mathscotUrl {
                thumbnailImage
            }
        }
    }
`;

export const getPupilInvitationsForChild = gql`
    query getPupilInvitations($id: String!) {
        getPupilInvitations(id: $id) {
            id
            pupil {
                firstname
                lastname
                school {
                    schoolName
                }
            }
        }
    }
`;

const getParentPupilsForAdmin = gql`
    query getPupils($parentId: String!) {
        getPupils(parentId: $parentId) {
            id
            fullname
            pupilStatus
            lastLogin
        }
    }
`;

const getUserForAdmin = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            firstname
            lastname
            email
            notificationPreference
            phoneNumber
            resetPassToken
            adminRestrictions {
                techToolKit
                siteAdmins
                siteData
            }
            userStatus
            lastLogin
            lastAccess
            userStatusChangeLogs {
                id
                previousStatus
                newStatus
                logCreatedAt
            }
            lastLoginInfo {
                browserName
                osName
                deviceType
                date
                userAgent
                userType
                loginType
            }
            importedContacts {
                id
                forename
                surname
                email
                phoneNumber
                gender
                title
                importedStudentContacts {
                    id
                    bill_payer
                    lives_with_pupil
                    email_bills
                    copy_bills
                    court_order
                    pupil_report
                    parental_responsibility
                    correspondence
                    email_notification
                    sms_notification
                    mail_notification
                    push_notification
                    in_touch_communication
                    priority
                    relationship
                }
            }
        }
    }
`;

const getUserForPupilActivityFeedFilter = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            isSchoolLeader
            school {
                id
            }
        }
    }
`;

const allMathscotItem = gql`
    query allMathscotItem {
        allMathscotItem {
            id
            name
            theme
        }
    }
`;

export const getUserForCommonDrawer = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            firstname
            lastname
            type
            adminRestrictions {
                techToolKit
                siteData
                siteAdmins
            }
            school {
                schoolName
            }
            showInterstitial {
                id
                name
            }
        }
    }
`;

export const getRecommendedPupilTopicsForTodoTopicLists = gql`
    query getRecommendedPupilTopics($id: String!) {
        getRecommendedPupilTopics(id: $id) {
            id
            period {
                index
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
                }
                feedbacks {
                    pupilComment
                }
            }
            pupil {
                school {
                    curentPeriod {
                        index
                    }
                }
            }
            classTopic {
                dueDate
            }
            topic {
                id
                parentTopicName
                teacherTopicName
                videoThumb
                isReading
                video
                noVideo
                isReading
            }
        }
    }
`;

const getPupil = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            isInSchoolClassOrGroupAcrossClasses
            isActiveInCurrentAcademicYear
            hasTopicsInCurrentAcademicYear
            currentClassOrGroupAcrossClasses {
                id
                isFullProgramme
                IsReadingLogsEnabled
                isReadyTeddyEnabled
                isPreAdmissionClass
            }
            previousMathscotImage
            parentWatchedIntroVideo
            currentMathscot {
                character
                colour
            }
            type
            mathscotUrl {
                bigImage
                thumbnailImage
            }
            currentReadyTeddyTopicForScrapbook {
                id
                scrapbookPrompt
                haveScrapbookEntry
            }
        }
    }
`;

export const getClassGroups = gql`
    query getClassGroups($classId: String!) {
        getClassGroups(classId: $classId) {
            id
            name
            IsReadingLogsEnabled
            subjects {
                name
            }
            pupils {
                fullname
            }
            teachers {
                id
            }
            mainTeacher {
                nameForChildren
            }
        }
    }
`;

const getPupilForOwnActivityPage = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
        }
    }
`;

const getClassPupils = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            id
            fullname
            isPremium
            mathscotUrl {
                thumbnailImage
                bigImage
            }
            allTopics {
                classTopic {
                    id
                }
            }
        }
    }
`;

export const haveUnTickedFeedbacks = gql`
    query haveUnTickedFeedbacks($teacherId: String, $filter: PupilActivityFeedsFilterInput, $pupilId: String, $schoolId: String!) {
        haveUnTickedFeedbacks(teacherId: $teacherId, pupilId: $pupilId, schoolId: $schoolId, filter: $filter)
    }
`;

const getClassPupilsForSimsLinking = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            id
            fullname
            importedStudent {
                id
            }
        }
    }
`;

const getClassPupilsForWarningModal = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            id
            fullname
        }
    }
`;

const getPupilActivityFeeds = gql`
    query getPupilActivityFeeds(
        $teacherId: String
        $schoolId: String!
        $offset: Float
        $limit: Float
        $filter: PupilActivityFeedsFilterInput
    ) {
        getPupilActivityFeeds(teacherId: $teacherId, schoolId: $schoolId, offset: $offset, limit: $limit, filter: $filter) {
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
                scrapbookPrompt
                school {
                    id
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
                    }
                    logCreatedBy {
                        id
                        nameForChildren
                    }
                }
                tickedAt
                tickedBy {
                    nameForChildren
                }
                photos {
                    id
                    filename
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
                }
                userId
                userType
                logCreatedBy {
                    id
                    firstname
                    lastname
                    nameForChildren
                    type
                }
                pupilTopic {
                    id
                    class {
                        id
                        name
                    }
                }
                type
                description
                sharingAllowed
                pupil {
                    id
                    fullname
                    mathscotUrl {
                        thumbnailImage
                    }
                    parents {
                        parent {
                            firstname
                        }
                    }
                }
                activity {
                    topic {
                        id
                        classTopic {
                            id
                            topic {
                                id
                                teacherTopicName
                            }
                            class {
                                id
                                name
                            }
                        }
                    }
                    activity {
                        name
                        topic {
                            teacherTopicName
                        }
                    }
                }
                lastAction {
                    updatedAt
                }
                entryDeletedAt
                reasonToDelete
                originalFeedbackId
            }
        }
    }
`;

const getAllFeedsForAdmin = gql`
    query getAllFeeds($offset: Float, $limit: Float, $filter: AdminAllFeedsFilterInput) {
        getAllFeeds(offset: $offset, limit: $limit, filter: $filter) {
            feed {
                total
                results {
                    id
                    parentComment
                    bookName
                    bookReadAt
                    pageNumber
                    isBookFinished
                    comment
                    privateNote
                    rating
                    type
                    className
                    isFeedbackForMultipleClasses
                    includePhotoInImpactReport
                    includeParentCommentInImpactReport
                    includePupilCommentInImpactReport
                    includeReadingCommentInImpactReport
                    privateNote
                    pupilCount
                    includeInReadingTarget
                    scrapbookPrompt
                    lastAction {
                        updatedAt
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
                        }
                        logCreatedBy {
                            nameForChildren
                        }
                    }
                    tickedAt
                    tickedBy {
                        nameForChildren
                    }
                    audios {
                        id
                        filename
                    }
                    userId
                    userType
                    userName
                    logCreatedBy {
                        id
                        firstname
                        lastname
                        nameForChildren
                    }
                    pupilTopic {
                        id
                        topic {
                            id
                            teacherTopicName
                        }
                        class {
                            id
                            name
                        }
                    }
                    logCreatedAt
                    activity {
                        rating
                        activity {
                            name
                            topic {
                                id
                                teacherTopicName
                            }
                        }
                        topic {
                            id
                            classTopic {
                                id
                                class {
                                    id
                                    name
                                }
                            }
                        }
                    }
                    description
                    id
                    logCreatedAt
                    parentComment
                    photos {
                        id
                        filename
                    }
                    pupil {
                        id
                        fullname
                        mathscotUrl {
                            thumbnailImage
                        }
                        parents {
                            parent {
                                firstname
                            }
                        }
                    }
                    pupilComment
                    sharingAllowed
                }
            }
            filter {
                postedAfter
            }
        }
    }
`;
const getAllDemoFeedsForAdmin = gql`
    query getDemoActivityAllFeeds($offset: Float, $limit: Float) {
        getDemoActivityAllFeeds(offset: $offset, limit: $limit) {
            total
            results {
                id
                parentComment
                logCreatedAt
                activity {
                    name
                    topic {
                        teacherTopicName
                        isReading
                    }
                }
                rating
                photoRating
                photo
                pupilComment
                sharingAllowed
            }
        }
    }
`;

const allTeacher = gql`
    query allTeacher {
        allTeacher {
            id
            nameForChildren
            isSchoolLeader
            email
            firstname
            lastname
        }
    }
`;

export const getAllAdminStickers = gql`
    query getAllAdminStickers {
        getAllAdminStickers {
            active {
                id
                fileName
                imageUrl
                alt
                isActive
                label
            }
            inActive {
                id
                fileName
                imageUrl
                alt
                isActive
                label
            }
        }
    }
`;

const getPupilHistory = gql`
    query getPupilHistory($pupilId: String!) {
        getPupilHistory(pupilId: $pupilId) {
            id
            logCreatedAt
            pupilComment
            parentComment
            photos {
                id
                filename
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
                }
                logCreatedBy {
                    id
                    nameForChildren
                }
            }
            tickedAt
            tickedBy {
                nameForChildren
            }
            bookName
            bookReadAt
            pageNumber
            isBookFinished
            comment
            type
            includeInReadingTarget
            readingType
            audios {
                id
                filename
            }
            userId
            userType
            userName
            logCreatedBy {
                id
                nameForChildren
                firstname
                lastname
                type
            }

            pupilTopic {
                id
            }
            pupilCount
            activity {
                id
                earnedStar
                topic {
                    id
                }
                activity {
                    name
                    topic {
                        id
                        parentTopicName
                        teacherTopicName
                    }
                }
            }
            lastAction {
                updatedAt
            }
            originalFeedbackId
            entryDeletedAt
            reasonToDelete
        }
    }
`;

export const getSchoolClassForRegister = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            schoolClassName
            isGroupAcrossClasses
            status
            subjects {
                name
            }
            academicYearInfo {
                shortName
                isInPreviousAcademicYear
            }
            isRegistrationClass
            activeCount
            isLocked
            IsReadingLogsEnabled
            isFullProgramme
            isReadyTeddyEnabled
            isPreAdmissionClass
            attentionRequiredPupilsCount
            parentClass {
                id
                name
            }
            yearGroup {
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
            }
            classTopicContext {
                hasReadingTopic
                hasTopics
            }
            pupils {
                id
                firstname
                lastname
                isPremium
                pupilStatus
                isCurrentYearTopicsReleased
                parentsContext {
                    allParentsRejected
                    allParentsRejectedOrImported
                    allAwaitingInviteParents
                }
                importedStudent {
                    id
                }
                trophies {
                    lastCertificateDownloaded
                    trophy {
                        id
                        title
                        isActive
                    }
                }
            }
            school {
                id
                misName
                enableAddClasses
                isMoneySkillsAvailable
                curentPeriod {
                    index
                }
            }
            period {
                index
            }
            statistics {
                missing
                registered
                active
            }
        }
    }
`;

export const getClassPupilsForClassPupilsPage = gql`
    query getClassPupilsForClassPupilsPage($id: String!) {
        getClassPupilsForClassPupilsPage(id: $id) {
            id
            fullname
            pupilStatus
            allParentsRejected
            allParentsRejectedOrImported
            allParentsNotActiveAndAtLeastOneInvited
            noParents
            activeParentsCount
            invitedParentsCount
            importedParentsCount
            rejectedParentsCount
            tags {
                id
                name
                color
            }
        }
    }
`;

const activityGridDataFragment = gql`
    fragment ActivityGridData on ClassPupilsForRegisterTableOutput {
        pupils {
            id
            fullname
            pupilStatus
            allParentsRejected
            allParentsRejectedOrImported
            allParentsNotActiveAndAtLeastOneInvited
            noParents
        }
        classTopics {
            id
            releaseDate
            readingTarget
            schoolClassName
            isRegistrationClass
            topicClassId
            staticTopicName
            staticTopicSubjects
            isReadingTopic
            staticTopicActivitiesCount
            pupilTopics {
                id
                pupil_id
                watchedVideo
                silverStars
                earnedGoldStar
                totalEarnedStars
                classTopicId
                __typename
            }
            __typename
        }
        __typename
    }
`;

const getClassPupilsForRegisterTable = gql`
    ${activityGridDataFragment}
    query getClassPupilsForRegisterTable($id: String!) {
        getClassPupilsForRegisterTable(id: $id) {
            ...ActivityGridData
        }
    }
`;

export const getActivityGridDataForGroupAcrossClasses = gql`
    ${activityGridDataFragment}
    query getActivityGridDataForGroupAcrossClasses($id: String!) {
        getActivityGridDataForGroupAcrossClasses(id: $id) {
            ...ActivityGridData
        }
    }
`;

const getClassPupilsForTeacher = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            id
            fullname
            firstname
            lastname
            starsEarned {
                goldStars
                silverStars
            }
            currentClass {
                name
            }
            lastCertificateSent
            lastCertificateDownloaded
            trophies {
                id
                logCreatedAt
                lastCertificateEmailSent
                lastCertificateDownloaded
                trophy {
                    id
                }
            }
        }
    }
`;

const getPupilForTeacher = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            lastname
            pupilStatus
            lastLogin
            lastActivity
            videoCount
            watchedVideoCount
            activityCount
            feedbackCount
            isPremium
            yearGroup
            UPN
            currentReadingTopic {
                id
                class {
                    id
                    IsReadingLogsEnabled
                }
            }
            school {
                id
                misName
                schoolName
                importedSchool {
                    id
                }
                curentPeriod {
                    index
                }
            }
            classes {
                id
                name
                IsReadingLogsEnabled
                isRegistrationClass
                period {
                    index
                }
                importedSchoolClass {
                    name
                    id
                    yearGroup {
                        year
                    }
                }
            }
            parents {
                status
                parent {
                    id
                    firstname
                    lastname
                    email
                    phoneNumber
                    userStatus
                    resetPassToken
                    importedContacts {
                        id
                        forename
                        surname
                        email
                        phoneNumber
                        importedStudentContacts {
                            parental_responsibility
                            priority
                            importedStudent {
                                id
                                lwpPupil {
                                    id
                                }
                            }
                        }
                    }
                }
            }
            mathscotUrl {
                thumbnailImage
            }
            allTopics {
                id
                watchedVideo
                topic {
                    teacherTopicName
                    parentTopicName
                }
                activities {
                    id
                    earnedStar
                    activity {
                        name
                    }
                    feedbacks {
                        id
                        parentComment
                        pupilComment
                        photos {
                            id
                            filename
                        }
                        logCreatedBy {
                            id
                            firstname
                            lastname
                            nameForChildren
                        }
                        logCreatedAt
                        sharingAllowed
                    }
                }
            }
            importedStudent {
                id
                mis_id
                forename
                surname
                initials
                UPN
                gender
                isPremium
            }
        }
    }
`;

const getPupilForAdminPupilView = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            lastname
            pupilStatus
            lastLogin
            lastActivity
            videoCount
            watchedVideoCount
            activityCount
            feedbackCount
            isPremium
            UPN
            yearGroup
            dateOfBirth
            school {
                id
                misName
                schoolName
                importedSchool {
                    id
                }
                curentPeriod {
                    index
                }
            }
            classes {
                id
                name
                isRegistrationClass
                importedSchoolClass {
                    id
                    name
                    yearGroup {
                        year
                    }
                }
                yearGroup {
                    year
                }
            }
            trophies {
                id
                logCreatedAt
                logCreatedBy {
                    firstname
                    lastname
                }
                trophy {
                    id
                    title
                }
            }
            currentClass {
                id
                name
            }
            currentClassOrGroupAcrossClasses {
                id
                name
            }
            parents {
                status
                lastInvitationEmailSent
                logLastStatusChange
                invitedBy {
                    id
                    firstname
                    lastname
                }
                parent {
                    id
                    firstname
                    lastname
                    email
                    phoneNumber
                    userStatus
                    resetPassToken
                    importedContacts {
                        id
                        forename
                        surname
                        email
                        phoneNumber
                        importedStudentContacts {
                            parental_responsibility
                            priority
                            importedStudent {
                                lwpPupil {
                                    id
                                }
                            }
                        }
                    }
                }
            }
            mathscotUrl {
                thumbnailImage
            }
            allTopics {
                id
                watchedVideo
                topic {
                    teacherTopicName
                }
                activities {
                    id
                    activity {
                        name
                    }
                    feedbacks {
                        id
                        parentComment
                        pupilComment
                        photos {
                            id
                            filename
                        }
                        logCreatedAt
                        sharingAllowed
                    }
                }
            }
            importedStudent {
                id
                mis_id
                forename
                surname
                initials
                UPN
                gender
                isPremium
            }
        }
    }
`;

const getPupilForEditPupilMathscot = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            school {
                curentPeriod {
                    characters
                    colours
                }
            }
            currentMathscot {
                id
                character
                colour
                items
            }
            mathscotUrl {
                bigImage
            }
        }
    }
`;

const getPupilForParentsAndCarersTableForParent = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            firstname
            parents {
                status
                parent {
                    firstname
                }
            }
        }
    }
`;

const getClassImportedPupils = gql`
    query getClassImportedPupils($classId: String!) {
        getClassImportedPupils(classId: $classId) {
            id
            firstname
            lastname
            importedParents {
                id
                status
                parentId
                pupilId
                lastInvitationEmailSent
                parent {
                    id
                    firstname
                    lastname
                    email
                    phoneNumber
                }
            }
        }
    }
`;

const getPupilForParentsAndCarersTableForTeacher = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            firstname
            school {
                id
            }
            isCurrentYearTopicsReleased
            parents {
                id
                status
                logCreatedAt
                lastInvitationEmailSent
                logStatusChange {
                    id
                    entityId
                    newStatus
                    previousStatus
                    entityType
                    logCreatedAt
                }
                pupil {
                    id
                    fullname
                }
                logLastStatusChange
                invitedBy {
                    id
                    firstname
                    lastname
                    logCreatedAt
                    lastInvitationEmailSent
                    type
                }
                parent {
                    id
                    firstname
                    lastname
                    email
                    phoneNumber
                    lastInvitationEmailSent
                    userStatus
                    numSchoolsWithPupils
                    resetPassToken
                    logStatusChange {
                        id
                        entityId
                        newStatus
                        previousStatus
                        entityType
                        logCreatedAt
                    }
                }
            }
        }
    }
`;

const getLastAccess = gql`
    query getLastAccess($parentId: String!, $pupilId: String!) {
        getLastAccess(parentId: $parentId, pupilId: $pupilId)
    }
`;

const getClassTopicsForAdmin = gql`
    query getClassTopicsForAdmin($classId: String!) {
        getClassTopicsForAdmin(classId: $classId) {
            id
            teacherMessage
            displayDate
            released
            releaseDate
        }
    }
`;

const getClassTopic = gql`
    query getClassTopic($id: String!) {
        getClassTopic(id: $id) {
            id
            releaseDate
            dueDate
            teacherMessage
            statistics {
                completed
                notStarted
                inProgress
            }

            class {
                id
            }
            topic {
                id
                teacherTopicName
                isReading
                year
                teacherPdf
                teacherDescription
                isTeacherPdfRequired
                yearGroups {
                    year
                }
                domains {
                    title
                    subject {
                        name
                    }
                }
            }
            pupilTopics {
                id
                watchedVideo
                topic {
                    isReading
                }
                pupil {
                    id
                    fullname
                    school {
                        id
                    }
                    classes {
                        id
                    }
                }
                activities {
                    id
                    earnedStar
                    activity {
                        name
                    }
                    feedbacks {
                        id
                        logCreatedAt
                        pupilComment
                        parentComment
                        sharingAllowed
                        logCreatedBy {
                            firstname
                            lastname
                        }
                        photos {
                            id
                            filename
                        }
                    }
                }
            }
        }
    }
`;

const getClassTopicForClassTopicOverview = gql`
    query getClassTopic($id: String!) {
        getClassTopic(id: $id) {
            id
            releaseDate
            dueDate
            teacherMessage
            displayDate
            class {
                id
            }
        }
    }
`;

const getSchoolTeachers = gql`
    query getSchoolTeachers($schoolId: String!) {
        getSchoolTeachers(schoolId: $schoolId) {
            id
            nameForChildren
            isSchoolLeader
            email
            userStatus
            firstname
            lastname
            type
            lastLogin
            lastAccess
            resetPassToken
            mainClasses {
                name
                period {
                    index
                }
            }
            school {
                curentPeriod {
                    index
                }
            }
        }
    }
`;

const allFAQs = gql`
    query allFAQs {
        allFAQs {
            id
            question
            editAsHtml
            answer
            forParent
            forBeforeLogin
            forTeacher
            forSchoolLeader
        }
    }
`;

const getTeacherFAQs = gql`
    query getTeacherFAQs($forSchoolLeader: Boolean) {
        getTeacherFAQs(forSchoolLeader: $forSchoolLeader) {
            id
            answer
            question
        }
    }
`;

const getActivityForPreview = gql`
    query getActivityForPreview($id: String!) {
        getActivityForPreview(id: $id) {
            id
            activityType
            cardImage
            name
            details
            rationaleModal {
                id
            }
            topic {
                id
                isReading
            }
            steps {
                ... on StaticLwpActivityLegacy {
                    legacySteps {
                        id
                        order
                        stepType
                        text
                        imageUrl
                        downloadUrl
                        downloadName
                        linkUrl
                        linkName
                        properties
                        fontType
                        fontSize
                        textCarouselData
                        carouselData {
                            textEditorState
                            labelEditorState
                            type
                            imageUrl
                            alt
                            fileName
                            fileIdentifier
                        }
                        accordionData
                        checkListTextData
                        tableData
                        selectedModalId
                        fileName
                        editorState
                        timerData
                        btnType
                        imageCarouselData
                        checklistImageData
                        includeSeconds
                        clickableAlphabetData
                        dimensions
                        audioUrl
                        tabsData
                        editAsHtml
                        setByTeacherData {
                            heading
                        }
                        # Matched against the viewer's school tags by filterStepsForViewer, so a
                        # teacher previewing sees the same steps their pupils will (LEA-6559).
                        visibilityRules {
                            hideForSchoolTagIds
                        }
                    }
                }
            }
        }
    }
`;
const getActivity = gql`
    query getActivity($id: String!) {
        activity(id: $id) {
            id
            activityType
            cardImage
            name
            details
            rationaleModal {
                id
            }
            topic {
                id
                isReading
            }
            steps {
                ... on StaticLwpActivityLegacy {
                    legacySteps {
                        id
                        order
                        stepType
                        text
                        imageUrl
                        downloadUrl
                        downloadName
                        linkUrl
                        linkName
                        properties
                        fontType
                        fontSize
                        textCarouselData
                        carouselData {
                            textEditorState
                            labelEditorState
                            type
                            imageUrl
                            alt
                            fileName
                            fileIdentifier
                        }
                        accordionData
                        checkListTextData
                        tableData
                        selectedModalId
                        fileName
                        editorState
                        timerData
                        btnType
                        imageCarouselData
                        checklistImageData
                        includeSeconds
                        clickableAlphabetData
                        dimensions
                        audioUrl
                        tabsData
                        editAsHtml
                        setByTeacherData {
                            heading
                        }
                    }
                }
            }
        }
    }
`;

const getLikedActivityFeeds = gql`
    query getLikedActivityFeeds($id: String!) {
        getLikedActivityFeeds(id: $id) {
            id
            pupilComment
            parentComment
            className
            photos {
                id
                filename
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
                    alt
                    imageUrl
                }
                logCreatedBy {
                    id
                    nameForChildren
                }
            }

            tickedAt
            tickedBy {
                nameForChildren
            }
            bookName
            bookReadAt
            pageNumber
            pupilCount
            isBookFinished
            comment
            privateNote
            type
            audios {
                id
                filename
            }
            userId
            userType
            logCreatedAt
            logCreatedBy {
                id
                firstname
                lastname
                nameForChildren
            }
            pupilTopic {
                id
                class {
                    id
                    name
                }
            }
            description
            logCreatedAt
            pupil {
                id
                fullname
                mathscotUrl {
                    thumbnailImage
                }
                parents {
                    parent {
                        firstname
                    }
                }
            }
            activity {
                topic {
                    id
                    classTopic {
                        id
                        class {
                            id
                            name
                        }
                    }
                }
                # class {
                #     id
                #     name
                # }
                activity {
                    name
                    topic {
                        teacherTopicName
                    }
                }
            }
        }
    }
`;

export const getTopicTagsForAdmin = gql`
    query getTopicTagsForAdmin {
        getTopicTagsForAdmin {
            id
            name
            color
            topicCount
        }
    }
`;

export const getSchoolTagsForAdmin = gql`
    query getSchoolTagsForAdmin {
        getSchoolTagsForAdmin {
            id
            name
            color
            schoolCounts
        }
    }
`;

const getAllNews = gql`
    query allNews($userId: String) {
        allNews(userId: $userId) {
            id
            title
            editAsHtml
            description
            logCreatedAt
            forTeacher
            forSchoolLeader
        }
    }
`;

const getAllStaticPeriods = gql`
    query allStaticPeriods {
        allStaticPeriods {
            index
            shortName
            longName
            isCurrentPeriod
            isPreviousPeriod
            characters
            colours
            startDate
            endDate
        }
    }
`;

const getAllStaticYearGroup = gql`
    query allYearGroup($showHiddenYearGroup: Boolean) {
        allYearGroup(showHiddenYearGroup: $showHiddenYearGroup) {
            id
            year
            mathscotThemes
            shortName
            hiddenFromLists
        }
    }
`;

const getReadingTopicForClassReadingPage = gql`
    query getReadingTopic($id: String!) {
        getReadingTopic(id: $id) {
            activeDateString
            isReleased
            classReadingTarget
            readingStatistics {
                notStarted
                inProgress
                completed
            }
            pupilReadingLogFeedbacks {
                id
                pupilEarnedStars
                pupilName
                readingLogFeedbacks {
                    id
                    bookName
                    pageNumber
                    userType
                    comment
                    bookReadAt
                    isBookFinished
                    logCreatedAt
                    type
                    privateNote
                    includeInReadingTarget
                    userName
                    pupilCount
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
                        }
                        logCreatedBy {
                            id
                            nameForChildren
                        }
                    }

                    tickedAt
                    tickedBy {
                        nameForChildren
                    }
                    logCreatedBy {
                        nameForChildren
                        firstname
                        lastname
                    }
                    photos {
                        id
                        filename
                    }
                    audios {
                        id
                        filename
                    }
                }
            }
        }
    }
`;
const getPupilReadingTopicsForPupilReadingTab = gql`
    query getPupilReadingTopics($pupilId: String!) {
        getPupilReadingTopics(pupilId: $pupilId) {
            id
            pupilName
            releaseDate
            readingLogFeedbacks {
                id
                bookName
                privateNote
                userName
                school {
                    id
                }
                logCreatedBy {
                    id
                    nameForChildren
                    firstname
                    lastname
                    type
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
                    }
                    logCreatedBy {
                        id
                        nameForChildren
                    }
                }

                tickedAt
                tickedBy {
                    nameForChildren
                }
                pupils {
                    id
                }
                pupilCount
                includeInReadingTarget
                pageNumber
                userType
                type
                comment
                bookReadAt
                isBookFinished
                logCreatedAt
                photos {
                    id
                    filename
                }
                audios {
                    id
                    filename
                }
                lastAction {
                    updatedAt
                }
                originalFeedbackId
                entryDeletedAt
                reasonToDelete
            }
        }
    }
`;

const getSchoolDate = gql`
    query getSchoolDate($id: String!) {
        getSchoolDate(id: $id) {
            id
            termName
            startDate
            endDate
        }
    }
`;

const getAllSchoolDates = gql`
    query allSchoolDates {
        allSchoolDates {
            id
            termName
            startDate
            endDate
            termPeriodIndex
        }
    }
`;

const getHolidaysForAdmin = gql`
    query getHolidaysForAdmin {
        getHolidaysForAdmin {
            id
            holidayName
            startDate
            endDate
            released
            hasSchoolsLinked
            period {
                index
                shortName
                isPreviousPeriod
            }
            schools {
                id
                schoolName
            }
        }
    }
`;

const allSchoolHolidaysOfSchoolForAdmin = gql`
    query allSchoolHolidaysOfSchoolForAdmin($schoolId: String!) {
        allSchoolHolidaysOfSchoolForAdmin(schoolId: $schoolId) {
            id
            holidayName
            startDate
            endDate
            released
            hasSchoolsLinked
            period {
                index
                shortName
                isPreviousPeriod
            }
            schools {
                id
                schoolName
                curentPeriod {
                    index
                }
            }
        }
    }
`;

const getAllSchoolHolidays = gql`
    query allSchoolHolidays {
        allSchoolHolidays {
            id
            holidayName
            startDate
            endDate
            released
            hasSchoolsLinked
            period {
                index
                shortName
                isPreviousPeriod
            }
            schools {
                id
                schoolName
            }
        }
    }
`;

const getAllSchoolHolidaysOfSchool = gql`
    query allSchoolHolidaysOfSchool($schoolId: String!) {
        allSchoolHolidaysOfSchool(schoolId: $schoolId) {
            id
            holidayName
            startDate
            endDate
        }
    }
`;

const getModals = gql`
    query getModals {
        getModals {
            id
            name
            nameForContentDev
            logCreatedAt
            steps {
                ... on StaticLwpActivityLegacy {
                    legacySteps {
                        id
                        order
                        stepType
                        text
                        imageUrl
                        downloadUrl
                        downloadName
                        linkUrl
                        linkName
                        properties
                        fontSize
                        fontType
                        textCarouselData
                        carouselData {
                            textEditorState
                            labelEditorState
                            type
                            imageUrl
                            alt
                            fileName
                            fileIdentifier
                        }
                        accordionData
                        checkListTextData
                        tableData
                        selectedModalId
                        fileName
                        editorState
                        timerData
                        btnType
                        imageCarouselData
                        checklistImageData
                        includeSeconds
                        clickableAlphabetData
                        dimensions
                        audioUrl
                        tabsData
                        editAsHtml
                    }
                }
            }
        }
    }
`;

const getModal = gql`
    query getModal($id: String!) {
        getModal(id: $id) {
            id
            name
            steps {
                ... on StaticLwpActivityLegacy {
                    legacySteps {
                        id
                        order
                        stepType
                        text
                        imageUrl
                        downloadUrl
                        downloadName
                        linkUrl
                        linkName
                        properties
                        fontSize
                        fontType
                        textCarouselData
                        carouselData {
                            textEditorState
                            labelEditorState
                            type
                            imageUrl
                            alt
                            fileName
                            fileIdentifier
                        }
                        accordionData
                        checkListTextData
                        tableData
                        selectedModalId
                        fileName
                        editorState
                        timerData
                        btnType
                        imageCarouselData
                        checklistImageData
                        includeSeconds
                        clickableAlphabetData
                        dimensions
                        audioUrl
                        tabsData
                        editAsHtml
                    }
                }
            }
        }
    }
`;

const getModalsForActivitySteps = gql`
    query getModals {
        getModals {
            id
            name
            nameForContentDev
        }
    }
`;

const getSchoolsForFeedFilter = gql`
    query getSchools {
        getSchools {
            id
            schoolName
        }
    }
`;
/* removed
        curentPeriod {
            longName
        }
    from below query
*/
const allAdminQueries = gql`
    query allAdminQueries {
        allAdminQueries {
            id
            name
            sqlQuery
            order
        }
    }
`;

const getSchools = gql`
    query getSchoolsForSchoolOverview($filter: GetSchoolsForSchoolOverviewInput) {
        getSchoolsForSchoolOverview(filter: $filter) {
            id
            schoolName
            urn
            commentsAndPhotos
            hasUninvitedStaff
            hasSchoolLeadersAwaitingWelcome
            tags {
                name
                color
            }
            curentPeriod {
                longName
            }
        }
    }
`;

const getUninvitedStaff = gql`
    query getUninvitedStaff($schoolIds: [String!]!) {
        getUninvitedStaff(schoolIds: $schoolIds) {
            userId
            firstname
            lastname
            isSchoolLeader
            inviteMode
            schoolId
            schoolName
        }
    }
`;

const getSchoolsAwaitingWelcome = gql`
    query getSchoolsAwaitingWelcome($schoolIds: [String!]!) {
        getSchoolsAwaitingWelcome(schoolIds: $schoolIds) {
            schoolId
            schoolName
            leaderCount
        }
    }
`;

// Only fetched for a school the admin expands in the send welcome emails modal.
const getSchoolLeadersAwaitingWelcome = gql`
    query getSchoolLeadersAwaitingWelcome($schoolId: String!) {
        getSchoolLeadersAwaitingWelcome(schoolId: $schoolId) {
            userId
            firstname
            lastname
            email
        }
    }
`;

const getSchoolTeachersForAdmin = gql`
    query getSchoolTeachersForAdmin($schoolId: String!) {
        getSchoolTeachersForAdmin(schoolId: $schoolId) {
            id
            firstname
            lastname
            email
            userStatus
            isSchoolLeader
            inviteMode
            resetPassToken
            lastLogin
            lastAccess
            type
        }
    }
`;

const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            schoolName
            commentsAndPhotos
            pupilsActive
            starsEarned
            classes {
                id
                name
                yearGroup {
                    year
                }
                importedSchoolClass {
                    id
                    name
                }
            }
            importedSchool {
                id
                classes {
                    id
                    name
                }
            }
        }
    }
`;
/* removed
        curentPeriod {
            index
        }
    from below query
*/
const getSchoolForClass = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            misName
            numOfTotalClassesAllowed
            numOfFullProgrammeClassesAllowed
            isReadyTeddyAvailable
            remainingAllowedClassesInfo {
                fullProgramme
                total
            }
            curentPeriod {
                index
            }
            nextPeriod {
                index
            }
            isReadyTeddyEnabled
            isMoneySkillsAvailable
            importedSchool {
                id
                classes {
                    id
                    name
                    period {
                        index
                    }
                    lwpSchoolClass {
                        id
                        period {
                            index
                        }
                    }
                }
            }
        }
    }
`;

const getSchoolForMisLinking = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            misName
            schoolName
        }
    }
`;

const getSchoolForSchoolOverview = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            misName
            schoolName
            enableBookNameOnlyReadingLog
            parentFeedbackTickFeatureEnabledAt
            isParentFeedbackReplyFeatureEnabled
            isParentFeedbackStickerFeatureEnabled
            schoolSubjectType
            isDownloadSchoolData
            isMoneySkillsAvailable
            remainingAllowedClassesInfo {
                fullProgramme
                total
            }
            curentPeriod {
                index
                nextPeriod {
                    shortName
                }
            }
            importedSchool {
                id
                classes {
                    id
                    name
                    period {
                        index
                    }
                    lwpSchoolClass {
                        id
                        period {
                            index
                        }
                    }
                }
            }
            pupilsWithoutClassesCount {
                currentYear
                nextYearNonIgnoredPupils
                nextYearTotalPupils
            }
        }
    }
`;

const generateTestCertificate = gql`
    query generateTestCertificate($id: String!) {
        generateTestCertificate(id: $id)
    }
`;

const getStaticTrophy = gql`
    query getStaticTrophy($id: String!) {
        getStaticTrophy(id: $id) {
            id
            logo
            certificatePdf
            order
            title
            startDate
            endDate
            isActive
            isPupilMail
            isTeacherMail
            certificate
            subjects {
                id
                name
            }
        }
    }
`;

const getSchoolForSchoolDetailsForTeacher = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            schoolName
            urn
            tags {
                id
                name
                color
            }
            socialLoginPermissions {
                email
                google
                microsoft
            }
            lastImportedAt
            importedSchoolId
            commentsAndPhotos
            logo
            isWondeDataSyncedWithLwp
            misName
            numOfFullProgrammeClassesAllowed
            numOfTotalClassesAllowed
            organisations
            termsAndConditions
            privacyPolicy
            tenantDomain
            msTenantIssuer
            curentPeriod {
                index
            }
            classes {
                id
                name
                isRegistrationClass
                importedSchoolClass {
                    id
                    name
                }
            }
            pupils {
                id
                fullname
                pupilStatus
                feedbackCount
                classes {
                    name
                    yearGroup {
                        year
                    }
                }
                importedStudent {
                    id
                }
            }
            importedSchool {
                id
                name
                urn
                classes {
                    id
                    name
                }
            }
        }
    }
`;
const getSchoolForSchoolDetailsForAdmin = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            schoolName
            urn
            tags {
                id
                name
                color
            }
            inactive
            isTestSchool
            enableAddClasses
            skipAutoWondeImport
            socialLoginPermissions {
                email
                google
                microsoft
            }
            importStatus
            lastImportedAt
            importedSchoolId
            commentsAndPhotos
            logo
            isWondeDataSyncedWithLwp
            misName
            numOfFullProgrammeClassesAllowed
            numOfTotalClassesAllowed
            organisations
            termsAndConditions
            privacyPolicy
            tenantDomain
            msTenantIssuer
            isMoneySkillsAvailable
            isReadyTeddyAvailable
            ignoreAcademicYearCheckDuringImport
            curentPeriod {
                index
            }
            classes {
                id
                name
                isRegistrationClass
                importedSchoolClass {
                    id
                    name
                }
            }
            importedSchool {
                id
                name
                urn
                classes {
                    id
                    name
                }
            }
            isReadyTeddyEnabled
        }
    }
`;

const getSchoolImportStatus = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            importStatus
        }
    }
`;

const getLogParentPupilActionHistory = gql`
    query getLogParentPupilActionHistory($offset: Float, $limit: Float, $userId: String!) {
        getLogParentPupilActionHistory(offset: $offset, limit: $limit, userId: $userId) {
            total
            limit
            offset
            page_total
            results {
                id
                action
                pupilId
                param1
                param2
                param3
                time
            }
        }
    }
`;

const getSchoolClassForAdmin = gql`
    query getSchoolClasses($schoolId: String!) {
        getSchoolClasses(schoolId: $schoolId) {
            id
            name
            period {
                longName
            }
            yearGroup {
                id
                year
            }
            classSize
            mainTeacher {
                firstname
                lastname
            }
            school {
                schoolName
            }
            importedSchoolClass {
                id
                name
            }
        }
    }
`;
const getSchoolClassesForClassOverview = gql`
    query getSchoolClassesForClassOverview($schoolId: String!, $getGroups: Boolean! = false) {
        getSchoolClassesForClassOverview(schoolId: $schoolId, getGroups: $getGroups) {
            id
            name
            readingTarget
            isFullProgramme
            isGroupAcrossClasses
            IsReadingLogsEnabled
            isReadyTeddyEnabled
            isPreAdmissionClass
            isRegistrationClass
            status
            subjects {
                name
            }
            schoolClassName
            period {
                longName
            }
            yearGroup {
                id
                year
            }
            classSize
            mainTeacher {
                firstname
                lastname
            }
            school {
                schoolName
            }
            parentClass {
                name
                schoolClassName
            }
            importedSchoolClass {
                id
                name
            }
        }
    }
`;

export const getWondeClasses = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            schoolName
            importedSchool {
                id
                name
                classes {
                    id
                    name
                    code
                    yearGroup {
                        year
                    }
                    period {
                        longName
                    }
                }
            }
        }
    }
`;

const getClassPupilsForAdmin = gql`
    query getClassPupilsForAdmin($classId: String!) {
        getClassPupilsForAdmin(classId: $classId) {
            id
            fullname
            pupilStatus
            lastLogin
            startedSchool
            importedStudent {
                id
            }
            classes {
                name
            }
            parents {
                parent {
                    firstname
                    lastname
                }
            }
        }
    }
`;

const getAllTopicDomains = gql`
    query allTopicDomains {
        allTopicDomains {
            id
            title
            subject {
                name
                programmeType
            }
            yearGroups {
                id
                year
            }
        }
    }
`;

const getAllMathscotThemes = gql`
    query allMathscotThemes {
        allMathscotThemes
    }
`;

const getAllYearGroups = gql`
    query allYearGroup($showHiddenYearGroup: Boolean) {
        allYearGroup(showHiddenYearGroup: $showHiddenYearGroup) {
            id
            year
            shortName
        }
    }
`;

// Every subject, for admin screens that need to name or filter by one.
const getAllSubjectsForAdmin = gql`
    query getSubjectsForAdmin {
        getSubjectsForAdmin {
            id
            name
        }
    }
`;

const getUserByToken = gql`
    query getUserByToken($token: String!) {
        getUserFromMagicLink(token: $token) {
            firstname
            lastname
            email
            phoneNumber
            nameForChildren
            type
        }
    }
`;

const getUserByTokenForRegisterEmail = gql`
    query getUserByToken($token: String!) {
        getUserFromMagicLink(token: $token) {
            email
            phoneNumber
        }
    }
`;

const getAdmins = gql`
    query getAdmins {
        getAdmins {
            id
            firstname
            lastname
            email
            userStatus
            lastAccess
            type
        }
    }
`;

const getAllResources = gql`
    query allResources {
        allResources {
            id
            title
            description
            file
            download
            leaderOnly
        }
    }
`;

const getTeacher = gql`
    query teacher($id: String!) {
        teacher(id: $id) {
            id
            firstname
            lastname
            email
            nameForChildren
            userStatus
            type
            lastLogin
            lastAccess
            isSchoolLeader
            userStatusChangeLogs {
                id
                previousStatus
                newStatus
                logCreatedAt
            }
            school {
                id
                schoolName
            }
            lastLoginInfo {
                browserName
                osName
                deviceType
                date
                userAgent
                userType
                loginType
            }
        }
    }
`;

const getTeacherClasses = gql`
    query teacher($id: String!) {
        teacher(id: $id) {
            id
            classes {
                id
                name
                missingCount
                activeCount
                registerCount
                period {
                    shortName
                }
                yearGroup {
                    year
                }
                mainTeacher {
                    firstname
                    lastname
                }
            }
        }
    }
`;

const allParameters = gql`
    query allParameters {
        allParameters {
            key
            value
            logCreatedAt
            logUpdatedAt
        }
    }
`;

const getParameterByKey = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

export const getParameters = gql`
    query getParameters($keys: [String!]!) {
        getParameters(keys: $keys) {
            key
            value
        }
    }
`;

const getPupilParents = gql`
    query getPupilParents($pupilId: String!) {
        getPupilParents(pupilId: $pupilId) {
            id
            status
            lastInvitationEmailSent
            logLastStatusChange
            parent {
                id
                firstname
                lastname
                email
                deletedEmail
                phoneNumber
                deletedPhoneNumber
                userStatus
                lastLogin
                lastAccess
            }
        }
    }
`;

const getSearchResults = gql`
    query getSearchResults($query: String!) {
        getSearchResults(query: $query) {
            id
            type
            name
            email
            phone
            commentsAndPhotos
            mainTeacherName
            mainClassName
            subjects {
                name
            }
            isReadingGroup
            pupilStatus
            classSize
            code
            yearGroup
            isPremium
            pupilStatus
            urn
            wondeId
            UPN
        }
    }
`;

const getClassMissingPupils = gql`
    query getClassMissingPupils($classId: String!) {
        getClassMissingPupils(classId: $classId) {
            id
            firstname
            lastname
            pupilStatus
            nonRejectedParents {
                status
                parentId
                pupilId
                lastInvitationEmailSent
                parent {
                    id
                    firstname
                    lastname
                    email
                    phoneNumber
                    userStatus
                }
            }
        }
    }
`;

const getCurrentPeriod = gql`
    query getCurrentPeriod {
        getCurrentPeriod {
            index
            shortName
        }
    }
`;

const getAllFiles = gql`
    query getAllFiles {
        getAllFiles {
            id
            filename
            download
        }
    }
`;

const getStaticTrophies = gql`
    query getStaticTrophies {
        getStaticTrophies {
            id
            title
            order
            certificate
        }
    }
`;

const getSchoolPupils = gql`
    query getSchoolPupils($schoolId: String!, $pupilName: String, $isSchoolMIS: Boolean) {
        getSchoolPupils(schoolId: $schoolId, pupilName: $pupilName, isSchoolMIS: $isSchoolMIS) {
            id
            fullname
            yearGroup
            currentClass {
                name
            }
        }
    }
`;

const getSchoolPupilsWithoutMIS = gql`
    query getSchoolPupilsWithoutMIS($schoolId: String!) {
        getSchoolPupilsWithoutMIS(schoolId: $schoolId) {
            fullname
            id
            currentClass {
                name
                yearGroup {
                    year
                }
            }
            yearGroup
            classes {
                id
                name
                yearGroup {
                    year
                }
                period {
                    isPreviousPeriod
                    shortName
                }
            }
        }
    }
`;

const getSchoolPupilsWithoutMISForClassesOverview = gql`
    query getSchoolPupilsWithoutMIS($schoolId: String!) {
        getSchoolPupilsWithoutMIS(schoolId: $schoolId) {
            id
        }
    }
`;

const getSchoolPupilsWithoutClasses = gql`
    query getSchoolPupilsWithoutClasses($schoolId: String!, $isPreRegistrationPupils: Boolean!) {
        getSchoolPupilsWithoutClasses(schoolId: $schoolId, isPreRegistrationPupils: $isPreRegistrationPupils) {
            id
            fullname
            yearGroup
            isIgnoredForFutureYearClasses
            classes {
                id
                name
                period {
                    shortName
                }
            }
        }
    }
`;

const getCsvFromQuery = gql`
    query getCsvFromQuery($query: String!) {
        getCsvFromQuery(query: $query)
    }
`;

const allStaticPeriods = gql`
    query allStaticPeriods {
        allStaticPeriods {
            index
        }
    }
`;

const getStaticTrophiesForSelectPupilTable = gql`
    query getStaticTrophies {
        getStaticTrophies {
            id
            title
        }
    }
`;

const getRecentStaticTrophyForSelectPupilTable = gql`
    query getRecentStaticTrophy {
        getRecentStaticTrophy {
            id
            title
        }
    }
`;
const getActiveStaticTrophy = gql`
    query getActiveStaticTrophy {
        getActiveStaticTrophy {
            id
            title
        }
    }
`;
const isActiveStaticTrophyExist = gql`
    query isActiveStaticTrophyExist {
        isActiveStaticTrophyExist
    }
`;

const pupilHaveHistory = gql`
    query pupilHaveHistory($pupilId: String!) {
        pupilHaveHistory(pupilId: $pupilId)
    }
`;

const haveMoreChildren = gql`
    query haveMoreChildren {
        haveMoreChildren
    }
`;

const getMISRegistrationClassPupils = gql`
    query getMISRegistrationClassPupils($wondeClassId: String!, $classId: String) {
        getMISRegistrationClassPupils(wondeClassId: $wondeClassId, classId: $classId)
    }
`;

const getUserFromMagicLink = gql`
    query getUserFromMagicLink($token: String!) {
        getUserFromMagicLink(token: $token) {
            id
            type
            email
            phoneNumber
        }
    }
`;

export const getSchoolClassesAndGroups = gql`
    query getSchoolClassesAndGroups($schoolId: String!, $myClasses: Boolean!) {
        getSchoolClassesAndGroups(schoolId: $schoolId, myClasses: $myClasses) {
            id
            name
            isMyClass
            isFullProgramme
            IsReadingLogsEnabled
            isPreAdmissionClass
            isReadyTeddyEnabled
            status
            groups {
                id
                name
                isMyGroup
                isReadingClass
                hasTopics
                isPreAdmissionClass
                isReadyTeddyEnabled
            }
        }
    }
`;

export const getGroupsAcrossClasses = gql`
    query getGroupsAcrossClasses($schoolId: String!, $myClasses: Boolean!) {
        getGroupsAcrossClasses(schoolId: $schoolId, myClasses: $myClasses) {
            id
            name
            isMyClass
            isGroupAcrossClasses
            isFullProgramme
            IsReadingLogsEnabled
            isPreAdmissionClass
            isReadyTeddyEnabled
            status
        }
    }
`;

export const getPreAdmissionClasses = gql`
    query getPreAdmissionClasses($schoolId: String!) {
        getPreAdmissionClasses(schoolId: $schoolId) {
            id
            name
            isMyClass
            status
            isPreAdmissionClass
            isReadyTeddyEnabled
            groups {
                id
                name
                isMyGroup
                isPreAdmissionClass
                isReadyTeddyEnabled
            }
        }
    }
`;

const getPupilForClassGroups = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            fullname
            classes {
                id
            }
            classGroups {
                id
                name
                IsReadingLogsEnabled
                subjects {
                    name
                }
                mainTeacher {
                    firstname
                    lastname
                }
            }
        }
    }
`;

export const getStickerAssetsByTypeForAdmin = gql`
    query getStickerAssetsByTypeForAdmin($type: StickerCharacterItemType!, $isActive: Boolean!) {
        getStickerAssetsByTypeForAdmin(type: $type, isActive: $isActive) {
            id
            fileName
            imageUrl
            alt
        }
    }
`;

export const getAllStickersForSchool = gql`
    query getAllStickersForSchool($schoolId: String!) {
        getAllStickersForSchool(schoolId: $schoolId) {
            active {
                id
                fileName
                imageUrl
                alt
                isActive
                label
                school {
                    id
                }
            }
            inActive {
                id
                fileName
                imageUrl
                alt
                isActive
                label
                school {
                    id
                }
            }
        }
    }
`;

export const getStickersForTeacher = gql`
    query getStickersForTeacher($schoolId: String!) {
        getStickersForTeacher(schoolId: $schoolId) {
            id
            fileName
            imageUrl
            alt
            label
            school {
                id
            }
        }
    }
`;

export const getClassReadingTopicForWeekByWeek = gql`
    query getClassReadingTopicForWeekByWeek($classId: String!, $topicId: String) {
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
                }
                pupil {
                    id
                    fullname
                    pupilStatus

                    school {
                        id
                    }

                    tags {
                        id
                        name
                        color
                    }
                }
            }
        }
    }
`;

export const getGroupAcrossClassesReadingTopicForWeekByWeek = gql`
    query getGroupAcrossClassesReadingTopicForWeekByWeek($classId: String!, $topicId: String) {
        getGroupAcrossClassesReadingTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
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
                }
                pupil {
                    id
                    fullname
                    pupilStatus

                    school {
                        id
                    }

                    tags {
                        id
                        name
                        color
                    }
                }
            }
        }
    }
`;

export const getClassTopicForWeekByWeek = gql`
    query getClassTopicForWeekByWeek($classId: String!, $topicId: String) {
        getClassTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
            topicId
            nextTopicId
            previousTopicId
            teacherTopicName
            releaseDate
            dueDate
            teacherMessage
            isReleased
            isRegisterationClassTopic
            teacherPdf
            schoolClassName
            staticTopicId
            scrapbookPrompt
            statistics {
                completed
                notStarted
                inProgress
            }

            topicWillReleasedFor {
                fullname
            }

            topicNotSetFor {
                fullname
            }

            pupilTopics {
                id
                watchedVideo

                activities {
                    id
                    earnedStar
                }

                pupil {
                    id
                    fullname
                    pupilStatus
                    school {
                        id
                    }
                    classes {
                        id
                    }

                    tags {
                        id
                        name
                        color
                    }
                }
            }
        }
    }
`;

export const getClassesAndGroupsInfoOfPupils = gql`
    query getClassesAndGroupsInfoOfPupils($schoolId: String!, $classId: String, $readingOnly: Boolean!) {
        getClassesAndGroupsInfoOfPupils(schoolId: $schoolId, classId: $classId, readingOnly: $readingOnly) {
            id
            pupilName
            groups {
                id
                name
                yearGroup
            }
            classes {
                id
                name
                yearGroup
            }
        }
    }
`;

const impactReportFragment = gql`
    fragment ImpactReportFields on LwpSchoolImpactReportV1Output {
        id
        launchDate
        spmNote
        spmNextStepsProgram
        premiumPupilsCount
        pupilsCount
        numberOfWeeks
        weeklyReadingTarget
        yearGroupCoverage
        numberOfClasses
        activeFamiliesPercentage
        activeFamiliesPercentageAllSchools
        activePremiumFamiliesPercentage
        activePremiumFamiliesPercentageAllSchools
        reportType
        logCreatedAt
        version
        term {
            termName
        }
        feedbacks {
            pupilFirstName
            contentType
            className
            classYearGroup
            content
            id
        }
        engagementByYearGroup {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
            premiumPupilCount
            allPupilsCount
        }
        engagementByClass {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
            premiumPupilCount
            allPupilsCount
        }
        avgWeeklyTargetMetByYearGroup {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
            premiumPupilCount
            allPupilsCount
        }
        avgWeeklyTargetMetByClass {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
            premiumPupilCount
            allPupilsCount
        }
        avgTopicSetByYearGroup {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
            premiumPupilCount
            allPupilsCount
        }
        avgTopicSetByClass {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
            premiumPupilCount
            allPupilsCount
        }
        buildingEngagement {
            name
            activeFamiliesPercentage
            activePremiumFamiliesPercentage
        }
    }
`;

const getSchoolImpactReport = gql`
    query getSchoolImpactReport($schoolId: String!, $termId: String!, $reportType: SchoolImpactReportType!) {
        getSchoolImpactReport(schoolId: $schoolId, termId: $termId, reportType: $reportType) {
            ...ImpactReportFields
        }
    }
    ${impactReportFragment}
`;

const getSchoolImpactReportForAdmin = gql`
    query getSchoolImpactReportForAdmin($schoolId: String!, $termId: String!, $reportType: SchoolImpactReportType!) {
        getSchoolImpactReportForAdmin(schoolId: $schoolId, termId: $termId, reportType: $reportType) {
            ...ImpactReportFields
        }
    }
    ${impactReportFragment}
`;

const getSchoolClassForWeekByWeekPage = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            IsReadingLogsEnabled
            isFullProgramme
            isReadyTeddyEnabled
            isPreAdmissionClass
            isGroupAcrossClasses
            isRegistrationClass
            academicYearInfo {
                shortName
                isInPreviousAcademicYear
            }
            subjects {
                name
            }
            status
            schoolClassName
            attentionRequiredPupilsCount
            mainTeacher {
                nameForChildren
            }
            school {
                id
                misName
                parentFeedbackTickFeatureEnabledAt
                isParentFeedbackStickerFeatureEnabled
                isParentFeedbackReplyFeatureEnabled
                isScrapbookEnabledForSchool
                isMoneySkillsAvailable
            }
            classTopicContext {
                hasReadingTopic
                hasTopics
            }
            currentReadingWeek {
                id
            }
            parentClass {
                id
                name
            }
        }
    }
`;

export const getReadingTopics = gql`
    query getReadingTopics($pupilId: String!) {
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
                }
            }
        }
    }
`;

export const getPupilReadingNoteForReadingLog = gql`
    query getPupilReadingNote($pupilId: String!, $pupilTopicId: String!) {
        getPupilReadingNote(pupilId: $pupilId, pupilTopicId: $pupilTopicId) {
            headingText
            messageText
            classReadingTarget
            pupilEarnedStars
        }
    }
`;

export const getStickersForTeacherForFeedbackReply = gql`
    query getStickersForTeacher($schoolId: String!) {
        getStickersForTeacher(schoolId: $schoolId) {
            id
            fileName
            imageUrl
            alt
        }
    }
`;

export const getSchoolForDashboardWrapper = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            schoolName
            impactReportExists
            isMoneySkillsAvailable
            isDownloadSchoolData
            isDataImportReviewEnabledForSchool
            pendingImportActionsCount
            misName
            features {
                code
            }
            curentPeriod {
                index
                shortName
                nextPeriod {
                    index
                    shortName
                }
            }
            pupilsWithoutClassesCount {
                currentYear
                nextYearNonIgnoredPupils
            }
        }
    }
`;

export const getSchoolForSchoolOverviewPage = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            pupilsActive
            starsEarned
            commentsAndPhotos
            misName
            schoolName
            enableAddClasses
            isReadyTeddyEnabled
            isReadyTeddyAvailable
            numOfTotalClassesAllowed
            numOfFullProgrammeClassesAllowed
            importStatus
            lastImportedAt
            importedSchool {
                id
            }
            curentPeriod {
                startDate
                nextPeriod {
                    shortName
                }
            }
            remainingAllowedClassesInfo {
                fullProgramme
                total
            }
            pupilsWithoutMISCount
        }
    }
`;

export const getAllPageAnnouncementsForUser = gql`
    query getAllPageAnnouncementsForUser($id: String!) {
        getAllPageAnnouncementsForUser(id: $id) {
            id
            message
            imageUrl
            isSeenByUser
        }
    }
`;

export const getPageAnnouncementsForAllUsers = gql`
    query getPageAnnouncementsForAllUsers {
        getPageAnnouncementsForAllUsers {
            id
            message
            imageUrl
            targetPages
        }
    }
`;

export const getV2SchoolImpactReport = gql`
    query getV2SchoolImpactReport($schoolId: String!, $termId: String!, $isPublished: Boolean!) {
        getV2SchoolImpactReport(schoolId: $schoolId, termId: $termId, isPublished: $isPublished) {
            id
            launchDate
            spmNote
            spmNextStepsProgram
            numberOfWeeks
            weeklyReadingTarget
            yearGroupCoverage
            numberOfClasses
            activeFamiliesPercentage
            activeFamiliesPercentageAllSchools
            activePremiumFamiliesPercentage
            activePremiumFamiliesPercentageAllSchools
            reportType
            logCreatedAt
            version
            showNationalDataAverage
            term {
                termName
            }
            feedbacks {
                pupilFirstName
                contentType
                className
                classYearGroup
                content
                id
            }
            graphs {
                id
                premiumPupilsCount
                pupilsCount
                engagementByYearGroup {
                    name
                    activeFamiliesPercentage
                    activePremiumFamiliesPercentage
                    premiumPupilCount
                    allPupilsCount
                }
                avgTopicSetByClass {
                    name
                    activeFamiliesPercentage
                    activePremiumFamiliesPercentage
                    premiumPupilCount
                    allPupilsCount
                }
                avgCompletionRateByYearGroup {
                    name
                    activeFamiliesPercentage
                    activePremiumFamiliesPercentage
                    premiumPupilCount
                    allPupilsCount
                }
                buildingEngagement {
                    name
                    activeFamiliesPercentage
                    activePremiumFamiliesPercentage
                }
                subject {
                    id
                    name
                }
            }
        }
    }
`;

export const getSubjectsForTrophyCertificate = gql`
    query getSubjectsForAdmin {
        getSubjectsForAdmin {
            id
            name
        }
    }
`;

export {
    allAdminQueries,
    allFAQs,
    allMathscotItem,
    allParameters,
    allSchoolHolidaysOfSchoolForAdmin,
    allStaticPeriods,
    allTeacher,
    generateTestCertificate,
    getActiveStaticTrophy,
    getActivity,
    getActivityForPreview,
    getAdmins,
    getAllDemoFeedsForAdmin,
    getAllFeedsForAdmin,
    getAllFiles,
    getAllMathscotThemes,
    getAllNews,
    getAllPupils,
    getAllResources,
    getAllSchoolDates,
    getAllSchoolHolidays,
    getAllSchoolHolidaysOfSchool,
    getAllStaticPeriods,
    getAllStaticYearGroup,
    getAllSubjectsForAdmin,
    getAllTopicDomains,
    getAllTopicsForFeedFilter,
    getAllYearGroups,
    getClassImportedPupils,
    getClassMissingPupils,
    getClassPupils,
    getClassPupilsForAdmin,
    getClassPupilsForRegisterTable,
    getClassPupilsForSimsLinking,
    getClassPupilsForTeacher,
    getClassPupilsForWarningModal,
    getClassTopic,
    getClassTopicForClassTopicOverview,
    getClassTopics,
    getClassTopicsForAdmin,
    getCsvFromQuery,
    getCurrentPeriod,
    getHolidaysForAdmin,
    getImportedSchoolClass,
    getImportedSchoolPupils,
    getImportedSchoolPupilsForSimsLinking,
    getLastAccess,
    getLikedActivityFeeds,
    getLogParentPupilActionHistory,
    getMISRegistrationClassPupils,
    getModal,
    getModals,
    getModalsForActivitySteps,
    getParameterByKey,
    getParentPupilsForAdmin,
    getPupil,
    getPupilActivitiesOfPupilTopic,
    getPupilActivityFeeds,
    getPupilActivityForPupilActivityOverview,
    getPupilClasses,
    getPupilClassesForAdmin,
    getPupilFeedbacksOfPupilActivity,
    getPupilForAdminPupilView,
    getPupilForAwardTrophy,
    getPupilForClassGroups,
    getPupilForEditPupilMathscot,
    getPupilForOwnActivityPage,
    getPupilForParentsAndCarersTableForParent,
    getPupilForParentsAndCarersTableForTeacher,
    getPupilForTeacher,
    getPupilForWelcomeChild,
    getPupilHistory,
    getPupilList,
    getPupilParents,
    getPupilReadingTopicsForPupilReadingTab,
    getPupils,
    getPupilTopicsForClassTopicOverview,
    getPupilTopicsForPupilTopicsOverview,
    getReadingTopicForClassReadingPage,
    getRecentStaticTrophyForSelectPupilTable,
    getSchool,
    getSchoolClass,
    getSchoolClasses,
    getSchoolClassesForClassOverview,
    getSchoolClassesForDashboard,
    getSchoolClassesForForPupilActivityFeedFilter,
    getSchoolClassForAdmin,
    getSchoolClassForClassDetailsPage,
    getSchoolClassforSelectTopic,
    getSchoolClassForWeekByWeekPage,
    getSchoolClassMainTeacher,
    getSchoolClassName,
    getSchoolClassSchoolData,
    getSchoolClassWithImportedStudents,
    getSchoolDate,
    getSchoolForClass,
    getSchoolForMisLinking,
    getSchoolForSchoolDetailsForAdmin,
    getSchoolForSchoolDetailsForTeacher,
    getSchoolForSchoolOverview,
    getSchoolImpactReport,
    getSchoolImpactReportForAdmin,
    getSchoolImportStatus,
    getSchoolLeadersAwaitingWelcome,
    getSchoolPupils,
    getSchoolPupilsWithoutClasses,
    getSchoolPupilsWithoutMIS,
    getSchoolPupilsWithoutMISForClassesOverview,
    getSchools,
    getSchoolsAwaitingWelcome,
    getSchoolsForFeedFilter,
    getSchoolTeachers,
    getSchoolTeachersForAdmin,
    getSearchResults,
    getStaticTrophies,
    getStaticTrophiesForSelectPupilTable,
    getStaticTrophy,
    getTeacher,
    getTeacherClasses,
    getTeacherFAQs,
    getTopic,
    getTopicActivitiesForAdmin,
    getTopicForAdmin,
    getTopicForPreview,
    getUninvitedStaff,
    getUser,
    getUserByToken,
    getUserByTokenForRegisterEmail,
    getUserForAdmin,
    getUserForPupilActivityFeedFilter,
    getUserFromMagicLink,
    haveMoreChildren,
    isActiveStaticTrophyExist,
    pupilHaveHistory
};
