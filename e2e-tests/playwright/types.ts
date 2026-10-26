import { UserStatus } from 'lwp-shared';

export type AddActivityInput = {
    activityName: string;
    staticComponentName: string;
};

export type AddTopicInput = {
    topicName: string;
    topicDomainName: string;
    activities: AddActivityInput[];
};

export type AddClassGroupInput = {
    className: string;
    groupName: string;
    subjectName: string;
    teacherFullName: string;
    pupilName: string;
    setTopicsDifferentFromClass: boolean;
};

export type PlaywrightAssertionType = 'toBeVisible' | 'toBeEnabled';

export type CreateSchoolAndDummyWondeDataInput = {
    school: {
        name: string;
        numOfFullProgrammeClassesAllowed: number;
        numOfTotalClassesAllowed: number;
        enableAddClasses: boolean;
        isMoneySkillsAvailable: boolean;
        isReadyTeddyAvailable: boolean;
        isFutureAcademicYear: boolean;
        isParentFeedbackReplyFeatureEnabled?: boolean;
        isParentFeedbackStickerFeatureEnabled?: boolean;
    };
    leader: {
        firstname: string;
        lastname: string;
        email: string;
        userStatus: UserStatus;
        addTooltip: boolean;
        /**
         * Records the leader as already welcomed to Money Skills auto-scheduling, so the one-time welcome
         * modal does not appear mid-run. Only needed on a database where a whole-school Money Skills
         * sequence is published for the current year, which CI's is not.
         */
        skipMoneySkillsWelcome?: boolean;
    };
    teacher?: {
        firstname: string;
        lastname: string;
        email: string;
        userStatus: UserStatus;
        addTooltip: boolean;
    };
};

type ClassLicences = {
    IsReadingLogsEnabled: boolean;
    isFullProgramme: boolean;
    isReadyTeddyEnabled: boolean;
};

/**
 * Fields shared by every seeded feedback. The function fills in the rest (pupil, parent as the
 * author, type, period and activity linkage) so the caller only supplies what varies per entry.
 */
type FeedbackOptionBase = {
    /** Defaults to true so the entry is visible on the (shared-only by default) admin activity feed. */
    sharingAllowed?: boolean;
    logCreatedAt?: Date;
    logUpdatedAt?: Date;
};

export type ActivityFeedbackOption = FeedbackOptionBase & {
    pupilComment?: string;
    parentComment?: string;
    includeParentCommentInImpactReport?: boolean;
    includePupilCommentInImpactReport?: boolean;
};

export type ReadingFeedbackOption = FeedbackOptionBase & {
    comment?: string;
    bookName?: string;
    /** Defaults to 'SCHOOL_BOOK'. */
    readingType?: 'SCHOOL_BOOK' | 'OWN_BOOK' | 'SOMETHING_ELSE';
    /** Defaults to true. */
    isBookFinished?: boolean;
    /** Defaults to true. */
    includeInReadingTarget?: boolean;
    includeReadingCommentInImpactReport?: boolean;
    bookReadAt?: Date;
};

export type ScrapbookFeedbackOption = FeedbackOptionBase & {
    comment?: string;
    /** Defaults to the topic's `scrapbookPrompt`. */
    scrapbookPrompt?: string;
};

/**
 * When `feedback` is provided on a topic option, a single feedback of the matching type is created
 * inside the function (authored by the activated parent) and its id is returned on the result.
 */
type AddScrapbookTopicOption = {
    name: string;
    releaseDate: string;
    scrapbookPrompt: string;
    /** Domain the topic is linked to. Defaults to the Ready Teddy domain (id '3'). */
    domainId?: string;
    feedback?: ScrapbookFeedbackOption;
};
type AddActivityTopicOption = {
    name: string;
    releaseDate: string;
    /** Domain the topic is linked to, so the caller controls the subject. Defaults to English (id '2'). */
    domainId?: string;
    feedback?: ActivityFeedbackOption;
};
type AddReadingTopicOption = {
    releaseDate: string;
    readingTarget?: number;
    feedback?: ReadingFeedbackOption;
};

export type CreateSchoolAndDummyWondeDataOptions =
    | {
          active: true;
          classLicences: ClassLicences;
          addScrapbookTopic?: AddScrapbookTopicOption;
          addActivityTopic?: AddActivityTopicOption;
          addReadingTopic?: AddReadingTopicOption;
      }
    | { active?: false; classLicences?: never; addScrapbookTopic?: never; addActivityTopic?: never; addReadingTopic?: never };

/**
 * Identifiers for a topic seeded on the activated class/pupil. `pupilActivityId` is present for
 * topics that have an activity (activity + scrapbook topics) and absent for reading topics.
 * `feedbackId` is present only when a `feedback` option was supplied for the topic.
 */
export type CreatedTopicResult = {
    staticTopicId: string;
    classTopicId: string;
    pupilTopicId: string;
    pupilActivityId?: string;
    feedbackId?: string;
};

export type CreateSchoolAndDummyWondeDataResult = {
    school: { id: string };
    leader: { id: string; firstname: string; lastname: string };
    teacher?: { id: string; firstname: string; lastname: string };
    parent?: { id: string; email: string | null; firstname: string | null; lastname: string | null };
    pupil?: { id: string; firstname: string | null; lastname: string | null };
    class?: { id: string; name: string | null };
    activityTopic?: CreatedTopicResult;
    readingTopic?: CreatedTopicResult;
    scrapbookTopic?: CreatedTopicResult;
};
