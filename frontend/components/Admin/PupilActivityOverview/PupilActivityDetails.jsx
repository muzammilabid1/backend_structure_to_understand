import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deletePupilActivity, updatePupilActivity } from '../../../graphQl/mutations';
import { getPupilActivityForPupilActivityOverview } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { updatePupilActivityFromAdminValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonLoading from './../../Shared/CommonLoading';
import Divider from './../../Shared/Divider';
import InputField from './../../Shared/InputField/InputField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const PupilActivityDetails = ({ pupilactivity_id, setPupilTopicId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [openDeletePupilActivityModal, setOpenDeletePupilActivityModal] = useState(false);

    const {
        loading,
        error,
        data: pupilActivityData
    } = useQuery(getPupilActivityForPupilActivityOverview, {
        variables: { id: pupilactivity_id }
    });

    const [updatePupilActivityMutation, { loading: updatePupilActivityLoading }] = useMutation(updatePupilActivity, {
        refetchQueries: [{ query: getPupilActivityForPupilActivityOverview, variables: { id: pupilactivity_id } }],
        awaitRefetchQueries: true
    });

    const [deletePupilActivityMutation, { loading: deletePupilActivityLoading }] = useMutation(deletePupilActivity, {
        refetchQueries: [
            {
                query: getPupilActivityForPupilActivityOverview,
                variables: { id: pupilactivity_id }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (pupilActivityData) {
            setPupilTopicId(pupilActivityData?.getPupilActivity?.topic?.id);
        }
    }, [pupilActivityData]);

    if (loading) return <CommonLoading />;

    return (
        <div className="class_overview">
            <Formik
                initialValues={{
                    earnedStar: pupilActivityData?.getPupilActivity?.earnedStar ?? false,
                    rating: pupilActivityData?.getPupilActivity?.rating ?? 0
                }}
                validationSchema={updatePupilActivityFromAdminValidation}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        const { earnedStar, rating } = values;

                        await updatePupilActivityMutation({
                            variables: {
                                id: pupilactivity_id,
                                earnedStar,
                                rating: +rating
                            }
                        });
                        callSnackbar('Pupil activity updated!', 'success');
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
                            <InputField
                                md={4}
                                lg={4}
                                label="Rating"
                                name="rating"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                value={values.rating}
                                error={errors.rating}
                                touched={touched.rating}
                            />

                            <CommonCheckBox
                                name="earnedStar"
                                checked={values.earnedStar}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Star Earned"
                                error={errors.earnedStar}
                                touched={touched.earnedStar}
                            />

                            <LWPButton
                                customClass="pupil-topic-update-button"
                                btnText="Update details"
                                loading={updatePupilActivityLoading}
                                onClick={handleSubmit}
                            />
                        </Form>
                    );
                }}
            </Formik>
            <Divider customClass="mtb-20" />
            <div className="delete-class-topic">
                <Heading2 text={'Delete Pupil Activity'} />
                <LWPButton
                    customClass="mb-10"
                    btnText={'Delete Pupil Activity'}
                    onClick={() => setOpenDeletePupilActivityModal(!openDeletePupilActivityModal)}
                />
            </div>
            {openDeletePupilActivityModal && (
                <ConfirmationModal
                    open={openDeletePupilActivityModal}
                    onCancel={() => setOpenDeletePupilActivityModal(!openDeletePupilActivityModal)}
                    loading={deletePupilActivityLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deletePupilActivityMutation({
                            variables: {
                                id: pupilactivity_id
                            }
                        })
                            .then(() => {
                                setOpenDeletePupilActivityModal(!openDeletePupilActivityModal);
                                callSnackbar('Pupil activity deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeletePupilActivityModal(!openDeletePupilActivityModal);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <div className="delete-class-topic-modal-confirmation">
                        <Paragraph text="This will permanently delete the pupil activity." />
                    </div>
                </ConfirmationModal>
            )}
        </div>
    );
};

PupilActivityDetails.propTypes = {
    setPupilTopicId: PropTypes.func,
    pupilactivity_id: PropTypes.number
};

export default PupilActivityDetails;
