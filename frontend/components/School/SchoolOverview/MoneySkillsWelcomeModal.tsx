/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import moment, { Moment } from 'moment';
import { useRouter } from 'next/compat/router';
import React, { useEffect } from 'react';

import { useTooltip } from '../../../context/TooltipContext';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../../Shared/Button/LWPButton';
import DialogWrapper from '../../Shared/DialogWrapper';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';
import { markMoneySkillsWelcomeSeen } from '../WholeSchoolAutoSchedule/queries';

/**
 * Whether a leader has seen the welcome in the school's current academic year: `seen` is their
 * `lastMoneySkillsAutoScheduleWelcomeSeen`, `yearStart` the current period's `startDate`. Any sighting
 * counts when the year has no start date or has not started yet (a school moved on to next year early),
 * so the modal can never show on every visit.
 */
export const isWelcomeSeenThisYear = (seen?: string | null, yearStart?: string | null, now: Moment = moment()): boolean => {
    if (!seen) return false;
    if (!yearStart) return true;

    return moment(yearStart).isAfter(now) || moment(seen).isSameOrAfter(yearStart);
};

interface MoneySkillsWelcomeModalProps {
    schoolId: string;
    subjectId: string;
    onClose: () => void;
}

/**
 * The once-a-year welcome to whole-school Money Skills auto-scheduling, shown to a school leader on the
 * school overview (LEA-6505). Whether to show it is the overview's decision; this only shows it.
 *
 * Built to Figma frame `29797:10424` ("Launch Class"). Its wording is the V1 explainer's, including the
 * second paragraph that page leaves out: that paragraph describes whole-school scheduling, which is
 * exactly what this offers.
 *
 * **Any way of leaving it counts as having seen it**: Dismiss, Auto-schedule, clicking outside it,
 * Escape or the browser's Back button. That is "until interacted", so a page that reloads before the
 * leader has reacted shows it once more rather than losing it. The write is not waited on: if it fails,
 * the worst case is that they see it one more time.
 */
const MoneySkillsWelcomeModal = ({ schoolId, subjectId, onClose }: MoneySkillsWelcomeModalProps) => {
    const router = useRouter();
    const [markSeen] = useMutation(markMoneySkillsWelcomeSeen, { variables: { schoolId } });
    const { setIsPaused } = useTooltip();

    // A feature tooltip tour would otherwise start on top of this and dim it; it waits until this closes.
    useEffect(() => {
        setIsPaused(true);

        return () => setIsPaused(false);
    }, []);

    const close = () => {
        markSeen().catch(() => undefined);
        onClose();
    };

    const autoSchedule = () => {
        close();
        router?.push(`/school/${schoolId}/auto-schedule/${subjectId}`);
    };

    return (
        <DialogWrapper
            open
            setOpen={close}
            className="money-skills-welcome-modal"
            contentWidth="648px"
            dataTest="money-skills-welcome-modal">
            <div className="money-skills-welcome-content" data-test="money-skills-welcome-content">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/two-koala-with-a-coin.png`}
                    alt=""
                    data-test="money-skills-welcome-image"
                />
                <Heading2 text="Our fully funded Financial literacy programme: Money Skills" dataTest="money-skills-welcome-heading" />
                <Paragraph
                    dataTest="money-skills-welcome-text"
                    text="We’re delighted to continue offering our Financial literacy programme, Money Skills, free to all our partner schools. Money Skills activities are designed to give children the knowledge, skills and experiences that enable them to manage their money in the future."
                />
                <Paragraph
                    dataTest="money-skills-welcome-how-to"
                    text='Go to "Set a topic" to browse and schedule the activities yourself, or go to "auto-schedule" to let us set the whole school up with our recommended order.'
                />
                <div className="money-skills-welcome-buttons" data-test="money-skills-welcome-buttons">
                    <LWPButton variant="text" color="inherit" btnText="Dismiss" onClick={close} dataTest="money-skills-welcome-dismiss" />
                    <LWPButton btnText="Auto-schedule" onClick={autoSchedule} dataTest="money-skills-welcome-auto-schedule" />
                </div>
            </div>
        </DialogWrapper>
    );
};

export default MoneySkillsWelcomeModal;
