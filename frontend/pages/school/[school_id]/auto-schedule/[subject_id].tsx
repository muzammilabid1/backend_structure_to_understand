import { useMutation, useQuery } from '@apollo/client';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import Breadcrumb from '../../../../components/Parent/Breadcrumb';
import { assignWholeSchoolSequence, previewWholeSchoolSequence } from '../../../../components/School/WholeSchoolAutoSchedule/queries';
import {
    describeAssignmentRecord,
    describeAssignmentResult,
    describePreviewSummary,
    hasBeenScheduled,
    hasSomethingToSchedule
} from '../../../../components/School/WholeSchoolAutoSchedule/wholeSchoolPreview';
import WholeSchoolPreviewTable from '../../../../components/School/WholeSchoolAutoSchedule/WholeSchoolPreviewTable';
import LWPButton from '../../../../components/Shared/Button/LWPButton';
import CommonLoading from '../../../../components/Shared/CommonLoading';
import CommonStatus from '../../../../components/Shared/CommonStatus';
import ConfirmationModal from '../../../../components/Shared/Modals/ConfirmationModal';
import Heading1 from '../../../../components/Shared/Typography/Heading1';
import Paragraph from '../../../../components/Shared/Typography/Paragraph';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../../shared/Services/handler';
import { IWholeSchoolSequencePreview } from '../../../../types/entities/IWholeSchoolSequencePreview';
import { PageType } from '../../../../types/enums/PageType';

/**
 * What a school leader's whole school would be given for one programme, and the one action that
 * gives it to them (LEA-6697 built the plan, LEA-6698 made the button live).
 *
 * **One press schedules every eligible class in the school, all or nothing**, which is why it is
 * confirmed first: the page offers no way to undo it afterwards. Either every class is
 * scheduled or none is: a half-scheduled school is worse than an unscheduled one, because the leader
 * cannot tell which half succeeded. That is why a failure leaves them here with the plan intact and
 * pressing again is safe.
 *
 * **Reached from the Auto schedule tab of Set a topic** (LEA-6687), whose banner or Review row for this
 * subject leads here, and whose route is this page's middle breadcrumb.
 *
 * Addressed by subject rather than by whole-school sequence id, so the server resolves the sequence
 * from this school's own academic year. See the query for why that is a security property and not a
 * convenience.
 *
 * A failed request gets a state of its own, apart from the empty one. Falling through would tell a
 * leader their school has nothing coming when the request simply failed, which is a definite claim
 * made on no information. V1 shipped that bug once and the fix became a project convention.
 */
