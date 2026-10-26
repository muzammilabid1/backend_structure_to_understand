import { gql, useMutation, useQuery } from '@apollo/client';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Grid } from '@mui/material';
import { Formik } from 'formik';
import { SubjectProgrammeType, WholeSchoolSequenceStatus } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useMemo } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { wholeSchoolSequenceValidation } from '../../../../shared/validations';
import { IStaticLwpSubject } from '../../../../types/entities/IStaticLwpSubject';
import { IStaticLwpWholeSchoolSequence } from '../../../../types/entities/IStaticLwpWholeSchoolSequence';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonSelectField from '../../../Shared/CommonSelectField';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import WholeSchoolSequenceMembersTable from './WholeSchoolSequenceMembersTable';

const getWholeSchoolSequence = gql`
    query getWholeSchoolSequence($id: String!) {
        getWholeSchoolSequence(id: $id) {
            id
            status
            # Whether any school has scheduled this, which locks the subject, the academic year and
            # the year group rows below (LEA-6700).
            hasAssignments
            subject {
                id
                name
            }
            period {
                index
                shortName
            }
            members {
                id
                sequence {
                    id
                    name
                }
                yearGroup {
                    id
                    year
                }
            }
        }
    }
`;

/**
 * Page-local, and carrying `programmeType` where the shared `getAllSubjectsForAdmin` does not.
 *
 * The form needs the programme type to decide which subjects are offered, and fetching only what a
 * page renders is a project convention, so this asks for the three fields it reads rather than
 * widening the shared query for every other screen that uses it.
 */
const getSubjectsForWholeSchoolSequenceForm = gql`
    query getSubjectsForAdmin {
        getSubjectsForAdmin {
            id
            name
            programmeType
        }
    }
`;

/**
 * Page-local and three fields wide, for the same reason as on the class sequence form: the index to
 * send, the short name to show, and the current flag to work out which years to offer.
 */
const getPeriodsForWholeSchoolSequenceForm = gql`
    query allStaticPeriods {
        allStaticPeriods {
            index
            shortName
            isCurrentPeriod
        }
    }
`;

const createWholeSchoolSequence = gql`
    mutation createWholeSchoolSequence($input: CreateWholeSchoolSequenceInput!) {
        createWholeSchoolSequence(input: $input) {
            id
        }
    }
`;

const updateWholeSchoolSequence = gql`
    mutation updateWholeSchoolSequence($input: UpdateWholeSchoolSequenceInput!) {
        updateWholeSchoolSequence(input: $input) {
            id
        }
    }
`;

/**
 * Publishing is its own mutation, not a status on update, because it runs checks that saving does
 * not.
 *
 * The uncovered year groups it returns are a warning rather than an error: a partial whole-school
 * sequence is publishable, and a class in an uncovered year group is skipped later with a reason.
 */
const publishWholeSchoolSequence = gql`
    mutation publishWholeSchoolSequence($id: String!) {
        publishWholeSchoolSequence(id: $id) {
            wholeSchoolSequence {
                id
                status
            }
            uncoveredYearGroups {
                id
                year
            }
        }
    }
`;

interface WholeSchoolSequenceFormValues {
    subjectId: string;
    /**
     * Held as a string because it is bound to a select, and converted on submit. An empty select
     * value is '', and `Number('')` is 0, which is a perfectly valid period index, so the conversion
     * cannot be left to coercion.
     */
    periodIndex: string;
    /**
     * The chosen sequence per year group, keyed by year group id, with '' for the year groups an
     * admin has not filled in.
     *
     * **A map rather than a FieldArray**, deliberately. The rows are fixed by the year groups that
     * exist, so there is nothing to add, remove or reorder, and `FieldArray`'s `move` and `remove`
     * are the two Formik traps already documented in `SequenceForm.tsx`: they write `errors`
     * directly without revalidating when an array-level Yup error lives on the key. A map has no
     * ordering to get wrong and cannot hit either.
     */
    membersByYearGroupId: Record<string, string>;
}

const blankValues: WholeSchoolSequenceFormValues = {
    subjectId: '',
    periodIndex: '',
    membersByYearGroupId: {}
};

/**
 * Create and edit a whole-school sequence: its subject and academic year, and the class sequence
 * each year group receives.
 *
 * There is deliberately no name field. Subject plus academic year identifies it, and free text
 * restating them drifts.
 *
 * Saving and publishing are separate actions and check different things. Saving refuses what is
 * wrong, meaning a member that could never legally be one, and a partially covered sequence saves
 * happily: content for a year group is often not ready, and refusing would hold up the others.
 * Publishing refuses what is not ready, meaning no members at all, and warns about the gaps.
 */
