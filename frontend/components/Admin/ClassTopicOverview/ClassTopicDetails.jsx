import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteClassTopic, updateClassTopic } from '../../../graphQl/mutations';
import { getClassTopicForClassTopicOverview } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { _removeWhiteSpace, showDate, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonLoading from './../../Shared/CommonLoading';
import CommonSelectField from './../../Shared/CommonSelectField';
import Divider from './../../Shared/Divider';
import InputField from './../../Shared/InputField/InputField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const ClassTopicDetails = ({ classtopic_id, setClassId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const [openDeleteClassModal, setOpenDeleteClassModal] = useState(false);
    const [value, setValue] = useState(sharedJson?.deletedClassTopicFilter?.[0]?.key);

    const {
        loading,
        error,
        data: classTopicDetails
    } = useQuery(getClassTopicForClassTopicOverview, {
        variables: { id: queryParams?.classtopic_id }
    });

    const [updateClassTopicMutation, { loading: updateClassTopicLoading }] = useMutation(updateClassTopic, {
        refetchQueries: [{ query: getClassTopicForClassTopicOverview, variables: { id: queryParams?.classtopic_id } }],
        awaitRefetchQueries: true
    });

    const [deleteClassTopicMutation, { loading: deleteClassTopicLoading }] = useMutation(deleteClassTopic, {
        refetchQueries: [{ query: getClassTopicForClassTopicOverview, variables: { id: queryParams?.classtopic_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (classTopicDetails) {
            setClassId(classTopicDetails?.getClassTopic?.class?.id);
        }
    }, [classTopicDetails]);

    if (loading) return <CommonLoading />;

    return (
        <div className="class_overview">
            <Formik
                initialValues={{
                    title: classTopicDetails?.getClassTopic?.title ?? null,
                    displayDate: classTopicDetails?.getClassTopic?.displayDate
                        ? showDate({ date: classTopicDetails?.getClassTopic?.displayDate, year: true })
                        : '-',
                    dueDate: classTopicDetails?.getClassTopic?.dueDate
                        ? showDate({ date: classTopicDetails?.getClassTopic?.dueDate, year: true })
                        : '-',
                    releaseDate: classTopicDetails?.getClassTopic?.releaseDate
                        ? showDate({ date: classTopicDetails?.getClassTopic?.releaseDate, year: true })
                        : '-',
                    teacherMessage: classTopicDetails?.getClassTopic?.teacherMessage ?? '-'
                }}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        const { title, teacherMessage } = values;

                        await updateClassTopicMutation({
                            variables: {
                                input: {
                                    id: classtopic_id,
                                    title: _removeWhiteSpace(title),
                                    teacherMessage: _removeWhiteSpace(teacherMessage)
                                }
                            }
                        });
                        callSnackbar('Update Successful!', 'success');
                    } catch (error) {
                        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(error, 'error');
                        } else {
                            window.newrelic?.noticeError(error, { caught: true, handled: false });
                            callSnackbar(unexpectedError, 'error');
                        }
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    return (
                        <Form className="mt10">
                            <InputField md={4} lg={4} label="Display Date" value={values.displayDate} disabled />
                            <InputField
                                md={4}
                                lg={4}
                                label="Title"
                                value={values.title}
                                name="title"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.title}
                                touched={touched.title}
                            />
                            <InputField md={4} lg={4} label="Due Date" value={values.dueDate} disabled />
                            <InputField md={4} lg={4} label="Release Date" value={values.releaseDate} disabled />

                            <InputField
                                md={4}
                                lg={4}
                                label="Teacher Message"
                                name="teacherMessage"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.teacherMessage}
                                error={errors.teacherMessage}
                                touched={touched.teacherMessage}
                                inputComponent="textarea"
                            />
                            <LWPButton btnText="Update details" loading={updateClassTopicLoading} onClick={handleSubmit} />
                        </Form>
                    );
                }}
            </Formik>
            <Divider customClass="mtb-20" />
            <div className="delete-class-topic">
                <Heading2 text={'Delete Class Topic'} />
                <LWPButton
                    customClass="mb-10"
                    btnText={'Delete Class Topic'}
                    onClick={() => setOpenDeleteClassModal(!openDeleteClassModal)}
                />
            </div>
            {openDeleteClassModal && (
                <ConfirmationModal
                    open={openDeleteClassModal}
                    onCancel={() => setOpenDeleteClassModal(!openDeleteClassModal)}
                    loading={deleteClassTopicLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteClassTopicMutation({
                            variables: {
                                id: classtopic_id,
                                option: value
                            }
                        })
                            .then(() => {
                                setOpenDeleteClassModal(!openDeleteClassModal);
                                callSnackbar('Class topic deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteClassModal(!openDeleteClassModal);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <div className="delete-class-topic-modal-confirmation">
                        <CommonSelectField
                            label={'Options'}
                            options={sharedJson?.deletedClassTopicFilter}
                            value={value}
                            error={value == null && 'Required *'}
                            touched={true}
                            onChange={(e) => setValue(e.target.value)}
                            style={{ marginTop: '1rem' }}
                        />
                        <Paragraph text="This will permanently delete the class topic." />
                    </div>
                </ConfirmationModal>
            )}
        </div>
    );
};

ClassTopicDetails.propTypes = {
    setClassId: PropTypes.func,
    classtopic_id: PropTypes.number
};

export default ClassTopicDetails;
