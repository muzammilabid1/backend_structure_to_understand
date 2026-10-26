import gql from 'graphql-tag';

const signup = gql`
    mutation signup($input: UserSignUpInput!) {
        signup(input: $input) {
            access_token
            refresh_token
        }
    }
`;

const resetUsersSavedPermissions = gql`
    mutation resetUsersSavedPermissions {
        resetUsersSavedPermissions
    }
`;

const updatePupil = gql`
    mutation updatePupil($input: UpdatePupilInput!) {
        updatePupil(input: $input) {
            id
        }
    }
`;

const updateParent = gql`
    mutation updateParent($input: UpdateParentInput!) {
        updateParent(input: $input) {
            id
        }
    }
`;

const addClassTopic = gql`
    mutation addClassTopic($input: ClassTopicInput!, $file: [Upload!]) {
        addClassTopic(input: $input, file: $file) {
            id
        }
    }
`;

const updateClassTopic = gql`
    mutation updateClassTopic($input: UpdateClassTopicInput!, $file: [Upload!]) {
        updateClassTopic(input: $input, file: $file) {
            id
        }
    }
`;

const updatePupilMathscot = gql`
    mutation updatePupilMathscot($input: UpdatePupilMathscotInput!) {
        updatePupilMathscot(input: $input) {
            id
        }
    }
`;

const previewPupilMathscotForEditMathscot = gql`
    mutation previewPupilMathscot($input: MathscotChoicesInput!) {
        previewPupilMathscot(input: $input)
    }
`;

const mergeMathscotItems = gql`
    mutation mergeMathscotItems($input: MergeMathscotItemsInput!, $logInput: MergeMathscotItemsLogInput!, $periodIndex: Float) {
        mergeMathscotItems(input: $input, logInput: $logInput, periodIndex: $periodIndex) {
            bigImage
            thumbnailImage
        }
    }
`;

const createStaticTrophy = gql`
    mutation createStaticTrophy($input: StaticLwpTrophyInput!, $file: [Upload!]) {
        createStaticTrophy(file: $file, input: $input) {
            id
        }
    }
`;

const addSchoolDate = gql`
    mutation addSchoolDate($input: AddSchoolDateInput!) {
        addSchoolDate(input: $input) {
            id
        }
    }
`;

const updateSchoolDate = gql`
    mutation updateSchoolDate($input: UpdateSchoolDateInput!) {
        updateSchoolDate(input: $input) {
            id
        }
    }
`;

const deleteSchoolDate = gql`
    mutation deleteSchoolDate($id: String!) {
        deleteSchoolDate(id: $id) {
            status
            msg
        }
    }
`;

const addSchoolHoliday = gql`
    mutation addSchoolHoliday($input: AddSchoolHolidayInput!) {
        addSchoolHoliday(input: $input) {
            id
        }
    }
`;

const updateSchoolHoliday = gql`
    mutation updateSchoolHoliday($input: UpdateSchoolHolidayInput!) {
        updateSchoolHoliday(input: $input) {
            id
        }
    }
`;

const releaseHolidayToAllSchools = gql`
    mutation releaseHolidayToAllSchools($id: String!) {
        releaseHolidayToAllSchools(id: $id)
    }
`;

const deleteSchoolHoliday = gql`
    mutation deleteSchoolHoliday($id: String!) {
        deleteSchoolHoliday(id: $id) {
            status
            msg
        }
    }
`;

const updateStaticTrophy = gql`
    mutation updateStaticTrophy($input: UpdateStaticLwpTrophyInput!, $file: [Upload!]) {
        updateStaticTrophy(file: $file, input: $input) {
            id
        }
    }
`;

const addTeacher = gql`
    mutation addTeacher($input: TeacherInput!) {
        addTeacher(input: $input) {
            id
        }
    }
`;

const createSchoolClass = gql`
    mutation createSchoolClass($input: SchoolClassInput!) {
        createSchoolClass(input: $input) {
            id
        }
    }
`;