const WholeSchoolSequenceForm = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const wholeSchoolSequenceId = router?.query?.whole_school_sequence_id as string | undefined;
    const isEdit = Boolean(wholeSchoolSequenceId);

    const {
        data: wholeSchoolSequenceData,
        loading: wholeSchoolSequenceLoading,
        error: wholeSchoolSequenceError
    } = useQuery(getWholeSchoolSequence, {
        variables: { id: wholeSchoolSequenceId },
        skip: !wholeSchoolSequenceId,
        fetchPolicy: 'network-only'
    });

    const { data: subjectsData } = useQuery(getSubjectsForWholeSchoolSequenceForm);
    const { data: periodsData } = useQuery(getPeriodsForWholeSchoolSequenceForm);

    const [createWholeSchoolSequenceMutation, { loading: createLoading }] = useMutation(createWholeSchoolSequence);
    const [updateWholeSchoolSequenceMutation, { loading: updateLoading }] = useMutation(updateWholeSchoolSequence);
    const [publishWholeSchoolSequenceMutation, { loading: publishLoading }] = useMutation(publishWholeSchoolSequence);

    /** Draft until an admin publishes it. Drives the pill, and whether Publish is worth offering. */
    const status: WholeSchoolSequenceStatus | undefined = wholeSchoolSequenceData?.getWholeSchoolSequence?.status;

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, wholeSchoolSequenceError);
    }, [wholeSchoolSequenceError]);

    /**
     * Money Skills only, plus whichever subject the sequence being edited is already on.
     *
     * The gate is the subject's own `programmeType` rather than its name, and the API stays generic:
     * nothing in the schema knows what Money Skills is, so opening this up to another programme is a
     * change to this filter and nothing else.
     *
     * The other programmes are **left out entirely rather than shown disabled**. Listing them was
     * tried first, on the reasoning that an admin would want to see Ready Teddy exists; in review it
     * read as a list of things that were broken rather than a list of things that were coming.
     *
     * The editing subject is kept regardless, or opening a row built for another programme would
     * blank its select and silently move it on the next save.
     */
    const subjectOptions = useMemo(() => {
        const subjects: IStaticLwpSubject[] = subjectsData?.getSubjectsForAdmin || [];
        const editingSubjectId = wholeSchoolSequenceData?.getWholeSchoolSequence?.subject?.id;

        return subjects
            .filter((subject) => subject.programmeType === SubjectProgrammeType.MONEY_SKILLS || subject.id === editingSubjectId)
            .map((subject) => ({ key: subject.id, value: subject.name }));
    }, [subjectsData, wholeSchoolSequenceData]);

    /**
     * With one subject on offer there is no choice to make, so the field states it rather than asking.
     *
     * Locked on the option count rather than on a flag, so it unlocks by itself the day a second
     * programme is allowed through the filter above. It stays populated and is still submitted; a
     * disabled MUI select holds its value.
     */
    const onlyOneSubjectOffered = subjectOptions.length <= 1;

    /**
     * A school somewhere has already scheduled this, so what it says is no longer ours to change
     * (LEA-6700).
     *
     * The subject, the academic year and the year group rows are the whole of what a school was
     * given. Editing any of them would make our record disagree with topics already sitting in front
     * of children, and there is no name field to leave editable because this object has none.
     *
     * The fields go **disabled with a reason**, rather than hidden or silently ignored on save. An
     * admin still needs to read what the sequence is, and a form that quietly discards an edit is
     * worse than one that says it will not take it.
     */
    const scheduledBySchool = Boolean(wholeSchoolSequenceData?.getWholeSchoolSequence?.hasAssignments);

    /** Said once, in the same words, wherever a field explains why it cannot be changed. */
    const lockedReason = 'A school has already scheduled this, so it can no longer be changed';

    const subjectLocked = onlyOneSubjectOffered || scheduledBySchool;

    /**
     * The current academic year and the ones after it, plus whichever year the sequence being edited
     * is already on.
     *
     * Same rule as the class sequence form: a finished year cannot be scheduled by anyone, so
     * offering it would invite an admin to build something that can never be used. The one being
     * edited stays in the list regardless, or opening an old row would silently blank its year.
     */
    const periodOptions = useMemo(() => {
        const periods: { index: number; shortName: string; isCurrentPeriod: boolean }[] = periodsData?.allStaticPeriods || [];
        const currentIndex = periods.find((period) => period.isCurrentPeriod)?.index;
        const editingIndex = wholeSchoolSequenceData?.getWholeSchoolSequence?.period?.index;

        return periods
            .filter(
                (period) =>
                    (currentIndex !== undefined && period.index >= currentIndex) ||
                    (editingIndex !== undefined && period.index === editingIndex)
            )
            .map((period) => ({ key: String(period.index), value: period.shortName }));
    }, [periodsData, wholeSchoolSequenceData]);

    /**
     * The loaded sequence when editing, and sensible defaults when creating.
     *
     * Creating defaults to the only subject on offer and to the current academic year, which is what
     * an admin is building for almost every time. Both remain editable, and the year in particular is
     * often next year's, so this is a starting point rather than a decision made for them.
     *
     * Depends on the two lookups as well as on the sequence, because the defaults cannot be worked
     * out until the subjects and periods have arrived. `enableReinitialize` then reseeds the form
     * when they do, which is exactly why this is memoised: without it, every render would produce a
     * new object and reset whatever the admin had just typed.
     */
    const initialValues: WholeSchoolSequenceFormValues = useMemo(() => {
        const wholeSchoolSequence: IStaticLwpWholeSchoolSequence | undefined = wholeSchoolSequenceData?.getWholeSchoolSequence;

        if (wholeSchoolSequence) {
            return {
                subjectId: wholeSchoolSequence.subject?.id || '',
                periodIndex: wholeSchoolSequence.period ? String(wholeSchoolSequence.period.index) : '',
                // Keyed by year group so a row can find its own value without searching. Year groups
                // with no member are simply absent, which is the same as '' to the table below.
                membersByYearGroupId: (wholeSchoolSequence.members || []).reduce<Record<string, string>>(
                    (byYearGroup, member) => ({ ...byYearGroup, [member.yearGroup.id]: member.sequence.id }),
                    {}
                )
            };
        }

        const periods: { index: number; isCurrentPeriod: boolean }[] = periodsData?.allStaticPeriods || [];
        const currentIndex = periods.find((period) => period.isCurrentPeriod)?.index;

        return {
            // The sole subject when there is one, which is every case until a second programme is
            // allowed through the filter above. More than one and the admin picks, as before.
            subjectId: subjectOptions.length === 1 ? String(subjectOptions[0].key) : blankValues.subjectId,
            // `!== undefined` rather than a truthy test: the first academic year is index 0.
            periodIndex: currentIndex !== undefined ? String(currentIndex) : blankValues.periodIndex,
            membersByYearGroupId: {}
        };
    }, [wholeSchoolSequenceData, subjectOptions, periodsData]);

    const submit = (values: WholeSchoolSequenceFormValues) => {
        const input = {
            subjectId: values.subjectId,
            periodIndex: Number(values.periodIndex)
        };

        /*
         * Only the year groups an admin actually filled in. The empty rows are how the form shows a
         * gap, not something to send: the API takes a member list, and a member with no sequence
         * would be a row that means nothing.
         *
         * The year group is deliberately not sent. The API reads it off the sequence, so the two
         * cannot disagree, and this map's keys are only ever used to render rows.
         */
        const members = Object.values(values.membersByYearGroupId)
            .filter(Boolean)
            .map((sequenceId) => ({ sequenceId }));

        const request = isEdit
            ? updateWholeSchoolSequenceMutation({
                  // Always sent on edit, including when empty: an empty list clears every member,
                  // which is a valid state and must not be confused with saying nothing about them.
                  variables: { input: { id: wholeSchoolSequenceId, ...input, members } },
                  refetchQueries: ['getWholeSchoolSequences']
              })
            : createWholeSchoolSequenceMutation({
                  // Sent on create too, so an admin who fills the year groups in on this screen has
                  // them saved with the header rather than silently dropped.
                  variables: { input: { ...input, members } },
                  refetchQueries: ['getWholeSchoolSequences']
              });

        return request
            .then(() => {
                callSnackbar(
                    isEdit ? 'Whole-school sequence updated successfully!' : 'Whole-school sequence created successfully!',
                    'success'
                );
                router?.push('/admin/sequences/whole-school');
            })
            .catch((error) => callSnackbar(error, 'error'));
    };

    /**
     * Saves whatever is on the form, then publishes it.
     *
     * Saving first is the point: publishing the stored state while the admin is looking at edited
     * rows would publish something they never saw. It also means the member rules are applied to the
     * rows on screen before the readiness checks run against them.
     *
     * Publish is an edit-only action. A whole-school sequence has to exist before it can be checked,
     * and creating one is already a single click away.
     */
    const saveThenPublish = async (values: WholeSchoolSequenceFormValues) => {
        const members = Object.values(values.membersByYearGroupId)
            .filter(Boolean)
            .map((sequenceId) => ({ sequenceId }));

        try {
            await updateWholeSchoolSequenceMutation({
                variables: {
                    input: { id: wholeSchoolSequenceId, subjectId: values.subjectId, periodIndex: Number(values.periodIndex), members }
                }
            });

            const { data } = await publishWholeSchoolSequenceMutation({
                variables: { id: wholeSchoolSequenceId },
                refetchQueries: ['getWholeSchoolSequences']
            });

            const uncovered: { id: string; year: string }[] = data?.publishWholeSchoolSequence?.uncoveredYearGroups || [];

            /*
             * Gaps are a warning, not a failure: it published either way, and a class in an uncovered
             * year group is skipped later with a reason rather than refused. Naming them is the whole
             * value of the message, so the admin knows what is still to build rather than only that
             * something is missing.
             */
            if (uncovered.length) {
                callSnackbar(
                    `Published. ${uncovered.map((yearGroup) => yearGroup.year).join(', ')} ${
                        uncovered.length === 1 ? 'has' : 'have'
                    } no topic sequence yet.`,
                    'warning'
                );
            } else {
                callSnackbar('Whole-school sequence published successfully!', 'success');
            }

            router?.push('/admin/sequences/whole-school');
        } catch (error) {
            // Covers both halves: a member that is no longer legal fails the save, and having no
            // members at all fails the publish. Either way nothing was published.
            callSnackbar(error, 'error');
        }
    };

    // Wait for the router, or a dynamic route renders as "Create" for a frame before its id arrives.
    if (!router?.isReady || wholeSchoolSequenceLoading) return <CommonLoading />;

    return (
        <div className="sequence-form" data-test={isEdit ? 'edit-whole-school-sequence-page' : 'create-whole-school-sequence-page'}>
            <Grid container alignItems="center" spacing={2}>
                <Grid item>
                    <Heading1 text={isEdit ? 'Edit whole-school sequence' : 'Create whole-school sequence'} />
                </Grid>
                {/* Draft or Published, so an admin can tell at a glance whether schools can see this
                    one. Absent while creating, where there is nothing to have a status yet. */}
                {status ? (
                    <Grid item>
                        <Paragraph
                            dataTest="whole-school-sequence-status"
                            text={status === WholeSchoolSequenceStatus.PUBLISHED ? 'Published' : 'Draft'}
                        />
                    </Grid>
                ) : null}
            </Grid>

            <Paragraph
                dataTest="whole-school-sequence-note"
                text="A whole-school sequence is identified by its subject and academic year, so it needs no name. It stays a draft until you publish it, and nothing is offered to a school before then."
            />

            <Formik initialValues={initialValues} enableReinitialize validationSchema={wholeSchoolSequenceValidation} onSubmit={submit}>
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, setValues }) => (
                    <>
                        <CommonCard>
                            <Heading3 text="Details" />

                            <Grid container spacing={3}>
                                <CommonSelectField
                                    md={6}
                                    lg={6}
                                    name="subjectId"
                                    label="Subject"
                                    shrink
                                    dataTest="whole-school-sequence-subject-select"
                                    value={values.subjectId}
                                    options={subjectOptions}
                                    disabled={subjectLocked}
                                    /*
                                     * The lock speaks first where both apply. "Money Skills is the
                                     * only programme for now" invites an admin to come back later,
                                     * which is wrong once a school has taken a copy: this one is
                                     * never changing.
                                     */
                                    helperText={
                                        scheduledBySchool
                                            ? lockedReason
                                            : onlyOneSubjectOffered
                                              ? 'Money Skills is the only programme offered whole-school for now'
                                              : undefined
                                    }
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.subjectId}
                                    touched={touched.subjectId}
                                />

                                <CommonSelectField
                                    md={6}
                                    lg={6}
                                    name="periodIndex"
                                    label="Academic year"
                                    shrink
                                    dataTest="whole-school-sequence-period-select"
                                    value={values.periodIndex}
                                    options={periodOptions}
                                    disabled={scheduledBySchool}
                                    helperText={scheduledBySchool ? lockedReason : undefined}
                                    /*
                                     * Changing the year clears every chosen sequence, because a
                                     * sequence belongs to one academic year: the ones on screen are
                                     * last year's and the API would refuse every one of them. Cleared
                                     * rather than left to fail on save, so the admin sees the rows
                                     * empty and refills them from what the new year actually offers.
                                     *
                                     * Both fields are set in one `setValues` call. Two `setFieldValue`
                                     * calls would render once with the new year and the old members
                                     * still in place, which is the state the members query would fire
                                     * against.
                                     */
                                    onChange={(event: React.ChangeEvent<{ value: string }>) =>
                                        setValues({ ...values, periodIndex: event.target.value, membersByYearGroupId: {} })
                                    }
                                    onBlur={handleBlur}
                                    error={errors.periodIndex}
                                    touched={touched.periodIndex}
                                />
                            </Grid>
                        </CommonCard>

                        <CommonCard>
                            <Heading3 text="Year groups" />

                            {/*
                                Said once above the rows rather than on each of them. The reason is
                                the same for every year group, and repeating it on ten selects would
                                read as ten separate problems.

                                **A callout rather than a paragraph, and that is not decoration.**
                                As plain body text it sat directly above "Each year group gets one of
                                your existing topic sequences", in the same colour and weight, and the
                                two read as one block of instructions. A disabled select in this app
                                keeps its black text, so with nothing else to go on there was no
                                visible sign the rows were locked at all. Tested in a browser, and the
                                first person to read it missed it.
                            */}
                            {scheduledBySchool ? (
                                <Alert
                                    className="assign-sequence-callout"
                                    data-test="whole-school-sequence-locked-note"
                                    icon={<LockOutlinedIcon sx={{ color: '#F28D00' }} />}
                                    sx={{ backgroundColor: '#FFF6D9', marginBottom: '16px' }}
                                    severity="warning">
                                    <b>{lockedReason}.</b> Schools are already holding these topics, and changing what is here would not
                                    change what they were given.
                                </Alert>
                            ) : null}

                            <WholeSchoolSequenceMembersTable
                                subjectId={values.subjectId}
                                periodIndex={values.periodIndex}
                                value={values.membersByYearGroupId}
                                disabled={scheduledBySchool}
                                onChange={(yearGroupId, sequenceId) => setFieldValue(`membersByYearGroupId.${yearGroupId}`, sequenceId)}
                            />
                        </CommonCard>

                        <Grid container spacing={2} className="sequence-form-actions">
                            {/*
                                Publish is edit-only and separate from saving, because it runs checks
                                that saving does not: a whole-school sequence with no members at all
                                is refused, and one with gaps publishes with a warning naming them.

                                Offered on a published one too. That is how an admin re-runs the
                                checks after an edit, and refusing would mean the only way to
                                re-validate was to unpublish something schools may be using.

                                **Both saves disappear once a school has scheduled it (LEA-6700).**
                                There is nothing left for them to save: the subject, the year and the
                                members are the whole of this form, and all three are locked. Leaving
                                them meant a page that said "this can no longer be changed" and then
                                offered two buttons promising to save changes; pressing one reported
                                success and wrote nothing, which reads as confirmation that the lock
                                is not real.

                                Re-running the publish checks goes with them, and that is the right
                                trade. Those checks report members that have drifted out of their
                                academic year, and an admin who cannot edit the members can do nothing
                                about what they would report.
                            */}
                            {isEdit && !scheduledBySchool ? (
                                <Grid item>
                                    <LWPButton
                                        btnText={status === WholeSchoolSequenceStatus.PUBLISHED ? 'Save and re-publish' : 'Publish'}
                                        dataTest="publish-whole-school-sequence-button"
                                        onClick={() => saveThenPublish(values)}
                                        loading={publishLoading || updateLoading}
                                    />
                                </Grid>
                            ) : null}
                            {scheduledBySchool ? null : (
                                <Grid item>
                                    <LWPButton
                                        btnText={isEdit ? 'Save draft' : 'Create whole-school sequence'}
                                        dataTest="save-whole-school-sequence-button"
                                        variant={isEdit ? 'outlined' : undefined}
                                        onClick={handleSubmit}
                                        loading={createLoading || updateLoading}
                                    />
                                </Grid>
                            )}
                            <Grid item>
                                <LWPButton
                                    btnText="Cancel"
                                    dataTest="cancel-whole-school-sequence-button"
                                    variant="text"
                                    color="inherit"
                                    onClick={() => router?.push('/admin/sequences/whole-school')}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}
            </Formik>
        </div>
    );
};

export default WholeSchoolSequenceForm;
