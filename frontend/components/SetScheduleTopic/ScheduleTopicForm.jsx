import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, Box, Divider, Grid, TableCell, TableRow } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';

import {
    _get_iso_8601_date_format,
    buildSetByTeacherFormData,
    showDate,
    ThemeContext,
    validateSetByTeacherSteps
} from '../../shared/Services/handler';
import { unexpectedError } from '../../shared/Constant';
import { scheduleTopicValidation } from '../../shared/validations';
import LWPButton from '../Shared/Button/LWPButton';
import CommonMultiSelect from '../Shared/CommonMultiSelect';
import CommonTable from '../Shared/CommonTable';
import CommonTooltipIcon from '../Shared/CommonTooltipIcon';
import DateField from '../Shared/InputField/DateField';
import InputField from '../Shared/InputField/InputField';
import ConfirmationModal from '../Shared/Modals/ConfirmationModal';
import SetByTeacherAccordion, { getSetByTeacherStepsForTopicQuery } from '../Teacher/Modals/SetByTeacherAccordion.tsx';
import Paragraph from '../Shared/Typography/Paragraph';
import ShowSchedulTopic from './ShowSchedulTopic';

export const getScheduleClassesGroups = gql`
    query getScheduleClassesGroups($schoolId: String!, $topicId: String!, $subjectIds: [String!]!) {
        getScheduleClassesGroups(schoolId: $schoolId, topicId: $topicId, subjectIds: $subjectIds) {
            id
            name
            year
            isMyClass
            isMyGroup
            schoolClass
        }
    }
`;

const getPreviouslySetTopicDate = gql`
    query getPreviouslySetTopicDate($topicId: String!, $classId: String!) {
        getPreviouslySetTopicDate(topicId: $topicId, classId: $classId)
    }
`;

export const addTopicToClasses = gql`
    mutation addTopicToClasses($input: AddTopicToClassesInput!, $file: [Upload!]) {
        addTopicToClasses(input: $input, file: $file)
    }
`;

