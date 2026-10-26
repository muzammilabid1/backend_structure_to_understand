import { useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { updatePupil } from '../../../graphQl/mutations';
import { getPupilForTeacher } from '../../../graphQl/queries';
import { ADMIN, TEACHER, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { updateChildValidation } from '../../../shared/validations';
import LinkPupilToSimsModal from '../../Shared/Modals/LinkPupilToSimsModal';
import PupilClassGroups from '../../Shared/PupilClassGroups';
import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';
import RemoveFromThisSchoolModal from '../PupilNotAssginedToAClass/removeFromThisSchoolModal';
import LWPButton from './../../Shared/Button/LWPButton';
import InputField from './../../Shared/InputField/InputField';
import ParentAndCarersTable from './../../Shared/ParentAndCarersTable';
import PupilClasses from './../../Shared/PupilClasses';
import MisLinkedPupilTable from './MisLinkedPupilTable';

const PupilDetails = ({ pupil, isAdminView }) => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const [removePupilFromSchoolModal, setRemovePupilFromSchoolModal] = useState(false);
    const [open, setOpen] = useState(false);
    const [unlinkPupilFromMisModal, setUnlinkPupilFromMisModal] = useState(false);

    const [updateChild, { loading, error: error }] = useMutation(updatePupil, {
        refetchQueries: [{ query: getPupilForTeacher, variables: { id: pupil?.pupil?.id } }],
        awaitRefetchQueries: true
    });

    const isPupilInCurrentClass = pupil?.pupil?.classes?.every((item) => item.period?.index !== pupil?.pupil.school?.curentPeriod?.index);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <div
            className={isAdminView ? 'admin-pupil-details teacher-pupil-details' : 'teacher-pupil-details'}
            data-test={'pupil-details-section'}>
            <Formik
                initialValues={
                    pupil?.pupil
                        ? {
                              firstname: pupil.pupil.firstname,
                              lastname: pupil.pupil.lastname,
                              upn: pupil?.pupil?.UPN
                          }
                        : formInitialStates['updateChild']
                }
                validationSchema={updateChildValidation}
                onSubmit={async (values) => {
                    try {
                        const { firstname, lastname, upn } = values;

                        await updateChild({
                            variables: {
                                input: {
                                    firstname: _removeWhiteSpace(firstname),
                                    lastname: _removeWhiteSpace(lastname),
                                    id: pupil?.pupil?.id,
                                    UPN: upn ? upn : ''
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
                        <Form className="teacher-pupil-details-input mt10">
                            <InputField
                                md={4}
                                lg={4}
                                label="First name"
                                value={values.firstname}
                                name={'firstname'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.firstname}
                                touched={touched.firstname}
                                dataTest="pupil-detail-firstname-input"
                            />
                            <InputField
                                md={4}
                                lg={4}
                                label="Last name"
                                value={values.lastname}
                                name={'lastname'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.lastname}
                                touched={touched.lastname}
                                dataTest="pupil-detail-lastname-input"
                            />
                            <InputField
                                md={4}
                                lg={4}
                                label="UPN"
                                value={pupil?.pupil?.importedStudent ? pupil?.pupil?.importedStudent?.UPN : values.upn}
                                name={'upn'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.upn}
                                touched={touched.upn}
                                disabled={pupil?.pupil?.importedStudent}
                                endIcon={pupil?.pupil?.importedStudent ? 'lock' : ''}
                            />
                            <LWPButton btnText={'Update details'} loading={loading} onClick={handleSubmit} />
                        </Form>
                    );
                }}
            </Formik>
            <div className="teacher-pupil-detail-table">
                <ParentAndCarersTable child_id={pupil?.pupil?.id} viewType={isAdminView ? ADMIN : TEACHER} />
                <PupilClasses isAdminView={isAdminView} />
                <PupilClassGroups isAdminView={isAdminView} />
            </div>
            {pupil?.pupil?.school?.misName && (
                <div className="mis-pupil-container">
                    <Heading1 text={`Details from ${pupil?.pupil?.school?.misName}`} />
                    <br />
                    {!pupil?.pupil?.importedStudent ? (
                        <Paragraph text={`This pupil is not linked to a pupil profile in ${pupil?.pupil?.school?.misName}`} />
                    ) : (
                        <MisLinkedPupilTable pupil={pupil?.pupil} />
                    )}
                    <LWPButton
                        customClass="pupil-mis-btn"
                        btnText={`${pupil?.['pupil']?.importedStudent?.id ? 'Unlink pupil' : 'Link'} from ${
                            pupil?.['pupil']?.school?.misName
                        }`}
                        startIcon={pupil?.['pupil']?.importedStudent?.id ? 'link_off' : 'add_link'}
                        onClick={() => {
                            if (!pupil?.['pupil']?.importedStudent) {
                                setUnlinkPupilFromMisModal(false);
                                setOpen(!open);
                            } else {
                                setOpen(!open);
                                setUnlinkPupilFromMisModal(true);
                            }
                        }}
                    />
                </div>
            )}
            {((token?.userType === TEACHER && token?.isSchoolLeader) || token?.userType === ADMIN) && isPupilInCurrentClass ? (
                <div className="remove-pupil-from-school">
                    <Heading1 text="Remove from school" />
                    <LWPButton
                        customClass="remove-pupil-from-school-btn"
                        btnText="Remove pupil from school"
                        onClick={() => setRemovePupilFromSchoolModal(!removePupilFromSchoolModal)}
                    />
                </div>
            ) : null}
            {open && (
                <LinkPupilToSimsModal
                    open={open}
                    toggle={() => setOpen(false)}
                    schoolMisIntegrationVariable={pupil?.pupil?.school?.misName}
                    pupil={pupil}
                    unlinkPupilFromMisModal={unlinkPupilFromMisModal}
                />
            )}
            <RemoveFromThisSchoolModal
                open={removePupilFromSchoolModal}
                isPupilDetailsPage
                setOpen={() => setRemovePupilFromSchoolModal(!removePupilFromSchoolModal)}
                schoolName={pupil?.pupil?.school?.schoolName}
                pupilName={pupil?.pupil?.fullname}
                pupilId={pupil?.pupil?.id}
                schoolId={pupil?.pupil?.school?.id}
            />
        </div>
    );
};

PupilDetails.propTypes = {
    pupil: PropTypes.object,
    isAdminView: PropTypes.bool,
    classId: PropTypes.array
};

export default PupilDetails;