const likePupilActivityFeedback = gql`
    mutation likePupilActivityFeedback($input: LikePupilActivityFeedbackInput!) {
        likePupilActivityFeedback(input: $input) {
            id
        }
    }
`;

const savePupilActivityRating = gql`
    mutation savePupilActivityRating($id: String!, $rating: Float!) {
        savePupilActivityRating(id: $id, rating: $rating) {
            id
            rating
            earnedStar
        }
    }
`;

const updateTeacher = gql`
    mutation updateTeacher($input: UpdateTeacherInput!) {
        updateTeacher(input: $input) {
            id
        }
    }
`;

const updateAdmin = gql`
    mutation updateAdmin($input: UpdateAdminInput!) {
        updateAdmin(input: $input) {
            id
        }
    }
`;

const inviteTeacher = gql`
    mutation inviteTeacher($input: InviteTeacherInput!) {
        inviteTeacher(input: $input) {
            id
        }
    }
`;

const updateSchoolClass = gql`
    mutation updateSchoolClass($input: UpdateSchoolClassInput!) {
        updateSchoolClass(input: $input) {
            id
        }
    }
`;

const updateSchool = gql`
    mutation updateSchool($input: UpdateSchoolInput!, $file: [Upload!]) {
        updateSchool(input: $input, file: $file) {
            id
        }
    }
`;

const changePassword = gql`
    mutation changePassword($input: ChangePasswordInput!) {
        changePassword(input: $input) {
            id
        }
    }
`;

const savePhotoPermissions = gql`
    mutation savePhotoPermissions($id: String!, $sharingAllowed: Boolean) {
        savePhotoPermissions(id: $id, sharingAllowed: $sharingAllowed) {
            id
        }
    }
`;

const changeClassPupilsPremium = gql`
    mutation changeClassPupilsPremium($input: [ChangeClassPupilPremiumInput!]!) {
        changeClassPupilsPremium(input: $input)
    }
`;

const increaseAccessCount = gql`
    mutation increaseAccessCount($pupilActivityId: String!) {
        increaseAccessCount(pupilActivityId: $pupilActivityId) {
            id
        }
    }
`;

const saveOwnPupilActivityFeedback = gql`
    mutation saveOwnPupilActivityFeedback($file: [Upload!], $input: PupilOwnActivityFeedbackInput!) {
        saveOwnPupilActivityFeedback(file: $file, input: $input) {
            id
        }
    }
`;

const addContact = gql`
    mutation addContact($input: ContactInput!) {
        addContact(input: $input) {
            id
        }
    }
`;

const addAdmin = gql`
    mutation addAdmin($input: AdminInput!) {
        addAdmin(input: $input) {
            link
            user {
                id
            }
        }
    }
`;

const addSchool = gql`
    mutation addSchool($input: SchoolInput!, $file: [Upload!]) {
        addSchool(input: $input, file: $file) {
            id
        }
    }
`;

const addAdminQuery = gql`
    mutation addAdminQuery($input: AdminQueryInput!) {
        addAdminQuery(input: $input) {
            id
        }
    }
`;

const updateAdminQuery = gql`
    mutation updateAdminQuery($input: UpdateAdminQueryInput!) {
        updateAdminQuery(input: $input) {
            id
        }
    }
`;

const addFAQ = gql`
    mutation addFAQ($input: FAQInput!) {
        addFAQ(input: $input) {
            id
        }
    }
`;

const updateFAQ = gql`
    mutation updateFAQ($input: UpdateFAQInput!) {
        updateFAQ(input: $input) {
            id
        }
    }
`;

const deleteFAQ = gql`
    mutation deleteFAQ($id: String!) {
        deleteFAQ(id: $id) {
            status
        }
    }
`;

const deleteAdminQuery = gql`
    mutation deleteAdminQuery($id: String!) {
        deleteAdminQuery(id: $id) {
            status
        }
    }
`;

