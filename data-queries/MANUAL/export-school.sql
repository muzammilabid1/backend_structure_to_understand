/**
 * Exports school data in a format compatible with re-importing into the app.
 * Not to be included in the teacher exports due to the amount of PII included.
 * n.b. remember to bind $1 or replace it with the school ID you're targeting!
 */
SELECT
    lp.firstname,
    lp.lastname,
    is2."dateOfBirth",
    lp."UPN",
    is2.gender,
    lp."isPremium",
    lsc."yearGroup" AS "ncYear",
    lsc."name" AS "className",
    nullif (concat(lu_p1.firstname, ' ', lu_p1.lastname), ' ') AS "Parent 1 name",
    lu_p1.email,
    lu_p1."phoneNumber",
    nullif (concat(lu_p2.firstname, ' ', lu_p2.lastname), ' ') AS "Parent 2 name",
    lu_p2.email,
    lu_p2."phoneNumber"
FROM
    lwp_pupil lp
    LEFT JOIN imported_student is2 ON is2."lwpPupilId" = lp.id
    LEFT JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
    LEFT JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
        AND lsc."isRegistrationClass"
    LEFT JOIN (
        SELECT
            "pupilId",
            array_agg("parentId") AS parents
        FROM
            lwp_pupil_parent
        GROUP BY
            "pupilId") lpp ON lpp."pupilId" = lp.id
    LEFT JOIN lwp_user lu_p1 ON lu_p1.id = lpp.parents[1]
    LEFT JOIN lwp_user lu_p2 ON lu_p2.id = lpp.parents[2]
WHERE
    lp."schoolId" = $1
