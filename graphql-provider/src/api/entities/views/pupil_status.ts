import { PupilStatus } from 'src/api/model';
import { JoinColumn, OneToOne, ViewColumn, ViewEntity } from 'typeorm';

import { LwpPupil } from '../pupil';
/**
 * LwpViewPupilStatus generates pupil statuses.
 * The criteria for doing this are documented in Notion:
 * https://www.notion.so/poteris/Account-statuses-234ef146d9624e90a34783c2a3d56dc8
 *
 * @export
 * @class LwpViewPupilStatus
 */
@ViewEntity({
    expression: `
    SELECT
        lp.id AS "pupilId",
        CASE WHEN NOT (EXISTS (
                SELECT
                    1
                FROM
                    lwp_pupil_parent lpp
                WHERE
                    lpp."pupilId" = lp.id
                    AND lpp.status::text = 'ACTIVE'::text)) THEN
            'MISSING'::text
        ELSE
            CASE WHEN coalesce(terms.daterange @> lp."logLastActivityCompleted"::date, FALSE)
                OR (EXISTS (
                        SELECT
                            1
                        FROM
                            lwp_pupil_feedback lpf
                            JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf."id"
                        WHERE
                            lpfh."lwpPupilId" = lp.id
                            AND (lpf."userType"::text = ANY (ARRAY['PARENT'::character varying, 'TOPICACCESS'::character varying, 'MAGICPARENT'::character varying]::text[]))
                            AND coalesce(terms.daterange @> coalesce(lpf."bookReadAt", lpf."logCreatedAt")::date, FALSE))) THEN
                'ACTIVE'::text
            ELSE
                'REGISTERED'::text
            END
        END AS "pupilStatus"
    FROM
        lwp_pupil lp
        LEFT JOIN (
            SELECT
                daterange(lsd."startDate"::date, CURRENT_DATE) AS daterange
            FROM
                lwp_school_dates lsd
            WHERE
                lsd."startDate" <= CURRENT_DATE
            ORDER BY
                lsd."startDate" DESC
            LIMIT 1) AS terms ON 1=1
    `
})
export class LwpViewPupilStatus {
    @ViewColumn()
    pupilId: number;

    @OneToOne(() => LwpPupil, (p) => p.statusView)
    @JoinColumn({ name: 'pupilId' })
    public pupil: LwpPupil;

    @ViewColumn()
    pupilStatus: PupilStatus;
}
