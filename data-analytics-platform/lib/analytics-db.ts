import type { Schema } from '@lwp/postgres-client'
import type { Kysely } from 'kysely'

// Analytics table isn't present in the generated schema, so define a minimal shape here.
export type AnalyticsPupilFactTable = {
  id: number | string
  pupilId: number | string | null
  schoolId: number | string | null
  timeKey: number
  timeGrain: 'weekly' | 'monthly' | 'yearly'
  subjectId: number | string | null
  isActive: boolean | null
  activitiesSetCount: number | null
  activitiesCompletedCount: number | null
  activitiesAccessedCount: number | null
  topicsSetCount: number | null
  topicsCompletedCount: number | null
  readingTarget: number | null
  videosWatchedCount: number | null
  parentCommentsLeftCount: number | null
  pupilCommentsLeftCount: number | null
  teacherCommentsLeftCount: number | null
  parentPhotosUploadedCount: number | null
  teacherPhotosUploadedCount: number | null
  parentAudioClipsUploadedCount: number | null
  teacherAudioClipsUploadedCount: number | null
  starRatingsCount: number | null
  sumStarRatings: number | null
  oneStarRatingsCount: number | null
  twoStarRatingsCount: number | null
  threeStarRatingsCount: number | null
  fourStarRatingsCount: number | null
  fiveStarRatingsCount: number | null
  parentFeedbackEntries: number | null
  teacherFeedbackEntries: number | null
  subject: string | null
  isPupilPremium: boolean | null
  gender: string | null
  ethnicityCode: string | null
  sen: boolean | null
  englishAsAdditionalLanguage: string | null
  activeParentsCount: number | null
  updatedAt: Date | string | null
}

export type AnalyticsDB = Schema.DB & { analytics_pupil_fact: AnalyticsPupilFactTable }
export type AnalyticsQueryBuilder = Kysely<AnalyticsDB>