const refreshAllDataQueries = gql`
    mutation refreshAllDataQueries {
        refreshAllDataQueries
    }
`;

const addNews = gql`
    mutation addNews($input: NewsInput!) {
        addNews(input: $input) {
            id
        }
    }
`;

const updateNews = gql`
    mutation updateNews($input: UpdateNewsInput!) {
        updateNews(input: $input) {
            id
        }
    }
`;

const deleteNews = gql`
    mutation deleteNews($id: String!) {
        deleteNews(id: $id) {
            status
        }
    }
`;

const addStaticPeriod = gql`
    mutation addStaticPeriod($input: PeriodInput!) {
        addStaticPeriod(input: $input) {
            index
        }
    }
`;

const updateStaticPeriod = gql`
    mutation updateStaticPeriod($input: UpdatePeriodInput!) {
        updateStaticPeriod(input: $input) {
            index
        }
    }
`;

const deleteStaticPeriod = gql`
    mutation deleteStaticPeriod($index: Float!) {
        deleteStaticPeriod(index: $index) {
            status
        }
    }
`;
const removePupilsFromSchool = gql`
    mutation removePupilsFromSchool($pupilIds: [String!]!) {
        removePupilsFromSchool(pupilIds: $pupilIds)
    }
`;

const addYearGroup = gql`
    mutation addYearGroup($input: YearGroupInput!) {
        addYearGroup(input: $input) {
            id
        }
    }
`;

const updateOpenCount = gql`
    mutation updateOpenCount($input: UpdateOpenCountInput!) {
        updateOpenCount(input: $input)
    }
`;

const updateYearGroup = gql`
    mutation updateYearGroup($input: UpdateYearGroupInput!) {
        updateYearGroup(input: $input) {
            id
        }
    }
`;

const deleteYearGroup = gql`
    mutation deleteYearGroup($id: String!) {
        deleteYearGroup(id: $id) {
            status
        }
    }
`;

const acceptUserInvitation = gql`
    mutation acceptUserInvitation($input: AcceptUserInvitationInput!) {
        acceptUserInvitation(input: $input) {
            accessToken
            refreshToken
        }
    }
`;

const acceptOrRejectPupilInvitation = gql`
    mutation acceptOrRejectPupilInvitation($rejected: Boolean!, $pupilId: String!, $parentId: String!) {
        acceptOrRejectPupilInvitation(rejected: $rejected, pupilId: $pupilId, parentId: $parentId) {
            id
        }
    }
`;

const forgotPassword = gql`
    mutation forgotPassword($email: String, $phoneNumber: String) {
        forgotPassword(email: $email, phoneNumber: $phoneNumber)
    }
`;

const resetPasswordByToken = gql`
    mutation resetPasswordByToken($input: ResetPasswordInput!) {
        resetPasswordByToken(input: $input) {
            id
        }
    }
`;

const addResource = gql`
    mutation addResource($file: [Upload!]!, $input: ResourceInput!) {
        addResource(file: $file, input: $input) {
            id
        }
    }
`;

export const updateResource = gql`
    mutation updateResource($file: [Upload!], $input: UpdateResourceInput!) {
        updateResource(file: $file, input: $input) {
            id
        }
    }
`;

