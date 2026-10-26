import { JoinColumn, ManyToOne, ViewColumn, ViewEntity } from 'typeorm';

import { LwpPupilFeedback } from '../lwp_pupil_feedback';
import { LwpPupilTopic } from '../pupil_topic';
/**
 * LwpViewReadingLogToReadingTopic allows us to connect a reading log
 * entry to the reading topic that we think is going to be most
 * relevant to it. There are no guarantees at all of any description
 * of what number of topics this may return: it may be none, or it
 * may be many. The mainline case is that only one will be returned.
 *
 * @export
 * @class LwpViewReadingLogToReadingTopic
 */
@ViewEntity({
    expression: `
        SELECT lpf.id AS "pupilFeedbackId",
        lpt.id AS "pupilTopicId"
        FROM lwp_pupil_feedback lpf
        JOIN static_lwp_topic slt ON slt."isReading" = true
        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lpfh."lwpPupilId" AND daterange(lpt."releaseDate", (lpt."releaseDate" + '7 days'::interval)::date) @> COALESCE(lpf."bookReadAt"::timestamp without time zone, lpf."logCreatedAt")::date AND lpt."topicId" = slt.id
        WHERE lpf.type::text = 'READING'::text;
    `
})
export class LwpViewReadingLogToReadingTopic {
    @ManyToOne(() => LwpPupilFeedback)
    @JoinColumn({ name: 'pupilFeedbackId' })
    pupilFeedback: LwpPupilFeedback;

    @ViewColumn()
    pupilFeedbackId: number;

    @ManyToOne(() => LwpPupilTopic)
    @JoinColumn({ name: 'pupilTopicId' })
    pupilTopic: LwpPupilTopic;

    @ViewColumn()
    pupilTopicId: number;
}
