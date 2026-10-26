import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonStatus from '../../Shared/CommonStatus';
import Paragraph from '../../Shared/Typography/Paragraph';

interface MoneySkillsAutoScheduleIntroProps {
    /** Leaves for the class's pupils page. The leader was offered this, not sent to do it. */
    onDismiss: () => void;
    /** On to the scheduler, which is the second step of the same page. */
    onContinue: () => void;
}

/**
 * What Money Skills is, shown before a leader who has just activated a class is asked whether to
 * schedule it. For many leaders this is the first they have heard of the programme, so the offer is
 * explained before it is made rather than opening onto a table of dates.
 *
 * Built on CommonStatus for the centred mascot and heading. It offers one button of its own and this
 * needs two, so the action row is passed as children, which CommonStatus renders last.
 *
 * The design's second paragraph is deliberately left out. It reads "go to 'auto-schedule' to let us
 * set the whole school up with our recommended order", which is whole-school language: this page
 * schedules the one class the leader has just activated, so it would promise something it does not do.
 */
const MoneySkillsAutoScheduleIntro = ({ onDismiss, onContinue }: MoneySkillsAutoScheduleIntroProps) => (
    <CommonStatus
        className="money-skills-auto-schedule-intro"
        dataTest="money-skills-auto-schedule-intro"
        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/two-koala-with-a-coin.png`}
        heading="Auto-schedule Money Skills"
        headingDataTest="money-skills-auto-schedule-intro-heading">
        <div className="money-skills-auto-schedule-intro-body">
            <Paragraph
                dataTest="money-skills-auto-schedule-intro-body"
                text="We're delighted to continue offering our Financial literacy programme, Money Skills, free to all our partner schools. Money Skills activities are designed to give children the knowledge, skills and experiences that enable them to manage their money in the future."
            />

            <div className="money-skills-auto-schedule-intro-actions" data-test="money-skills-auto-schedule-intro-actions">
                <LWPButton
                    btnText="Dismiss"
                    customClass="cancel_btn"
                    color="inherit"
                    variant="text"
                    dataTest="money-skills-auto-schedule-dismiss-button"
                    onClick={onDismiss}
                />
                <LWPButton btnText="Auto-schedule" dataTest="money-skills-auto-schedule-continue-button" onClick={onContinue} />
            </div>
        </div>
    </CommonStatus>
);

export default MoneySkillsAutoScheduleIntro;