const WholeSchoolAutoSchedulePage = () => {
    const router = useRouter();
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const schoolId = queryParams?.school_id as string;
    const subjectId = queryParams?.subject_id as string;

    const [isCancelling, setIsCancelling] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const setTopicRoute = `/school/${schoolId}/topic-library`;

    const [assignMutation, { loading: assignLoading }] = useMutation(assignWholeSchoolSequence);

    const { data, loading, error } = useQuery(previewWholeSchoolSequence, {
        variables: { schoolId, subjectId },
        skip: !schoolId || !subjectId,
        fetchPolicy: 'cache-and-network'
    });

    // Surfaced the way every other page in the app surfaces a failed query, as well as being given
    // its own state below, because here it costs the leader the whole page rather than one label.
    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const preview: IWholeSchoolSequencePreview | undefined = data?.previewWholeSchoolSequence;

    const leave = () => router?.push(setTopicRoute);

    /**
     * Schedules the whole school, then leaves.
     *
     * The count in the message comes from the result rather than from the preview on screen. The two
     * can legitimately differ: a class that already holds everything it would be given is left out of
     * the run, and the preview's activity count is still an upper bound where a class already holds
     * some of the topics. LEA-6699 closed the past-dated part of that gap and not the per-class part.
     * Telling the leader what the preview said would be telling them something the database does not
     * say.
     *
     * A failure leaves them on the page with everything still there, because the run is all or
     * nothing: there is nothing to reconcile and pressing again is safe. The confirmation closes with
     * it, so the error is read against the plan rather than through a dialog still asking to confirm.
     */
    const schedule = () => {
        assignMutation({ variables: { schoolId, wholeSchoolSequenceId: preview?.wholeSchoolSequenceId } })
            .then(({ data: assigned }) => {
                callSnackbar(describeAssignmentResult(assigned.assignWholeSchoolSequence), 'success');
                leave();
            })
            .catch((error) => {
                setIsConfirming(false);
                callSnackbar(error, 'error');
            });
    };

    if (loading && !data) return <CommonLoading />;

    return (
        <div className="auto-schedule-page" data-test="whole-school-auto-schedule-page">
            <Breadcrumb
                allowOnAdmin
                breadcrumbLists={[
                    { label: 'Set a topic', route: setTopicRoute },
                    { label: 'Auto-schedule', route: `/school/${schoolId}/auto-schedule` },
                    // Dropped rather than rendered blank when the query failed, or the trail ends on
                    // an empty crumb that reads as a name that did not load.
                    ...(preview?.subjectName ? [{ label: preview.subjectName }] : [])
                ]}
            />

            <Heading1
                text={`Auto-schedule ${preview?.subjectName ?? ''}`.trim()}
                dataTest="whole-school-auto-schedule-heading"
                customClass="auto-schedule-heading"
            />

            {error ? (
                /*
                 * Told apart from the empty state deliberately. Falling through to that one would
                 * tell a leader there is nothing for their school when the request failed, and would
                 * send them off to schedule every class by hand on a false premise.
                 */
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="whole-school-auto-schedule-error-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="We could not load the plan for your school"
                    subHeading="Something went wrong at our end. Please refresh the page to try again."
                    buttonText="Back to Set a topic"
                    buttonDataTest="whole-school-auto-schedule-error-state-button"
                    onClick={leave}
                />
            ) : hasBeenScheduled(preview) ? (
                /*
                 * This school has already scheduled, so it is shown what it was given rather than
                 * offered an action (LEA-6700).
                 *
                 * **Asked before the two states below it, not beside them.** Since LEA-6699 the
                 * activity count is exact, so a school holding every topic has nothing left to
                 * create and would otherwise fall straight through to "there is nothing to
                 * auto-schedule yet" moments after succeeding. The action branch would claim it too,
                 * as soon as a teacher deleted one of their class's topics.
                 *
                 * The same table as the offer, which is what the design draws and what the ticket
                 * asks for: the leader recognises one object in two states rather than learning a
                 * second screen. The rows are what the school actually holds, so the page cannot
                 * promise something that has since been removed.
                 */
                <>
                    <Paragraph
                        dataTest="whole-school-auto-schedule-scheduled-intro"
                        text={`Your school is scheduled for ${preview.subjectName} this year. Every class works on the same theme at the same time, but receives an activity tailored to their year group.`}
                    />

                    <Paragraph
                        customClass="assign-sequence-summary"
                        dataTest="whole-school-auto-schedule-scheduled-summary"
                        text={describeAssignmentRecord(preview.assignment, (date) => showDate({ date, short: true }))}
                    />

                    <WholeSchoolPreviewTable rows={preview.assignment.rows} />

                    {/* What a leader can still do, which is the honest answer to "and now?". No
                        action of their own: this page offers none once a school has scheduled, and
                        the per-class route is the one that is actually open to them. */}
                    <Alert
                        className="assign-sequence-callout"
                        data-test="whole-school-auto-schedule-scheduled-callout"
                        icon={<HelpOutlineIcon sx={{ color: '#F28D00' }} />}
                        sx={{ backgroundColor: '#FFF6D9' }}
                        severity="warning">
                        <b>What happens next:</b>
                        <ul>
                            <li>Each topic is released to pupils automatically on its start date.</li>
                            <li>Teachers see their activities in their own schedule, with no action needed.</li>
                            <li>A teacher can change or remove any of their class&apos;s topics until it has been released.</li>
                        </ul>
                    </Alert>
                </>
            ) : hasSomethingToSchedule(preview) ? (
                <>
                    <Paragraph
                        dataTest="whole-school-auto-schedule-intro"
                        text={`Every class works on the same theme at the same time, but receives an activity tailored to their year group. This is what your school would be given for ${preview.academicYear}.`}
                    />

                    <Paragraph
                        customClass="assign-sequence-summary"
                        dataTest="whole-school-auto-schedule-summary"
                        text={describePreviewSummary(preview)}
                    />

                    <WholeSchoolPreviewTable rows={preview.rows} />

                    <Alert
                        className="assign-sequence-callout"
                        data-test="whole-school-auto-schedule-callout"
                        icon={<HelpOutlineIcon sx={{ color: '#F28D00' }} />}
                        sx={{ backgroundColor: '#FFF6D9' }}
                        severity="warning">
                        <b>What happens next:</b>
                        <ul>
                            <li>These topics are added to every class in the year groups above, on the dates shown.</li>
                            <li>Each one is released to pupils automatically on its start date.</li>
                            <li>A teacher can change or remove any of their class&apos;s topics until it has been released.</li>
                            {preview.classesSkipped ? (
                                <li>Year groups with no topics yet are not given anything, and nothing is scheduled for their classes.</li>
                            ) : null}
                        </ul>
                    </Alert>

                    <div className="assign-sequence-actions" data-test="whole-school-auto-schedule-actions">
                        <LWPButton
                            btnText="Cancel"
                            customClass="cancel_btn"
                            color="inherit"
                            variant="text"
                            dataTest="whole-school-auto-schedule-cancel-button"
                            onClick={() => setIsCancelling(true)}
                        />
                        {/* One press schedules every class in the school, all or nothing, so it asks
                            first. Disabled while it runs rather than only spinning, because a second
                            press would be refused by the database and the leader would read a
                            constraint error about something they did to themselves. */}
                        <LWPButton
                            btnText="Auto-schedule"
                            dataTest="whole-school-auto-schedule-submit-button"
                            loading={assignLoading}
                            disabled={assignLoading}
                            onClick={() => setIsConfirming(true)}
                        />
                    </div>

                    {/*
                     * Asked once, because this is the one action on the page that cannot be taken
                     * back from it: the whole school is scheduled at once and there is no way to
                     * undo it here. The counts are repeated rather than only pointed at, so the
                     * leader confirms a number and not a button.
                     */}
                    <ConfirmationModal
                        open={isConfirming}
                        loading={assignLoading}
                        heading={`Auto-schedule ${preview.subjectName}?`}
                        btnText="Auto-schedule"
                        cancelBtnText="Back"
                        className="whole-school-auto-schedule-confirm-modal"
                        onConfirm={schedule}
                        onCancel={() => setIsConfirming(false)}>
                        {describePreviewSummary(preview)} This is done for the whole school at once and cannot be undone from here. Teachers
                        can still change or remove their own class&apos;s topics until they have been released.
                    </ConfirmationModal>

                    <ConfirmationModal
                        open={isCancelling}
                        heading="Cancel Auto-schedule?"
                        btnText="Cancel Auto-schedule"
                        cancelBtnText="Back to editing"
                        className="whole-school-auto-schedule-cancel-modal"
                        onConfirm={leave}
                        onCancel={() => setIsCancelling(false)}>
                        Your {preview.subjectName} topics won&apos;t be saved. You can come back and schedule the topics at any time.
                    </ConfirmationModal>
                </>
            ) : (
                /*
                 * Two different nothings, said the same way: nothing published for this school's
                 * academic year, and something published that would create nothing here. A leader can
                 * act on neither, and telling them apart would mean explaining the content schedule.
                 */
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="whole-school-auto-schedule-empty-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="There is nothing to auto-schedule yet"
                    subHeading={`There are no ${preview?.subjectName ?? ''} topics ready for your school this year. You can still set topics for each class yourself.`}
                    buttonText="Back to Set a topic"
                    buttonDataTest="whole-school-auto-schedule-empty-state-button"
                    onClick={leave}
                />
            )}
        </div>
    );
};

WholeSchoolAutoSchedulePage.pageType = PageType.SCHOOL_LEADER;
WholeSchoolAutoSchedulePage.pageTitle = 'School: Auto-schedule (subject)';

export default WholeSchoolAutoSchedulePage;
