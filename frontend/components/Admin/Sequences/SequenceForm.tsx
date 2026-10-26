import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { SequenceTimingMode } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useMemo } from 'react';

import { getAllSubjectsForAdmin, getAllYearGroups } from '../../../graphQl/queries';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../shared/Services/handler';
import { topicSequenceValidation } from '../../../shared/validations';
import { ISequenceTopic, IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';
import { IStaticLwpYearGroup } from '../../../types/entities/IStaticLwpYearGroup';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonError from '../../Shared/CommonError';
import CommonLoading from '../../Shared/CommonLoading';
import CommonRadioButton from '../../Shared/CommonRadioButton';
import CommonSelectField from '../../Shared/CommonSelectField';
import InputField from '../../Shared/InputField/InputField';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import SequenceItemsTable from './SequenceItemsTable';
import { findSequenceDateFindings, groupFindingsByTopic, SequenceDraftItem, sortItemsByStartDate, toDateOnly } from './sequenceOrdering';
import SequenceTopicPicker from './SequenceTopicPicker';

const getSequence = gql`
    query getSequence($id: String!) {
        getSequence(id: $id) {
            id
            name
            timingMode
            intervalDays
            period {
                index
                shortName
            }
            hasAssignments
            subject {
                id
                name
            }
            yearGroup {
                id
                year
                shortName
            }
            items {
                id
                order
                startDate
                endDate
                topic {
                    id
                    teacherTopicName
                }
            }
        }
    }
`;

/**
 * Page-local and three fields wide, rather than the shared `getAllStaticPeriods`, which also selects
 * longName, characters, colours and both dates. Fetching only what a page renders is a project
 * convention, and this form needs the index to send, the short name to show, and the current flag to
 * work out which years to offer.
 */
const getPeriodsForSequenceForm = gql`
    query allStaticPeriods {
        allStaticPeriods {
            index
            shortName
            isCurrentPeriod
        }
    }
`;

const createSequence = gql`
    mutation createSequence($input: CreateTopicSequenceInput!) {
        createSequence(input: $input) {
            id
        }
    }
`;

/**
 * The form saves the whole sequence in one call, always sending the full item list.
 * Sending items is what makes the arranged order authoritative: the server sorts
 * FIXED items chronologically and INTERVAL items by order, reproducing exactly what
 * the admin arranged.
 *
 * It deliberately does not use addSequenceItem / removeSequenceItem /
 * reorderSequenceItems. Those take item ids, and item ids change on every save, so a
 * single whole-form save keeps the edit atomic and cannot act on a stale id.
 * reorderSequenceItems is also INTERVAL-only, which this avoids.
 */
const updateSequence = gql`
    mutation updateSequence($input: UpdateTopicSequenceInput!) {
        updateSequence(input: $input) {
            id
        }
    }
`;

interface SequenceFormValues {
    name: string;
    subjectId: string;
    yearGroupId: string;
    /**
     * The academic year the sequence is for. Held as a string because it is bound to a select, and
     * sent as a number. Every topic date has to fall inside this year, which the API enforces.
     */
    periodIndex: string;
    timingMode: SequenceTimingMode;
    /**
     * How far apart an interval sequence's topics run, in days. Interval mode only, and saved.
     *
     * Held as a string because it is bound to a text input, and sent as a number. This is a
     * Learning with Parents decision rather than a school's, so it lives on the sequence and the
     * teacher is never asked for it (LEA-6624).
     */
    intervalDays: string;
    items: SequenceDraftItem[];
}

const timingOptions = [
    {
        value: SequenceTimingMode.FIXED,
        heading: 'Fixed dates',
        text: 'Set an explicit start and end date for each topic. Gaps and different lengths are allowed.',
        dataTest: 'timing-mode-fixed'
    },
    {
        value: SequenceTimingMode.INTERVAL,
        heading: 'Interval',
        // Says which half is ours and which is theirs, because that is the whole distinction between
        // the two modes and this is the text an admin reads while choosing between them.
        text: 'Put the topics in order and set one interval for the whole sequence. The school chooses only when to start.',
        dataTest: 'timing-mode-interval'
    }
];

const blankValues: SequenceFormValues = {
    name: '',
    subjectId: '',
    yearGroupId: '',
    periodIndex: '',
    timingMode: SequenceTimingMode.FIXED,
    intervalDays: '',
    items: []
};

const formatShortDate = (date: string) => showDate({ date, short: true });

/**
 * Shared by the create and edit screens. Which one it is comes from the route:
 * /admin/sequences/new has no sequence_id, /admin/sequences/[sequence_id] does.
 */
const SequenceForm = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const sequenceId = router?.query?.sequence_id as string | undefined;
    const isEdit = Boolean(sequenceId);

    const {
        data: sequenceData,
        loading: sequenceLoading,
        error: sequenceError
    } = useQuery(getSequence, {
        variables: { id: sequenceId },
        skip: !sequenceId,
        fetchPolicy: 'network-only'
    });

    const { data: subjectsData } = useQuery(getAllSubjectsForAdmin);
    const { data: yearGroupsData } = useQuery(getAllYearGroups);
    const { data: periodsData } = useQuery(getPeriodsForSequenceForm);

    const [createSequenceMutation, { loading: createLoading }] = useMutation(createSequence);
    const [updateSequenceMutation, { loading: updateLoading }] = useMutation(updateSequence);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, sequenceError);
    }, [sequenceError]);

    /**
     * The academic years an admin may build a sequence for: the current one and later ones. A past
     * year is never offered, because a sequence dated into a finished year can never be offered to
     * anyone.
     *
     * The one exception is the year a sequence being edited already has, which is always included so
     * the select shows the truth about what is stored rather than an empty value. It is only
     * selectable in the sense that it is already selected: when the year is a past one the field is
     * disabled, see {@link periodLocked}.
     */
    const periodOptions = useMemo(() => {
        const periods: { index: number; shortName: string; isCurrentPeriod: boolean }[] = periodsData?.allStaticPeriods || [];
        const currentIndex = periods.find((period) => period.isCurrentPeriod)?.index;
        const editingIndex = sequenceData?.getSequence?.period?.index;

        return periods
            .filter(
                (period) =>
                    (currentIndex !== undefined && period.index >= currentIndex) ||
                    (editingIndex !== undefined && period.index === editingIndex)
            )
            .sort((a, b) => a.index - b.index)
            .map((period) => ({ key: String(period.index), value: period.shortName }));
    }, [periodsData, sequenceData]);

    /**
     * Two reasons the academic year cannot be changed, both shown as a disabled select carrying the
     * year it already has rather than a hidden field, so an admin can always see which year a
     * sequence belongs to.
     *
     * 1. It has been assigned to a class. The year then describes class topics that already exist,
     *    so changing it would make the record disagree with the data. `hasAssignments` counts every
     *    assignment including removed ones, because a removal keeps the released class topics.
     * 2. Its year has already finished. There is nothing useful to move it to: the sequence can
     *    never be offered again, and the nightly cleanup removes it in due course.
     */
    const periodLock = useMemo((): { locked: boolean; reason?: string } => {
        const sequence: IStaticLwpTopicSequence | undefined = sequenceData?.getSequence;

        if (!sequence) return { locked: false };

        if (sequence.hasAssignments) {
            return { locked: true, reason: 'This sequence has been scheduled for a class, so its academic year cannot be changed.' };
        }

        const periods: { index: number; isCurrentPeriod: boolean }[] = periodsData?.allStaticPeriods || [];
        const currentIndex = periods.find((period) => period.isCurrentPeriod)?.index;

        if (currentIndex !== undefined && sequence.period && sequence.period.index < currentIndex) {
            return { locked: true, reason: 'This academic year has finished, so this sequence can no longer be scheduled.' };
        }

        return { locked: false };
    }, [sequenceData, periodsData]);

    /**
     * Seeded from the loaded sequence, whose items arrive already ordered by the
     * server. Memoised so enableReinitialize only resets the form when the loaded
     * sequence actually changes.
     */
    const initialValues: SequenceFormValues = useMemo(() => {
        const sequence: IStaticLwpTopicSequence | undefined = sequenceData?.getSequence;

        if (!sequence) return blankValues;

        return {
            name: sequence.name,
            subjectId: sequence.subject?.id || '',
            yearGroupId: sequence.yearGroup?.id || '',
            periodIndex: sequence.period ? String(sequence.period.index) : '',
            timingMode: sequence.timingMode,
            intervalDays: sequence.intervalDays ? String(sequence.intervalDays) : '',
            items: (sequence.items || []).map((item) => ({
                topicId: item.topic.id,
                topicName: item.topic.teacherTopicName,
                startDate: toDateOnly(item.startDate),
                endDate: toDateOnly(item.endDate)
            }))
        };
    }, [sequenceData]);

    const submit = (values: SequenceFormValues) => {
        const isFixed = values.timingMode === SequenceTimingMode.FIXED;
        const input = {
            name: values.name.trim(),
            subjectId: values.subjectId,
            yearGroupId: values.yearGroupId,
            // Sent for a fixed sequence only. An interval one belongs to no academic year, and the
            // API refuses a year on one rather than ignoring it. Note `Number('')` is 0, which is a
            // perfectly valid period index, so this cannot be left to coercion: an empty field would
            // be sent as a real year rather than as nothing.
            periodIndex: isFixed ? Number(values.periodIndex) : null,
            timingMode: values.timingMode,
            // Sent for an interval sequence only, and the API refuses one on a fixed sequence rather
            // than ignoring it, exactly as it refuses a year on an interval one. `Number('')` is 0,
            // which the API also refuses, so an empty field cannot be left to coercion either.
            intervalDays: isFixed ? null : Number(values.intervalDays),
            // No anchor is sent. A fixed sequence keeps its dates on its items and an interval one
            // takes its start date from the class, so the suggested start date above is a form
            // convenience that never leaves the browser.
            //
            // Fixed sequences are settled by their dates and interval sequences by their
            // order, so each mode sends only what the server reads.
            items: values.items.map((item, index) =>
                isFixed
                    ? // An open-ended window is sent as null, not as the empty string the form holds,
                      // which the DateOnly scalar would reject.
                      { topicId: item.topicId, startDate: item.startDate, endDate: item.endDate || null }
                    : { topicId: item.topicId, order: index + 1 }
            )
        };

        const request = isEdit
            ? updateSequenceMutation({ variables: { input: { id: sequenceId, ...input } }, refetchQueries: ['getSequences'] })
            : createSequenceMutation({ variables: { input }, refetchQueries: ['getSequences'] });

        return request
            .then(() => {
                callSnackbar(isEdit ? 'Sequence updated successfully!' : 'Sequence created successfully!', 'success');
                router?.push('/admin/sequences');
            })
            .catch((error) => callSnackbar(error, 'error'));
    };

    // Wait for the router, or a dynamic route renders as "Create sequence" for a frame
    // before its sequence_id arrives.
    if (!router?.isReady || sequenceLoading) return <CommonLoading />;

    return (
        <div className="sequence-form" data-test={isEdit ? 'edit-sequence-page' : 'create-sequence-page'}>
            <Heading1 text={isEdit ? 'Edit sequence' : 'Create sequence'} />

            {/* The warning about assigned classes only makes sense once there are
                assignments to affect, so creating gets a plain description instead. */}
            <Paragraph
                dataTest="sequence-assignments-note"
                text={
                    isEdit
                        ? "Editing a sequence does not change classes that have already been assigned it. A sequence is a template, and a class's topics are created at the moment it is assigned, so changes here apply to future assignments only."
                        : 'A sequence is a template. Its topics are only added to a class when a school leader assigns it to one.'
                }
            />

            <Formik initialValues={initialValues} enableReinitialize validationSchema={topicSequenceValidation} onSubmit={submit}>
                {({ values, errors, touched, submitCount, handleChange, handleBlur, handleSubmit, setFieldValue, setFormikState }) => {
                    const isFixed = values.timingMode === SequenceTimingMode.FIXED;

                    /**
                     * What the table shows, which for both modes is simply the items as they are.
                     *
                     * Interval sequences used to have a live preview here, generating each window
                     * from the anchor plus the interval so the form showed what the server would
                     * store. They carry no dates at all now, so there is nothing to preview: the
                     * table shows the topics and their order, and the dates are the teacher's to
                     * choose when they schedule it.
                     */
                    const displayItems = values.items;

                    const { errors: dateErrors, warnings: overlapWarnings } = findSequenceDateFindings(
                        displayItems,
                        isFixed,
                        formatShortDate
                    );

                    /**
                     * Subject and year group scope which topics are valid, and the server
                     * rejects items outside them. So changing either clears the chosen
                     * topics rather than leaving a list that cannot be saved.
                     */
                    const changeScope = (field: 'subjectId' | 'yearGroupId', value: string) => {
                        setFieldValue(field, value);

                        if (values.items.length) {
                            setFieldValue('items', []);
                            callSnackbar(
                                'Topics cleared, because a sequence can only contain topics for its subject and year group.',
                                'info'
                            );
                        }
                    };

                    /**
                     * Switching mode clears whatever belongs only to the mode being left.
                     *
                     * Switching to fixed used to seed any undated topic from the interval preview, so
                     * the admin carried on from the windows they had been looking at. There is no
                     * preview to carry over now, so a sequence becoming fixed arrives with its topics
                     * and no dates, and the admin types them. Topics that already carry typed dates
                     * are untouched either way.
                     */
                    const changeTimingMode = (mode: SequenceTimingMode) => {
                        setFieldValue('timingMode', mode);

                        /*
                         * Switching to interval clears the academic year, and this is not tidiness.
                         * An interval sequence belongs to no year, and the API refuses one that
                         * carries a year rather than ignoring it, so a stale value left in form state
                         * here would fail the save with a message about a field the admin can no
                         * longer see.
                         */
                        if (mode === SequenceTimingMode.INTERVAL) {
                            setFieldValue('periodIndex', '');

                            return;
                        }

                        // And the other direction. The API refuses an interval on a fixed sequence,
                        // so a value left behind here would fail the save with a message about a
                        // field the admin can no longer see.
                        setFieldValue('intervalDays', '');
                    };

                    /**
                     * Every topic arrives undated, in both modes.
                     *
                     * A fixed sequence's dates are set per topic, and an interval one has none at all
                     * (LEA-6594): the teacher chooses the pace and the anchor when they schedule it.
                     */
                    const addTopic = (topic: ISequenceTopic) => {
                        if (values.items.some((item) => item.topicId === topic.id)) return;

                        setFieldValue('items', [
                            ...values.items,
                            { topicId: topic.id, topicName: topic.teacherTopicName, startDate: '', endDate: '' }
                        ]);
                    };

                    /**
                     * Reordering and removing go through setFieldValue rather than FieldArray's
                     * move and remove helpers, deliberately.
                     *
                     * Those helpers write `errors` directly via setFormikState and never
                     * revalidate, and for a top-level array error they pass the existing message
                     * straight through (see createAlterationHandler in formik). Our items errors
                     * are exactly that: single messages on `items`, not one per row. So removing
                     * an undated topic left the "needs a start date" error on screen
                     * even though the offending topic was gone. setFieldValue revalidates, so the
                     * error always reflects the current topics.
                     */
                    const reorder = (fromIndex: number, toIndex: number) => {
                        const next = [...values.items];
                        const [moved] = next.splice(fromIndex, 1);

                        next.splice(toIndex, 0, moved);

                        setFieldValue('items', next);
                    };

                    const removeItem = (index: number) =>
                        setFieldValue(
                            'items',
                            values.items.filter((_, itemIndex) => itemIndex !== index)
                        );

                    /**
                     * Re-sort on commit, never on keystroke, or rows jump around while the
                     * admin is still typing a date. Returning early when nothing moved avoids
                     * re-rendering a row the admin is still in, since blur fires on every
                     * date field whether or not it changed anything.
                     */
                    const commitDates = () => {
                        if (!isFixed) return;

                        // Sorted from Formik's own latest state rather than from this render's
                        // `values`, so a blur that lands in the same tick as a change cannot write
                        // back the array as it was before that change. Sorting only reorders and
                        // never edits a date, so it does not need to revalidate.
                        setFormikState((previous) => {
                            const current = previous.values.items;
                            const sorted = sortItemsByStartDate(current);

                            if (sorted.every((item, index) => item.topicId === current[index].topicId)) return previous;

                            return { ...previous, values: { ...previous.values, items: sorted } };
                        });
                    };

                    // Only the array-level messages belong below the table. Per-topic ones
                    // render inside it, on the row they describe.
                    //
                    // Gated on a submit attempt rather than on touched, because the topic list
                    // is never "touched" by typing, and Formik validates on every change: without
                    // this, "Add at least one topic" would appear the moment the admin starts
                    // typing the name.
                    const itemsError = submitCount > 0 && typeof errors.items === 'string' ? errors.items : undefined;

                    return (
                        <>
                            <CommonCard>
                                <Heading3 text="Details" />

                                <Grid container spacing={3}>
                                    <InputField
                                        md={12}
                                        lg={12}
                                        name="name"
                                        label="Name"
                                        dataTest="sequence-name-input"
                                        value={values.name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.name}
                                        touched={touched.name}
                                    />

                                    <CommonSelectField
                                        md={6}
                                        lg={6}
                                        name="subjectId"
                                        label="Subject"
                                        shrink
                                        dataTest="sequence-subject-select"
                                        value={values.subjectId}
                                        options={(subjectsData?.getSubjectsForAdmin || []).map((subject: { id: string; name: string }) => ({
                                            key: subject.id,
                                            value: subject.name
                                        }))}
                                        onChange={(event: React.ChangeEvent<{ value: string }>) =>
                                            changeScope('subjectId', event.target.value)
                                        }
                                        onBlur={handleBlur}
                                        error={errors.subjectId}
                                        touched={touched.subjectId}
                                    />

                                    <CommonSelectField
                                        md={6}
                                        lg={6}
                                        name="yearGroupId"
                                        label="Year group"
                                        shrink
                                        dataTest="sequence-year-group-select"
                                        value={values.yearGroupId}
                                        options={(yearGroupsData?.allYearGroup || []).map((yearGroup: IStaticLwpYearGroup) => ({
                                            key: yearGroup.id,
                                            value: yearGroup.year
                                        }))}
                                        onChange={(event: React.ChangeEvent<{ value: string }>) =>
                                            changeScope('yearGroupId', event.target.value)
                                        }
                                        onBlur={handleBlur}
                                        error={errors.yearGroupId}
                                        touched={touched.yearGroupId}
                                    />

                                    {/*
                                        Fixed sequences only. An interval sequence carries no dates,
                                        so it belongs to no academic year and is offered in every one
                                        of them forever. The field is absent rather than disabled or
                                        empty: either of those would say the sequence has a year that
                                        cannot be edited, when the truth is that it has none.

                                        Not routed through changeScope: that clears the chosen topics,
                                        because changing the subject or year group changes which topics
                                        are even available. The academic year does not affect which
                                        topics exist, only when they run, so the admin keeps their
                                        selection and only the dates need checking.
                                    */}
                                    {isFixed && (
                                        <CommonSelectField
                                            md={6}
                                            lg={6}
                                            name="periodIndex"
                                            label="Academic year"
                                            shrink
                                            dataTest="sequence-period-select"
                                            value={values.periodIndex}
                                            options={periodOptions}
                                            disabled={periodLock.locked}
                                            helperText={periodLock.reason}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.periodIndex}
                                            touched={touched.periodIndex}
                                        />
                                    )}

                                    {/* The section label is a heading rather than CommonRadioButton's
                                        `label`, which renders an unshrunk InputLabel that floats over the
                                        options like a stray placeholder. No usage in the codebase passes it. */}
                                    <Grid item xs={12}>
                                        <Heading3 text="Timing" />
                                        <CommonRadioButton
                                            name="timingMode"
                                            value={values.timingMode}
                                            options={timingOptions}
                                            onChange={(event) => changeTimingMode(event.target.value as SequenceTimingMode)}
                                        />
                                    </Grid>

                                    {/*
                                        Interval sequences only, and the only timing an admin sets
                                        for one.

                                        The pace is ours, not the school's: Ready Teddy is designed
                                        to run weekly and schools have been told so, so a teacher is
                                        never offered a cadence of their own (LEA-6624). They choose
                                        the start date and nothing else.

                                        Half width, matching the academic year select above it: it
                                        holds a one or two digit number, and a full-width box invites
                                        an admin to expect more than that.
                                    */}
                                    {!isFixed && (
                                        <InputField
                                            md={6}
                                            lg={6}
                                            type="number"
                                            name="intervalDays"
                                            label="Interval in days"
                                            dataTest="sequence-interval-days-input"
                                            value={values.intervalDays}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.intervalDays}
                                            touched={touched.intervalDays}
                                        />
                                    )}

                                    {/*
                                        The interval wording carries the load: an admin who has just
                                        picked Interval sees a cadence field and no dates, and needs
                                        telling that the missing dates are deliberate rather than
                                        something still loading or something they have missed.

                                        It now says the school cannot change the cadence, which
                                        LEA-6624 made true by removing the field that let them. The
                                        wording deliberately lagged the code by one ticket rather
                                        than leading it: on the previous branch the assign page still
                                        offered an override, so this claim would have been a lie the
                                        Playwright suite itself contradicted.

                                        Worth saying out loud on this screen, because an admin
                                        setting a Ready Teddy cadence needs to know it is the pace
                                        every class will actually run at.

                                        The fixed wording says where the dates actually live. It used
                                        to describe a sequence-level suggested start date, which was
                                        never saved and only ever seeded the first topic added, and
                                        which has now gone.
                                    */}
                                    <Grid item xs={12}>
                                        <Paragraph
                                            customClass="sequence-timing-hint"
                                            dataTest="sequence-timing-hint"
                                            text={
                                                isFixed
                                                    ? 'You set the dates on each topic below. Every one of them has to fall inside the academic year you chose.'
                                                    : 'You set how far apart the topics run, and the school cannot change it. They choose only when to start, so the same sequence can be used by any class at any time of year.'
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            </CommonCard>

                            <Heading3 text="Topics" />

                            {/* Keyed on the scope so the picker remounts when the subject or year
                                group changes. That clears the search box, which is right because the
                                old term means nothing in a new scope, and it guarantees the picker's
                                previous-results fallback can only ever hold topics for this scope. */}
                            <SequenceTopicPicker
                                key={`${values.subjectId}-${values.yearGroupId}`}
                                subjectId={values.subjectId}
                                yearGroupId={values.yearGroupId}
                                selectedTopicIds={values.items.map((item) => item.topicId)}
                                onAdd={addTopic}
                            />

                            <SequenceItemsTable
                                items={displayItems}
                                isFixed={isFixed}
                                errorsByTopic={groupFindingsByTopic(dateErrors)}
                                warningsByTopic={groupFindingsByTopic(overlapWarnings)}
                                onChangeDate={(index, field, value) => setFieldValue(`items.${index}.${field}`, value)}
                                onCommitDates={commitDates}
                                onReorder={reorder}
                                onRemove={removeItem}
                            />

                            {dateErrors.length ? (
                                <div data-test="sequence-date-errors-summary">
                                    <CommonError error="Fix the dates highlighted above before saving." touched />
                                </div>
                            ) : null}

                            {itemsError ? (
                                <div data-test="sequence-items-error">
                                    <CommonError error={itemsError} touched />
                                </div>
                            ) : null}

                            <Grid container spacing={2} className="sequence-form-actions">
                                <Grid item>
                                    <LWPButton
                                        btnText={isEdit ? 'Save sequence' : 'Create sequence'}
                                        dataTest="save-sequence-button"
                                        onClick={handleSubmit}
                                        // Date problems are already on screen, so block submit as soon as
                                        // they appear rather than waiting for an attempt. Everything else is
                                        // left to the schema, which surfaces on the first submit.
                                        disabled={dateErrors.length > 0}
                                        loading={createLoading || updateLoading}
                                    />
                                </Grid>
                                <Grid item>
                                    <LWPButton
                                        btnText="Cancel"
                                        dataTest="cancel-sequence-button"
                                        variant="text"
                                        color="inherit"
                                        onClick={() => router?.push('/admin/sequences')}
                                    />
                                </Grid>
                            </Grid>
                        </>
                    );
                }}
            </Formik>
        </div>
    );
};

export default SequenceForm;