export const deleteResource = gql`
    mutation deleteResource($id: String!) {
        deleteResource(id: $id) {
            status
            msg
        }
    }
`;
export const deleteSchool = gql`
    mutation deleteSchool($id: String!) {
        deleteSchool(id: $id) {
            status
            msg
        }
    }
`;
export const deletePupilTopic = gql`
    mutation deletePupilTopic($id: String!) {
        deletePupilTopic(id: $id) {
            status
            msg
        }
    }
`;
export const deleteFeedback = gql`
    mutation deleteFeedback($id: String!, $reasonToDelete: String) {
        deleteFeedback(id: $id, reasonToDelete: $reasonToDelete) {
            id
            entryDeletedAt
            reasonToDelete
            bookReadAt
            originalFeedbackId
            logCreatedAt
            logCreatedBy {
                id
                firstname
                lastname
                nameForChildren
                type
            }
        }
    }
`;
export const deletePupilActivity = gql`
    mutation deletePupilActivity($id: String!) {
        deletePupilActivity(id: $id) {
            status
            msg
        }
    }
`;
export const deleteUser = gql`
    mutation deleteUser($id: String!) {
        deleteUser(id: $id) {
            status
            msg
        }
    }
`;
export const deleteDemoFeedback = gql`
    mutation deleteDemoFeedback($id: String!) {
        deleteDemoFeedback(id: $id) {
            status
            msg
        }
    }
`;
export const updatePupilActivity = gql`
    mutation updatePupilActivity($id: String!, $earnedStar: Boolean!, $rating: Float) {
        updatePupilActivity(id: $id, earnedStar: $earnedStar, rating: $rating) {
            id
            earnedStar
            rating
        }
    }
`;
export const deleteSchoolClass = gql`
    mutation deleteSchoolClass($id: String!) {
        deleteSchoolClass(id: $id) {
            status
            msg
        }
    }
`;
export const deleteClassTopic = gql`
    mutation deleteClassTopic($id: String!, $option: ClassTopicDeleteOptions) {
        deleteClassTopic(id: $id, option: $option) {
            status
            msg
        }
    }
`;
export const deleteClassTopics = gql`
    mutation deleteClassTopics($ids: [String!]!) {
        deleteClassTopics(ids: $ids) {
            status
            msg
        }
    }
`;
export const updatePupilTopic = gql`
    mutation updatePupilTopic($input: UpdatePupilTopic!) {
        updatePupilTopic(input: $input) {
            id
        }
    }
`;
export const deletePupil = gql`
    mutation deletePupil($id: String!) {
        deletePupil(id: $id) {
            status
            msg
        }
    }
`;
const resetUserPassword = gql`
    mutation resetUserPassword($email: String!) {
        resetUserPassword(email: $email) {
            link
        }
    }
`;

const addTopic = gql`
    mutation addTopic($input: TopicInput!, $file: [Upload!]) {
        addTopic(input: $input, file: $file) {
            id
        }
    }
`;

const updateTopic = gql`
    mutation updateTopic($input: UpdateTopicInput!, $file: [Upload!]) {
        updateTopic(input: $input, file: $file) {
            id
        }
    }
`;

// const verifyEmailAndPhoneById = gql`
//     mutation verifyEmailAndPhoneById($input: VerifyEmailAndPhoneByIdInput!) {
//         verifyEmailAndPhoneById(input: $input)
//     }
// `;

const generateCertificates = gql`
    mutation generateCertificates($input: GenerateMathscotCertificateInput!) {
        generateCertificates(input: $input)
    }
`;

const sendNotification = gql`
    mutation sendNotification($input: SendNotificationInput!) {
        sendNotification(input: $input)
    }
`;
const sendTestEmail = gql`
    mutation sendTestEmail($input: TestEmailInput!) {
        sendTestEmail(input: $input) {
            response
            status
        }
    }
`;
const deleteModal = gql`
    mutation deleteModal($id: String!) {
        deleteModal(id: $id) {
            status
        }
    }
`;

const removeParentFromPupil = gql`
    mutation removeParentFromPupil($parentId: String!, $pupilId: String!) {
        removeParentFromPupil(parentId: $parentId, pupilId: $pupilId) {
            id
        }
    }
`;

const deletePupilTrophy = gql`
    mutation deletePupilTrophy($id: String!) {
        deletePupilTrophy(id: $id) {
            status
        }
    }
`;

const inviteParentsOfPupils = gql`
    mutation inviteParentsOfPupils($pupilIds: [String!]!) {
        inviteParentsOfPupils(pupilIds: $pupilIds)
    }
`;