const ScheduleTopicForm = ({ topicData }) => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const router = useRouter();
    const ref = useRef();

    const queryParams = useParams();

    const topicLibraryRoute = `/school/${queryParams?.school_id}/topic-library`;

    const [modal, setModal] = useState({ open: false, id: null });

    const hasSetByTeacherSteps = !!topicData?.hasSetByTeacherSteps;

    const [scheduleClassesGroups, { error, data: scheduleData }] = useLazyQuery(getScheduleClassesGroups);
    const [getPreviouslySetTopicDateQuery, { error: getPreviouslySetTopicerror }] = useLazyQuery(getPreviouslySetTopicDate);

    const [multipleClassTopic, { loading: multipleClassTopicLoading }] = useMutation(addTopicToClasses);

    const {
        data: sbtStepsData,
        loading: sbtStepsQueryLoading,
        error: sbtStepsError
    } = useQuery(getSetByTeacherStepsForTopicQuery, {
        variables: { topicId: topicData?.id, classTopicId: null, isReleased: false },
        skip: !hasSetByTeacherSteps || !topicData?.id,
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        if (topicData) {
            scheduleClassesGroups({
                variables: {
                    schoolId: token?.schoolId || queryParams?.school_id,
                    subjectIds: topicData?.domains?.map((td) => td.subject.id),
                    topicId: topicData?.id
                }
            });
        }
    }, [topicData]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        getPreviouslySetTopicerror?.message && callSnackbar(getPreviouslySetTopicerror, 'error');
        sbtStepsError?.message && callSnackbar(sbtStepsError, 'error');
    }, [error, getPreviouslySetTopicerror, sbtStepsError]);

    const buildSetByTeacherData = (values) => {
        if (!hasSetByTeacherSteps) {
            return { setByTeacherStepIds: undefined, setByTeacherStepMessages: undefined, file: undefined };
        }

        return buildSetByTeacherFormData(values);
    };

    const classAndgroupOptions = scheduleData?.getScheduleClassesGroups
        ?.map((item) => {
            if (item?.isMyClass || item.isMyGroup) {
                return {
                    ...item,
                    groupBy: 'Your classes/groups',
                    value: item?.name,
                    key: item?.id,
                    name: `${item?.name} - ${item?.year}`
                };
            } else {
                return {
                    ...item,
                    groupBy: 'Other classes/groups',
                    value: item?.name,
                    key: item?.id,
                    name: `${item?.name} - ${item?.year}`
                };
            }
        })
        .sort((a, b) => {
            if (a.groupBy === 'Your classes/groups' && b.groupBy !== 'Your classes/groups') {
                return -1;
            }

            if (a.groupBy !== 'Your classes/groups' && b.groupBy === 'Your classes/groups') {
                return 1;
            }

            return 0;
        });

    return (
        <div>
            <Formik
                initialValues={{
                    startDate: '',
                    endDate: null,
                    topicMessage: '',
                    classAndGroupNames: [],
                    setByTeacherStepIds: {},
                    setByTeacherSteps: [],
                    setByTeacherStepMessages: {}
                }}
                innerRef={ref}
                validationSchema={scheduleTopicValidation}
                validate={(values) => validateSetByTeacherSteps(values, hasSetByTeacherSteps)}
                onSubmit={async (values) => {
                    try {
                        const { setByTeacherStepIds, setByTeacherStepMessages, file } = buildSetByTeacherData(values);
                        const classIds = values?.classAndGroupNames?.map((item) => item.key);
                        const baseInput = {
                            releaseDate: _get_iso_8601_date_format(values?.startDate),
                            dueDate: values?.endDate,
                            teacherMessage: values?.topicMessage,
                            createdBy: token.sub,
                            topicId: topicData?.id
                        };

                        await multipleClassTopic({
                            variables: {
                                input: {
                                    ...baseInput,
                                    classId: classIds,
                                    setByTeacherStepIds,
                                    setByTeacherStepMessages
                                },
                                file
                            }
                        });

                        callSnackbar('Topic successfully added.', 'success');
                        router?.push(topicLibraryRoute);
                    } catch (err) {
                        // Only an error with a status has a message written for people; a storage outage, for one,
                        // arrives with an empty message and would show as a blank error.
                        const statusCode = err?.graphQLErrors?.[0]?.extensions?.exception?.status || err?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(err, 'error');
                        } else {
                            window.newrelic?.noticeError(err, { caught: true, handled: false });
                            callSnackbar(unexpectedError, 'error');
                        }
                    }
                }}>
                {({ values, handleChange, handleBlur, handleSubmit, errors, touched, validateForm }) => {
                    const isSubmitting = multipleClassTopicLoading;
                    const sbtStepsLoading = hasSetByTeacherSteps && sbtStepsQueryLoading;

                    return (
                        <Grid container spacing={2}>
                            <CommonMultiSelect
                                label="Search for a class or a group"
                                name="classAndGroupNames"
                                options={classAndgroupOptions}
                                filterSelectedOptions={false}
                                error={errors.classAndGroupNames}
                                touched={touched.classAndGroupNames}
                                groupBy={(option) => option.groupBy}
                                getOptionLabel={(option) => option.value}
                                renderOption={(props, option) => {
                                    return (
                                        <Box
                                            component="li"
                                            sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                                            data-test={`schedule-topic-class-option[${option?.value}]`}
                                            {...props}>
                                            <Grid container justifyContent={'space-between'}>
                                                <Paragraph text={option?.value}>
                                                    <Paragraph style={{ color: '#999591' }} text={option?.schoolClass} />
                                                </Paragraph>
                                            </Grid>
                                        </Box>
                                    );
                                }}
                                renderGroup={(params) => (
                                    <li className="class_group_renderGroup" key={params.key}>
                                        <div className="renderGroup_heading">{params.group}</div>
                                        <div>{params.children}</div>
                                        {params.key == 0 ? <Divider /> : ''}
                                    </li>
                                )}
                                onChange={async (value) => {
                                    const { data } = await getPreviouslySetTopicDateQuery({
                                        variables: {
                                            topicId: router?.query?.topic_id,
                                            classId: value?.find((item) => item.id)?.id
                                        }
                                    });

                                    const result = value.map((item) => ({ ...item, previouslySetDate: data?.getPreviouslySetTopicDate }));

                                    const uniqueArr = [
                                        ...new Map([...values.classAndGroupNames, ...result].map((v) => [v.key, v])).values()
                                    ];

                                    handleChange({
                                        target: {
                                            name: 'classAndGroupNames',
                                            value: uniqueArr
                                        }
                                    });
                                }}
                                onBlur={(value) =>
                                    handleBlur({
                                        target: { name: 'classAndGroupNames', value: value }
                                    })
                                }
                                data-test={'schedule-topic-class-select'}
                            />
                            <Grid xs={12} sm={12} md={12} lg={12} item>
                                <CommonTable head={['Class/group names']}>
                                    {values?.classAndGroupNames.map((item) => (
                                        <TableRow key={item.key}>
                                            <TableCell>
                                                <Grid container justifyContent={'space-between'}>
                                                    <Grid>
                                                        <Paragraph text={item?.value} />
                                                        <Paragraph style={{ color: '#999591' }} text={item?.schoolClass} />
                                                    </Grid>

                                                    <Grid>
                                                        <div className="view_scheduled">
                                                            <Paragraph
                                                                text={'View scheduled topics'}
                                                                onClick={() => setModal({ open: true, id: item?.key, name: item?.name })}
                                                            />
                                                            <span
                                                                onClick={() => {
                                                                    const deleteArr = values?.classAndGroupNames?.filter(
                                                                        ({ key }) => key !== item.key
                                                                    );

                                                                    handleChange({
                                                                        target: {
                                                                            name: 'classAndGroupNames',
                                                                            value: deleteArr
                                                                        }
                                                                    });
                                                                }}
                                                                className="material-icons cp">
                                                                delete
                                                            </span>
                                                        </div>
                                                    </Grid>
                                                </Grid>

                                                {item?.previouslySetDate && (
                                                    <Alert
                                                        icon={<HelpOutlineIcon />}
                                                        severity="warning"
                                                        sx={{
                                                            background: '#FFF6D9',
                                                            marginTop: 2
                                                        }}>
                                                        Previously set for this class/group on{' '}
                                                        {showDate({
                                                            date: item?.previouslySetDate,
                                                            short: true
                                                        })}
                                                    </Alert>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </CommonTable>
                            </Grid>

                            <DateField
                                name="startDate"
                                label="Start date"
                                lg={12}
                                md={12}
                                value={values.startDate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.startDate}
                                touched={touched.startDate}
                                minDate={new Date()}
                                iconPosition="end"
                                endCommonTooltipIcon={
                                    <CommonTooltipIcon
                                        text="The topic will be available to parents when they log in at any time on this day. Once it is available to parents the settings here can no longer be edited. They will receive an email notification to complete the topic after school (on a school day) or in the morning (on other days)."
                                        customIconClass="skip-toolTip"
                                    />
                                }
                                dataTest={'schedule-topic-start-date-input'}
                            />

                            <DateField
                                name="endDate"
                                label="End date (optional)"
                                value={values.endDate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.endDate}
                                touched={touched.endDate}
                                minDate={values.startDate}
                                md={12}
                                lg={12}
                                iconPosition="end"
                                endCommonTooltipIcon={
                                    <CommonTooltipIcon
                                        text="This is displayed to parents as an indication of when they should complete this topic by. (It will still be available for them to access after this date.)"
                                        customIconClass="skip-toolTip"
                                    />
                                }
                            />
                            <Grid xs={12} item className={hasSetByTeacherSteps ? '' : 'mb8'}>
                                <InputField
                                    name="topicMessage"
                                    label="Topic message (optional)"
                                    value={values.topicMessage}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.topicMessage}
                                    touched={touched.topicMessage}
                                    md={12}
                                    lg={12}
                                    type="text"
                                    multiline
                                    rows={3}
                                    wordCount={values?.topicMessage?.length || 0}
                                    inputProps={{
                                        maxlength: 150
                                    }}
                                />
                                <Paragraph text="This note will appear at the top of the topic page for parents & children, before the video." />
                            </Grid>

                            {hasSetByTeacherSteps && (
                                <Grid xs={12} item className="mb8">
                                    <SetByTeacherAccordion
                                        steps={sbtStepsData?.getSetByTeacherStepsForTopic ?? []}
                                        loading={sbtStepsQueryLoading}
                                    />
                                </Grid>
                            )}

                            <div className="set_topic_reader_btn">
                                <LWPButton
                                    customClass="cancel_btn"
                                    variant="text"
                                    onClick={() => {
                                        router?.push(topicLibraryRoute);
                                    }}
                                    btnText="Cancel"
                                    color="inherit"
                                    disabled={isSubmitting}
                                />
                                <LWPButton
                                    customClass="m-25"
                                    btnText={`Schedule topic`}
                                    onClick={async () => {
                                        const sortedBySetDate = values?.classAndGroupNames?.sort((a, b) => {
                                            const dateA = new Date(a.previouslySetDate);
                                            const dateB = new Date(b.previouslySetDate);

                                            return dateB - dateA;
                                        });

                                        const isPreviouslySet = sortedBySetDate?.find((value) => value?.previouslySetDate);

                                        if (!isPreviouslySet?.previouslySetDate) {
                                            handleSubmit();

                                            return;
                                        }

                                        const validationErrors = await validateForm();

                                        if (Object.keys(validationErrors).length > 0) {
                                            handleSubmit();

                                            return;
                                        }

                                        setModal({ confirmm: true, previouslySetDate: isPreviouslySet?.previouslySetDate });
                                    }}
                                    loading={isSubmitting}
                                    disabled={sbtStepsLoading}
                                    dataTest={'schedule-topic-submit-btn'}
                                />
                            </div>
                        </Grid>
                    );
                }}
            </Formik>

            {modal?.open && <ShowSchedulTopic open={modal} setOpen={setModal} />}

            {modal?.confirmm && (
                <ConfirmationModal
                    open={modal?.confirmm}
                    onCancel={() => setModal({ open: false, id: null })}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        setModal({ open: false, id: null });
                        ref?.current?.handleSubmit();
                    }}>
                    <Paragraph
                        text={`This topic is being repeated (most recently set for at least one selected class on ${showDate({
                            date: modal?.previouslySetDate,
                            short: true
                        })} ).`}
                    />
                </ConfirmationModal>
            )}
        </div>
    );
};

ScheduleTopicForm.propTypes = {
    topicData: PropTypes.object.isRequired
};

export default ScheduleTopicForm;
