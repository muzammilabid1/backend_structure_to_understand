import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import AssignSequenceForm from '../../../components/Class/AssignSequence/AssignSequenceForm';
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

/**
 * Auto-scheduling a ready-made set of topics onto one class.
 *
 * Reached from two places, and by a leader who chose to come both times: the class schedule page and
 * the school overview's class row. Each withholds its link when it can already tell the class has
 * nothing to schedule, but neither can tell in every case, so an empty list is an ordinary outcome
 * here rather than a fault.
 *
 * Activation no longer leads here. It leads to the Money Skills page instead, which explains the
 * programme before offering it, so everything this page used to do differently for a leader who
 * arrived that way has gone with it: there is no `from=activation`, and the way out is always
 * "Cancel", because nobody reaches this page without asking for it.
 *
 * A failed request is not an ordinary outcome, and is kept apart from an empty one below. Otherwise
 * the page would state that no sequences are available to a leader whose class may well have some,
 * which is a definite claim made on no information.
 *
 * Every way out of this page goes to the class's pupils page.
 */
const AutoSchedulePage = () => {
    const router = useRouter();
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const classId = queryParams?.class_id as string;

    const pupilsRoute = `/class/${classId}/pupils`;

    const {
        data: classData,
        loading: classLoading,
        error: classError
    } = useQuery(getClassNameForAutoSchedule, {
        variables: { id: classId },
        skip: !classId,
        fetchPolicy: 'cache-and-network'
    });

    const {
        data: sequenceData,
        loading: sequencesLoading,
        error: sequencesError
    } = useQuery(getAssignableSequencesForClass, {
        variables: { classId },
        skip: !classId,
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

    // Both queries, because the empty state and the form are decided by the second one and the
    // breadcrumb by the first, and flashing one heading before the other would read as a fault.
    if (classLoading || sequencesLoading) return <CommonLoading />;

    return (
        <div className="auto-schedule-page" data-test="class-auto-schedule-page">
            <Breadcrumb allowOnAdmin breadcrumbLists={[{ label: className, route: pupilsRoute }, { label: 'Auto-schedule' }]} />

            <Heading1 text="Auto-schedule topics" dataTest="auto-schedule-heading" customClass="auto-schedule-heading" />

            {sequencesError ? (
                /*
                 * Told apart from the empty state on purpose. Falling through to that one would tell a
                 * leader there is nothing available for their class when the request simply failed, and
                 * would send them to a schedule page to add topics by hand on the same false premise.
                 */
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="auto-schedule-error-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="We could not load the topic sequences for this class"
                    subHeading="Something went wrong at our end. Please refresh the page to try again."
                    buttonText="Go to pupils"
                    buttonDataTest="auto-schedule-error-state-button"
                    onClick={goToPupils}
                />
            ) : sequences.length ? (
                <>
                    <Paragraph
                        dataTest="assign-sequence-intro"
                        customClass="assign-sequence-intro"
                        text="Auto-scheduling adds a ready-made set of topics to this class in one action. Check the dates below, change any of them for this class, then auto-schedule."
                    />

                    <AssignSequenceForm
                        classId={classId}
                        sequences={sequences}
                        /*
                         * Always a plain cancel. Both ways in are a leader choosing to come, one of
                         * them from the very schedule page a note about coming back later would point
                         * at, so there is nothing to tell them that they have not already decided.
                         * The Money Skills page reached from activation is where that note lives now.
                         */
                        cancelText="Cancel"
                        onCancel={goToPupils}
                        onAssigned={goToPupils}
                    />
                </>
            ) : (
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="auto-schedule-empty-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="There are no topic sequences available for this class"
                    subHeading="You can still add topics to this class one at a time from its schedule."
                    buttonText="Go to pupils"
                    buttonDataTest="auto-schedule-empty-state-button"
                    onClick={goToPupils}
                />
            )}
        </div>
    );
};

AutoSchedulePage.pageType = PageType.TEACHER;
AutoSchedulePage.pageTitle = 'Class: Auto-schedule';

export default AutoSchedulePage;