const inviteParentOfPupil = gql`
    mutation inviteParentOfPupil($parentId: String!, $pupilId: String!, $sendOnPhone: Boolean!) {
        inviteParentOfPupil(parentId: $parentId, pupilId: $pupilId, sendOnPhone: $sendOnPhone) {
            id
        }
    }
`;

const pullWondeSchoolData = gql`
    mutation pullWondeSchoolData($lwpSchoolId: String!, $wondeSchoolId: String!) {
        pullWondeSchoolData(lwpSchoolId: $lwpSchoolId, wondeSchoolId: $wondeSchoolId)
    }
`;

const linkLwpClassToWondeClass = gql`
    mutation linkLwpClassToWondeClass($input: LinkClassInput!) {
        linkLwpClassToWondeClass(input: $input)
    }
`;

const linkPupilToWondePupil = gql`
    mutation linkPupilToWondePupil($input: LinkPupilInput!) {
        linkPupilToWondePupil(input: $input)
    }
`;

const addActivity = gql`
    mutation addActivity($file: [Upload!], $input: ActivityInput!) {
        addActivity(file: $file, input: $input) {
            id
        }
    }
`;

const addModal = gql`
    mutation addModal($file: [Upload!], $input: ModalInput!) {
        addModal(file: $file, input: $input) {
            id
        }
    }
`;

const updateModal = gql`
    mutation updateModal($file: [Upload!], $input: UpdateModalInput!) {
        updateModal(file: $file, input: $input) {
            id
        }
    }
`;

const removePupilsFromClass = gql`
    mutation removePupilsFromClass($pupilIds: [String!]!, $classId: String!) {
        removePupilsFromClass(pupilIds: $pupilIds, classId: $classId)
    }
`;

const changePupilClass = gql`
    mutation changePupilClass($pupilId: String!, $newClassId: String!) {
        changePupilClass(pupilId: $pupilId, newClassId: $newClassId)
    }
`;

const savePupilFeedbackRating = gql`
    mutation savePupilFeedbackRating($id: String!, $rating: Float!) {
        savePupilFeedbackRating(id: $id, rating: $rating) {
            id
        }
    }
`;

const setSchoolPeriodToCurrent = gql`
    mutation setSchoolPeriodToCurrent($schoolId: String!) {
        setSchoolPeriodToCurrent(schoolId: $schoolId) {
            id
        }
    }
`;

const saveDemoActivityPhotoRating = gql`
    mutation saveDemoActivityPhotoRating($id: String!, $photoRating: Float!) {
        saveDemoActivityPhotoRating(id: $id, photoRating: $photoRating) {
            id
        }
    }
`;

const addPupilMathscot = gql`
    mutation addPupilMathscot($input: AddPupilMathscotInput!) {
        addPupilMathscot(input: $input) {
            id
        }
    }
`;

const addAFile = gql`
    mutation addAFile($download: Boolean!, $file: [Upload!]!) {
        addAFile(download: $download, file: $file)
    }
`;

const deleteAFile = gql`
    mutation deleteAFile($id: String!) {
        deleteAFile(id: $id) {
            status
        }
    }
`;

const submittedInterstitialForm = gql`
    mutation submittedInterstitialForm($input: SubmitInterstitialInput!) {
        submittedInterstitialForm(input: $input)
    }
`;

const addInterstitialForm = gql`
    mutation addInterstitialForm($input: AddInterstitialInput!) {
        addInterstitialForm(input: $input) {
            id
        }
    }
`;

const updateInterstitialForm = gql`
    mutation updateInterstitialForm($input: UpdateInterstitialInput!) {
        updateInterstitialForm(input: $input) {
            id
        }
    }
`;

const deleteInterstitialForm = gql`
    mutation deleteInterstitialForm($id: String!) {
        deleteInterstitialForm(id: $id) {
            status
        }
    }
`;

const releaseInterstitialForm = gql`
    mutation releaseInterstitialForm($id: String!) {
        releaseInterstitialForm(id: $id)
    }
`;

