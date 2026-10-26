import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deletePupilTopic, updatePupilTopic } from '../../../graphQl/mutations';
import { getPupilTopicsForClassTopicOverview } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { showDate, ThemeContext } from '../../../shared/Services/handler';
import { updatePupilTopicFromAdminValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonLoading from './../../Shared/CommonLoading';
import Divider from './../../Shared/Divider';
import InputField from './../../Shared/InputField/InputField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const PupilTopicDetails = ({ pupiltopic_id, setClassTopicId, setPupil }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [openDeleteClassModal, setOpenDeleteClassModal] = useState(false);

    const {
        loading,
        error,
        data: classTopicDetails
    } = useQuery(getPupilTopicsForClassTopicOverview, {
        variables: { id: pupiltopic_id }
    });

    const [updatePupilTopicMutation, { loading: updatePupilTopicLoading }] = useMutation(updatePupilTopic, {
        refetchQueries: [{ query: getPupilTopicsForClassTopicOverview, variables: { id: pupiltopic_id } }],
        awaitRefetchQueries: true
    });

    const [deletePupilTopicMutation, { loading: deletePupilTopicLoading }] = useMutation(deletePupilTopic, {
        refetchQueries: [
            {
                query: getPupilTopicsForClassTopicOverview,
                variables: { id: pupiltopic_id }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (classTopicDetails) {
            setClassTopicId(classTopicDetails?.getPupilTopic?.classTopic?.id);
            setPupil(classTopicDetails?.getPupilTopic?.pupil?.id);
        }
    }, [classTopicDetails]);

    if (loading) return <CommonLoading />;

    return (
        <div className="class_overview">
            <Formik
                initialValues={{
                    watchedVideo: classTopicDetails?.getPupilTopic?.watchedVideo ?? false,
                    releaseDate: classTopicDetails?.getPupilTopic?.releaseDate
                        ? showDate({ date: classTopicDetails?.getPupilTopic?.releaseDate, year: true })
                        : '-'
                }}
                validationSchema={updatePupilTopicFromAdminValidation}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        const { watchedVideo } = values;

                        await updatePupilTopicMutation({
                            variables: {
                                input: {
                                    id: pupiltopic_id,
                                    watchedVideo
                                }
                            }
                        });
                        callSnackbar('Pupil topic updated!', 'success');
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
                            <InputField md={4} lg={4} label="Release Date" value={values.releaseDate} disabled />

                            <CommonCheckBox
                                name="watchedVideo"
                                checked={values.watchedVideo}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Video Watched"
                                error={errors.watchedVideo}
                                touched={touched.watchedVideo}
                            />

                            <LWPButton
                                customClass="pupil-topic-update-button"
                                btnText="Update details"
                                loading={updatePupilTopicLoading}
                                onClick={handleSubmit}
                            />
                        </Form>
                    );
                }}
            </Formik>
            <Divider customClass="mtb-20" />
            <div className="delete-class-topic">
                <Heading2 text={'Delete Pupil Topic'} />
                <LWPButton
                    customClass="mb-10"
                    btnText={'Delete Pupil Topic'}
                    onClick={() => setOpenDeleteClassModal(!openDeleteClassModal)}
                />
            </div>
            {openDeleteClassModal && (
                <ConfirmationModal
                    open={openDeleteClassModal}
                    onCancel={() => setOpenDeleteClassModal(!openDeleteClassModal)}
                    loading={deletePupilTopicLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deletePupilTopicMutation({
                            variables: {
                                id: pupiltopic_id
                            }
                        })
                            .then(() => {
                                setOpenDeleteClassModal(!openDeleteClassModal);
                                callSnackbar('Pupil topic deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteClassModal(!openDeleteClassModal);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <div className="delete-class-topic-modal-confirmation">
                        <Paragraph text="This will permanently delete the pupil topic." />
                    </div>
                </ConfirmationModal>
            )}
        </div>
    );
};

PupilTopicDetails.propTypes = {
    setClassTopicId: PropTypes.func,
    setPupil: PropTypes.func,
    pupiltopic_id: PropTypes.number
};

export default PupilTopicDetails;
