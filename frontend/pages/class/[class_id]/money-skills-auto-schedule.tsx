import { useQuery } from '@apollo/client';
import { SubjectProgrammeType } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import AssignSequenceForm from '../../../components/Class/AssignSequence/AssignSequenceForm';
import MoneySkillsAutoScheduleIntro from '../../../components/Class/AssignSequence/MoneySkillsAutoScheduleIntro';
import { getAssignableSequencesForClass, getClassNameForAutoSchedule } from '../../../components/Class/AssignSequence/queries';
import Breadcrumb from '../../../components/Parent/Breadcrumb';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonStatus from '../../../components/Shared/CommonStatus';
import Heading1 from '../../../components/Shared/Typography/Heading1';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';
import { PageType } from '../../../types/enums/PageType';

/** The scheduler step, held in the URL rather than in state. See the note on the page below. */
const SCHEDULE_STEP = 'schedule';

/**
 * Money Skills auto-scheduling for one class, reached only by activating that class.
 *
 * Two steps. The explainer says what Money Skills is, because for many leaders this is the first they
 * have heard of it, and offers Dismiss or Auto-schedule. The scheduler is the same form the generic
 * auto-schedule page uses, given Money Skills sequences alone.
 *
 * The step lives in the URL, and activation arrives here with `replace` rather than `push`. Both are
 * needed for the history the flow wants: Back from the scheduler returns to the explainer, and Back
 * from the explainer does not reach the activate page of a class that is already active. Component
 * state cannot do the first, because Back would leave the page entirely.
 *
 * Nothing is stored about a dismissal, so a leader activating seven classes is offered this seven
 * times. That is deliberate for now: the prompt is expected to move to the school overview in the
 * whole-school version, which is where remembering a dismissal would earn its keep.
 *
 * Activation only sends a school leader here, and only for a class whose `canAutoScheduleMoneySkills`
 * is true, so both other states below are for a leader who typed or bookmarked the URL. They are the
 * generic page's own treatments rather than new ones: nothing available, and the request failed, told
 * apart because the second would otherwise claim there is nothing for a class that may well have
 * something.
 *
 * `PageType.SCHOOL_LEADER` is the whole of the teacher lock-out. A teacher can activate a class, so
 * the activation redirect checks `isSchoolLeader` for itself and sends them to the school overview;
 * this is the backstop for the URL, which PageInfoContext answers with Unauthorized.
 *
 * Every way out goes to the class's pupils page.
 */