const resetInterstitialForm = gql`
    mutation resetInterstitialForm($id: String!) {
        resetInterstitialForm(id: $id)
    }
`;

const deleteTeacher = gql`
    mutation deleteTeacher($id: String!) {
        deleteTeacher(id: $id) {
            status
            msg
        }
    }
`;

const saveDemoActivityFeedback = gql`
    mutation saveDemoActivityFeedback($file: [Upload!], $input: DemoActivityFeedbackInput!) {
        saveDemoActivityFeedback(file: $file, input: $input) {
            id
        }
    }
`;

const saveReadingNote = gql`
    mutation saveReadingNote($input: ReadingNoteInput!) {
        saveReadingNote(input: $input) {
            id
        }
    }
`;

const deleteStaticTrophy = gql`
    mutation deleteStaticTrophy($id: String!) {
        deleteStaticTrophy(id: $id) {
            status
            msg
        }
    }
`;

const adminReleasePupilTopics = gql`
    mutation adminReleasePupilTopics($date: DateTime) {
        adminReleasePupilTopics(date: $date)
    }
`;

const adminCreateThisWeekReadingTopic = gql`
    mutation adminCreateThisWeekReadingTopic($classId: String!) {
        adminCreateThisWeekReadingTopic(classId: $classId)
    }
`;

const logout = gql`
    mutation logout($refreshToken: String!) {
        logout(refreshToken: $refreshToken)
    }
`;

const addPupilsInClass = gql`
    mutation addPupilsInClass($classId: String!, $pupilIds: [String!]!) {
        addPupilsInClass(input: { classId: $classId, pupilIds: $pupilIds })
    }
`;

const addParameter = gql`
    mutation addParameter($input: ParameterInput!) {
        addParameter(input: $input) {
            key
        }
    }
`;

const updateParameter = gql`
    mutation updateParameter($input: ParameterInput!) {
        updateParameter(input: $input) {
            key
        }
    }
`;

const deleteParameter = gql`
    mutation deleteParameter($id: String!) {
        deleteParameter(id: $id) {
            status
            msg
        }
    }
`;

const removePupilFromSchool = gql`
    mutation removePupilFromSchool($pupilId: String!) {
        removePupilFromSchool(pupilId: $pupilId)
    }
`;

const changeSchoolPeriod = gql`
    mutation changeSchoolPeriod($index: Float!, $schoolId: String!) {
        changeSchoolPeriod(index: $index, schoolId: $schoolId) {
            id
        }
    }
`;

const rejectInviteConfirmation = gql`
    mutation rejectInviteConfirmation($token: String!) {
        rejectInviteConfirmation(token: $token)
    }
`;

const trophiesAssignedToPupils = gql`
    mutation trophiesAssignedToPupils {
        trophiesAssignedToPupils
    }
`;

const adminSendReleasedPupilTopicNotifications = gql`
    mutation adminSendReleasedPupilTopicNotifications {
        adminSendReleasedPupilTopicNotifications
    }
`;

const adminTeacherTopicsToBeReleasedTomorrow = gql`
    mutation adminTeacherTopicsToBeReleasedTomorrow {
        adminTeacherTopicsToBeReleasedTomorrow
    }
`;

const adminTeacherTopicsToBeReleasedNextWeek = gql`
    mutation adminTeacherTopicsToBeReleasedNextWeek {
        adminTeacherTopicsToBeReleasedNextWeek
    }
`;

const adminTeacherMoneySkillsFirstTopicScheduled = gql`
    mutation adminTeacherMoneySkillsFirstTopicScheduled {
        adminTeacherMoneySkillsFirstTopicScheduled
    }
`;

const adminTopicReminderAfter7Days = gql`
    mutation adminTopicReminderAfter7Days {
        adminTopicReminderAfter7Days
    }
`;

const adminSendTrophyMailToPupil = gql`
    mutation adminSendTrophyMailToPupil {
        adminSendTrophyMailToPupil
    }
`;

