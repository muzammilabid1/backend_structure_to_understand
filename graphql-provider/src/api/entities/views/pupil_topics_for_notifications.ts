import { ViewEntity } from 'typeorm';

import { LwpViewCanNotifySchool } from './can_notify_school';
import { LwpViewPupilStatus } from './pupil_status';
/**
 * LwpViewPupilTopicsForNotifications forms a common base view for
 * pupil-topic notification sending. It is NOT for use as a raw
 * view anywhere in the application, under any circumstances:
 * it is too large. It should ALWAYS be refined heavily by any
 * user, and is defined in TypeORM as an entity here only for
 * consistency.
 *
 * @export
 * @class LwpViewPupilTopicsForNotifications
 */
@ViewEntity({
    expression: `
	select
		(lu_parent.*)::lwp_user as "lwpUserParent",
		lsc."periodIndex" as "periodIndex",
		ls.id as "schoolId",
		ls."schoolName" as "schoolName",
		lpt.id as "pupilTopicId",
		(slt.*)::static_lwp_topic as "staticLwpTopic",
		(lp.*)::lwp_pupil as "lwpPupil",
		lvps."pupilStatus" as "lwpPupilStatus",
		lsc.name as "className",
		lsc.id as "classId",
		lct.id as "classTopicId",
		lu_teacher."nameForChildren" as "teacherName",
		lct."releaseDate" as "releaseDate",
		lpt."parentsNotified" as "parentsNotified",
		lpt."reminderSent" as "reminderSent",
		lpt."reminderSentFor2Days" as "reminderSentFor2Days",
		lct."dueDate" as "dueDate",
		lpt."readingTarget" as "readingTarget",
		lpp.status as "pupilParentStatus",
		lpp."lastInvitationEmailSent" as "pupilParentLastInvitation",
		(slt."isReading" = true) as "isReadingTopic",
		case lu_parent."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as "notifPreference",
		lpt."silverStars",
		lpt."earnedGoldStar",
		(
			select sp."index"
			from static_lwp_period sp
			where sp."isCurrentPeriod" = true
			limit 1
		) as "globalCurrentAcademicYear"
	from
		lwp_pupil_topic lpt
		join lwp_class_topic lct on lpt."classTopicId" = lct.id
		join static_lwp_topic slt on lpt."topicId" = slt.id
		join lwp_school_class lsc on lct."classId" = lsc.id
		join lwp_pupil_parent lpp on lpt."pupilId" = lpp."pupilId"
		join lwp_pupil lp on lpt."pupilId" = lp.id
		join lwp_view_pupil_status lvps on lvps."pupilId" = lp.id
		join lwp_school ls on lp."schoolId" = ls.id
		join lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id
		join lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id
		join lwp_view_can_notify_school lvcns on ls.id = lvcns."schoolId"
	where
		ls.inactive = false
		and lpt."releaseDate" <= current_date -- don't ever notify for things where the release date is in future, even if they are mistakenly released early
		and lvcns."canNotify" = true
    `,
    dependsOn: [LwpViewCanNotifySchool, LwpViewPupilStatus]
})
export class LwpViewPupilTopicsForNotifications {
    // NOT DEFINED FOR USE IN TYPEORM
    // DEFINED ONLY AS A DATABASE VIEW
    // THIS SHOULD **NEVER** BE MATERIALISED - IT IS TOO LARGE
}
