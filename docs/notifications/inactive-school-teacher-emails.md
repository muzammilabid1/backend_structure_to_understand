# Teacher emails and inactive schools

Teacher emails are suppressed when `lwp_school.inactive` is true (LEA-6570). This page records the scope of that rule and one edge case to keep in mind.

## What is suppressed

-   The scheduled SQL jobs for teachers: topics released tomorrow, topics released next week, reading topic end, reading topic holiday overlap and trophy mail to teachers. The first three still stamp their `teacherNotified` / `weekBeforeTeacherNotified` columns, so reactivating a school does not trigger a backlog of emails.
-   On-request sends to a teacher: `forgotPassword`, `reGenerateMagicLink` and `sendTrophyMailToSchoolLeader`.
    When `reGenerateMagicLink` refuses, the expired link page (`LinkExpiredPage`) tells them to contact support instead of saying a new link was sent.

The rule is keyed on `user.type === TEACHER` together with `user.school.inactive`. It is the same test `AuthenticationService#preLogin` and the sign-in check already use to refuse sign-in.

## Edge case: a teacher who is also a parent

Parents are not affected by a school being inactive. They can still sign in and use their children's activities, and parent emails are unchanged (they go through `lwp_view_pupil_topics_for_notifications`).

A person who is both a teacher and a parent is the case to watch:

-   `lwp_user.type` holds a single value. An account is either `PARENT` or `TEACHER`, not both.
-   Inviting an existing `TEACHER` as a parent is refused (`PupilService`, "This email address cannot be used for a parent account"). In the normal flow, someone who is both needs a separate account with a different email address for each role.
-   Their `PARENT` account is not matched by any of the new checks, which all require `type === TEACHER`. It keeps signing in and receiving parent emails.
-   Their `TEACHER` account at the inactive school was already refused at sign-in. It no longer receives teacher emails either. That account is the only one affected.

Where this could still bite:

-   A `TEACHER` row that has pupils linked to it by some route other than the parent invite (for example a manual data fix or an import). That person is already locked out at sign-in. The new `forgotPassword` and `reGenerateMagicLink` guards also remove their self-service route back in, so they cannot reach their children's activities. If such rows exist, the fix is to give the person a `PARENT` account, not to loosen the inactive check. Production data has not been checked for these rows.
-   Suppressing mail for the teacher account says nothing about parent mail. Parent emails are driven by the pupil view and are not filtered by any school the parent might also teach at.