const MoneySkillsAutoSchedulePage = () => {
    const router = useRouter();
    const queryParams = useParams();
    const searchParams = useSearchParams();
    const { callSnackbar } = useContext(ThemeContext);

    const classId = queryParams?.class_id as string;

    const isSchedulerStep = searchParams.get('step') === SCHEDULE_STEP;

    const pupilsRoute = `/class/${classId}/pupils`;

    /**
     * Asked on both steps, so the explainer is never shown to a class the scheduler could only refuse.
     * Money Skills alone, filtered by the API: the empty state here has to be decided from this one
     * programme, and fetching the class's other sequences only to discard them would answer a question
     * this page does not ask.
     */
    const {
        data: sequenceData,
        loading: sequencesLoading,
        error: sequencesError
    } = useQuery(getAssignableSequencesForClass, {
        variables: { classId, programmeType: SubjectProgrammeType.MONEY_SKILLS },
        skip: !classId,
        fetchPolicy: 'cache-and-network'
    });

    /**
     * The breadcrumb label, which only the scheduler step has furniture to put it in. Skipped on the
     * explainer, which is a bare centred message: a leader who dismisses it never costs this query.
     */
    const {
        data: classData,
        loading: classLoading,
        error: classError
    } = useQuery(getClassNameForAutoSchedule, {
        variables: { id: classId },
        skip: !classId || !isSchedulerStep,
        fetchPolicy: 'cache-and-network'
    });

    /*
     * Both surfaced the way every other page in the app surfaces a failed query. A failed sequences
     * load is also given a state of its own below, because it costs the leader the page rather than
     * just the breadcrumb label.
     */
    useEffect(() => {
        handleErrorSnackbar(callSnackbar, classError);
        handleErrorSnackbar(callSnackbar, sequencesError);
    }, [classError, sequencesError]);

    const className = classData?.schoolClass?.schoolClassName;
    const sequences: IStaticLwpTopicSequence[] = sequenceData?.getAssignableSequencesForClass ?? [];

    const goToPupils = () => router?.push(pupilsRoute);

    /** `push`, not `replace`, so Back from the scheduler comes back here rather than leaving. */
    const goToScheduler = () => router?.push(`/class/${classId}/money-skills-auto-schedule?step=${SCHEDULE_STEP}`);

    /*
     * `!classId` belongs here rather than reading as a missing case. This route is statically
     * optimised, so on a direct load the router has no params for the first render, which would
     * otherwise show the empty state for a tick before anything had been asked of the API.
     */
    if (!classId || sequencesLoading || (isSchedulerStep && classLoading)) return <CommonLoading />;

    /*
     * The explainer is not held to the form's measure, being a centred message rather than a page of
     * fields, so it is centred in the whole content area as drawn.
     */
    const pageClass = isSchedulerStep ? '' : ' money-skills-auto-schedule-page-explainer';

    return (
        <div className={`auto-schedule-page money-skills-auto-schedule-page${pageClass}`} data-test="class-money-skills-auto-schedule-page">
            {sequencesError ? (
                /*
                 * Told apart from the empty state on purpose. Falling through to that one would tell a
                 * leader there is nothing available for their class when the request simply failed, and
                 * would send them to a schedule page to add topics by hand on the same false premise.
                 */
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="money-skills-auto-schedule-error-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="We could not load the topic sequences for this class"
                    subHeading="Something went wrong at our end. Please refresh the page to try again."
                    buttonText="Go to pupils"
                    buttonDataTest="money-skills-auto-schedule-error-state-button"
                    onClick={goToPupils}
                />
            ) : !sequences.length ? (
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="money-skills-auto-schedule-empty-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="There are no topic sequences available for this class"
                    subHeading="You can still add topics to this class one at a time from its schedule."
                    buttonText="Go to pupils"
                    buttonDataTest="money-skills-auto-schedule-empty-state-button"
                    onClick={goToPupils}
                />
            ) : isSchedulerStep ? (
                <>
                    <Breadcrumb allowOnAdmin breadcrumbLists={[{ label: className, route: pupilsRoute }, { label: 'Auto-schedule' }]} />

                    <Heading1
                        text="Auto-schedule Money Skills"
                        dataTest="money-skills-auto-schedule-heading"
                        customClass="auto-schedule-heading"
                    />

                    <Paragraph
                        dataTest="assign-sequence-intro"
                        customClass="assign-sequence-intro"
                        text="Auto-scheduling adds a ready-made set of topics to this class in one action. Check the dates below, change any of them for this class, then auto-schedule."
                    />

                    <AssignSequenceForm
                        classId={classId}
                        sequences={sequences}
                        /*
                         * The leader is here because they activated a class, not because they came
                         * looking, so leaving is a likely and reasonable choice and the way out says so.
                         * Both props already existed on the form: only their caller has moved here from
                         * the generic page, which no longer knows anything about activation.
                         */
                        cancelText="Skip for now"
                        cancelNote={
                            <Paragraph
                                customClass="assign-sequence-skip-note"
                                dataTest="money-skills-auto-schedule-skip-note"
                                text="Not ready yet? You can auto-schedule Money Skills for this class at any time from the class schedule page."
                            />
                        }
                        onCancel={goToPupils}
                        onAssigned={goToPupils}
                    />
                </>
            ) : (
                <MoneySkillsAutoScheduleIntro onDismiss={goToPupils} onContinue={goToScheduler} />
            )}
        </div>
    );
};

MoneySkillsAutoSchedulePage.pageType = PageType.SCHOOL_LEADER;
MoneySkillsAutoSchedulePage.pageTitle = 'Class: Money Skills auto-schedule';

export default MoneySkillsAutoSchedulePage;
