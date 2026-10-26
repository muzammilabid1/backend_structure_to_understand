import { useMutation, useQuery } from '@apollo/client';
import { Formik } from 'formik';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { addTrophyInPupil } from '../../../graphQl/mutations';
import { getActiveStaticTrophy, getPupilForAdminPupilView, getPupilForAwardTrophy } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { awardTrophyValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import Paragraph from '../Typography/Paragraph';
import CommonSelectField from './../CommonSelectField';
import DialogWrapper from './../DialogWrapper';

// Queries

const getPupilTrophiesForAwardTrophy = gql`
    query getPupilTrophies($pupilId: String!, $parentId: String) {
        getPupilTrophies(pupilId: $pupilId, parentId: $parentId) {
            id
            pupil {
                id
            }
            schoolClass {
                id
            }
            trophy {
                id
                title
                logo
                certificatePdf
            }
        }
    }
`;

const AwardTrophy = ({ open, setOpen, child_id, isAdminView = false }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { error: error, data: activeTrophiesData } = useQuery(getActiveStaticTrophy);

    const { error: pupilError, data: pupilData } = useQuery(getPupilForAwardTrophy, {
        variables: { id: child_id }
    });

    let [addTrophyInPupilMutation, { loading }] = useMutation(addTrophyInPupil, {
        awaitRefetchQueries: true,
        refetchQueries: [{ query: getPupilTrophiesForAwardTrophy, variables: { pupilId: child_id, parentId: null } }]
    });

    if (isAdminView) {
        [addTrophyInPupilMutation, { loading }] = useMutation(addTrophyInPupil, {
            refetchQueries: [{ query: getPupilForAdminPupilView, variables: { id: child_id } }],
            awaitRefetchQueries: true
        });
    }

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        pupilError?.message && callSnackbar(pupilError, 'error');
    }, [pupilError]);

    return (
        <Formik
            initialValues={{ trophyId: '' }}
            validationSchema={awardTrophyValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    await addTrophyInPupilMutation({
                        variables: {
                            pupilId: child_id,
                            trophyId: values?.trophyId,
                            classId: pupilData?.pupil?.currentClassOrGroupAcrossClasses?.id
                        }
                    });
                    callSnackbar('Trophy awarded to pupil successfully.');
                    setOpen(false);
                    resetForm({ values: '' });
                } catch (error) {
                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                        setOpen(false);
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper className="add_parent_modal" open={open} setOpen={setOpen} heading="Select the trophy">
                        <div className="award-trophy-container">
                            <Paragraph text="This allows you to award a trophy to a pupil who has not met the criteria by completing all the tasks in the term. Please select the trophy below. An email will be sent to the pupil in the next scheduled batch, and their trophy will be available to download. This cannot be reversed." />
                            <CommonSelectField
                                label="Trophy certificates"
                                options={(activeTrophiesData?.getActiveStaticTrophy || [])?.map((at) => ({
                                    key: at?.id,
                                    value: at?.title
                                }))}
                                value={values.trophyId}
                                error={errors.trophyId}
                                touched={touched.trophyId}
                                md={12}
                                lg={12}
                                onChange={(e) =>
                                    handleChange({
                                        target: { name: 'trophyId', value: e.target.value }
                                    })
                                }
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'trophyId', value: e.target.value }
                                    })
                                }
                            />

                            <div className="btn_group">
                                <LWPButton
                                    customClass="cancel_btn"
                                    variant="text"
                                    onClick={() => setOpen(false)}
                                    btnText="Cancel"
                                    color="inherit"
                                />
                                <LWPButton btnText="Award trophy" disabled={!values?.trophyId} loading={loading} onClick={handleSubmit} />
                            </div>
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AwardTrophy.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    child_id: PropTypes.number.isRequired,
    isAdminView: PropTypes.bool
};

export default AwardTrophy;