const adminSendTrophyMailToTeacher = gql`
    mutation adminSendTrophyMailToTeacher {
        adminSendTrophyMailToTeacher
    }
`;

const adminSendTrophyMailToSchoolLeader = gql`
    mutation adminSendTrophyMailToSchoolLeader {
        adminSendTrophyMailToSchoolLeader
    }
`;

const readingTopicReminders = gql`
    mutation readingTopicReminders {
        readingTopicReminders
    }
`;

const sendTeacherReadingTopicEnd = gql`
    mutation sendTeacherReadingTopicEnd {
        sendTeacherReadingTopicEnd
    }
`;

const adminlogsCleanUp = gql`
    mutation adminlogsCleanUp {
        adminlogsCleanUp
    }
`;

const adminCreateReadingTopics = gql`
    mutation adminCreateReadingTopics {
        adminCreateReadingTopics
    }
`;

const reimportSchoolsWondeData = gql`
    mutation reimportSchoolsWondeData {
        reimportSchoolsWondeData
    }
`;
const runHourlySqlQueries = gql`
    mutation runHourlySqlQueries {
        runHourlySqlQueries
    }
`;
const runNightlySqlQueries = gql`
    mutation runNightlySqlQueries {
        runNightlySqlQueries
    }
`;

const updateNoLinkedParentStatusOfPupils = gql`
    mutation updateNoLinkedParentStatusOfPupils {
        updateNoLinkedParentStatusOfPupils
    }
`;

const registerUserEmail = gql`
    mutation registerUserEmail($input: RegisterUserEmailInput!) {
        registerUserEmail(input: $input) {
            id
        }
    }
`;

const reInviteParent = gql`
    mutation reInviteParent($parentId: String!) {
        reInviteParent(parentId: $parentId) {
            id
        }
    }
`;

const reGenerateMagicLink = gql`
    mutation reGenerateMagicLink($token: String!) {
        reGenerateMagicLink(token: $token) {
            url
        }
    }
`;

const removeWondeAndUnusedLwpDataFromWonde = gql`
    mutation removeWondeAndUnusedLwpDataFromWonde($lwpSchoolId: String!) {
        removeWondeAndUnusedLwpDataFromWonde(lwpSchoolId: $lwpSchoolId)
    }
`;

const removeWondeSchoolId = gql`
    mutation removeWondeSchoolId($lwpSchoolId: String!) {
        removeWondeSchoolId(lwpSchoolId: $lwpSchoolId)
    }
`;

const addTrophyInPupil = gql`
    mutation addTrophyInPupil($pupilId: String!, $trophyId: String!, $classId: String!) {
        addTrophyInPupil(pupilId: $pupilId, trophyId: $trophyId, classId: $classId) {
            id
        }
    }
`;

export const logTooltipAction = gql`
    mutation logTooltipAction($tooltipId: String!) {
        logTooltipAction(tooltipId: $tooltipId)
    }
`;

export const enableMoneySkillsForSchool = gql`
    mutation enableMoneySkillsForSchool($schoolId: String!) {
        enableMoneySkillsForSchool(schoolId: $schoolId)
    }
`;

export const mergePupils = gql`
    mutation mergePupils($sourcePupilId: String!, $destinationPupilId: String!) {
        mergePupils(sourcePupilId: $sourcePupilId, destinationPupilId: $destinationPupilId)
    }
`;

const sendStaffInvites = gql`
    mutation sendStaffInvites($userIds: [String!]!) {
        sendStaffInvites(userIds: $userIds)
    }
`;

const sendSchoolLeaderWelcomeEmails = gql`
    mutation sendSchoolLeaderWelcomeEmails($schoolIds: [String!]!) {
        sendSchoolLeaderWelcomeEmails(schoolIds: $schoolIds) {
            sentCount
            failures {
                userId
                name
                reason
            }
        }
    }
`;

export {
    acceptOrRejectPupilInvitation,
    acceptUserInvitation,
    addActivity,
    addAdmin,
    addAdminQuery,
    addAFile,
    addClassTopic,
    addContact,
    addFAQ,
    addInterstitialForm,
    addModal,
    addNews,
    addParameter,
    addPupilMathscot,
    addPupilsInClass,
    addResource,
    addSchool,
    addSchoolDate,
    addSchoolHoliday,
    addStaticPeriod,
    addTeacher,
    addTopic,
    addTrophyInPupil,
    addYearGroup,
    adminCreateReadingTopics,
    adminCreateThisWeekReadingTopic,
    adminlogsCleanUp,
    adminReleasePupilTopics,
    adminSendReleasedPupilTopicNotifications,
    adminSendTrophyMailToPupil,
    adminSendTrophyMailToSchoolLeader,
    adminSendTrophyMailToTeacher,
    adminTeacherMoneySkillsFirstTopicScheduled,
    adminTeacherTopicsToBeReleasedNextWeek,
    adminTeacherTopicsToBeReleasedTomorrow,
    adminTopicReminderAfter7Days,
    changeClassPupilsPremium,
    changePassword,
    changePupilClass,
    changeSchoolPeriod,
    createSchoolClass,
    createStaticTrophy,
    deleteAdminQuery,
    deleteAFile,
    deleteFAQ,
    deleteInterstitialForm,
    deleteModal,
    deleteNews,
    deleteParameter,
    deletePupilTrophy,
    deleteSchoolDate,
    deleteSchoolHoliday,
    deleteStaticPeriod,
    deleteStaticTrophy,
    deleteTeacher,
    deleteYearGroup,
    forgotPassword,
    // verifyEmailAndPhoneById,
    generateCertificates,
    increaseAccessCount,
    inviteParentOfPupil,
    inviteParentsOfPupils,
    inviteTeacher,
    likePupilActivityFeedback,
    linkLwpClassToWondeClass,
    linkPupilToWondePupil,
    logout,
    mergeMathscotItems,
    previewPupilMathscotForEditMathscot,
    pullWondeSchoolData,
    readingTopicReminders,
    refreshAllDataQueries,
    reGenerateMagicLink,
    registerUserEmail,
    reimportSchoolsWondeData,
    reInviteParent,
    rejectInviteConfirmation,
    releaseHolidayToAllSchools,
    releaseInterstitialForm,
    removeParentFromPupil,
    removePupilFromSchool,
    removePupilsFromClass,
    removePupilsFromSchool,
    removeWondeAndUnusedLwpDataFromWonde,
    removeWondeSchoolId,
    resetInterstitialForm,
    resetPasswordByToken,
    resetUserPassword,
    resetUsersSavedPermissions,
    runHourlySqlQueries,
    runNightlySqlQueries,
    saveDemoActivityFeedback,
    saveDemoActivityPhotoRating,
    saveOwnPupilActivityFeedback,
    savePhotoPermissions,
    savePupilActivityRating,
    savePupilFeedbackRating,
    saveReadingNote,
    sendNotification,
    sendSchoolLeaderWelcomeEmails,
    sendStaffInvites,
    sendTeacherReadingTopicEnd,
    sendTestEmail,
    setSchoolPeriodToCurrent,
    signup,
    submittedInterstitialForm,
    trophiesAssignedToPupils,
    updateAdmin,
    updateAdminQuery,
    updateClassTopic,
    updateFAQ,
    updateInterstitialForm,
    updateModal,
    updateNews,
    updateNoLinkedParentStatusOfPupils,
    updateOpenCount,
    updateParameter,
    updateParent,
    updatePupil,
    updatePupilMathscot,
    updateSchool,
    updateSchoolClass,
    updateSchoolDate,
    updateSchoolHoliday,
    updateStaticPeriod,
    updateStaticTrophy,
    updateTeacher,
    updateTopic,
    updateYearGroup
};
