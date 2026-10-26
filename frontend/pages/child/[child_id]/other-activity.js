import { gql, useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { saveOwnPupilActivityFeedback } from '../../../graphQl/mutations';
import { getPupilForOwnActivityPage } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _getBase64ToFile, ThemeContext } from '../../../shared/Services/handler';
import { otherActivityValidation } from '../../../shared/validations';
import { PageType } from '../../../types/enums/PageType';
import ActivityDescription from './../../../components/PagesContent/ActivityDescription';
import Breadcrumb from './../../../components/Parent/Breadcrumb';
import UploadImageCard from './../../../components/Parent/Cards/UploadImageCard';
import LWPButton from './../../../components/Shared/Button/LWPButton';
import ConfirmationImageModal from './../../../components/Shared/Modals/ConfirmationImageModal';
import Heading1 from './../../../components/Shared/Typography/Heading1';
import Paragraph from './../../../components/Shared/Typography/Paragraph';

// Queries

const getUserForOtherActivity = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            sharingAllowed
        }
    }
`;

const OtherActivity = () => {
    const { setHeaderTitle, userId, callSnackbar } = useContext(ThemeContext);
    const [saveOwnPupilActivityFeedbackMutation, { loading }] = useMutation(saveOwnPupilActivityFeedback);
    const [filename, setFileName] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [permissionModal, setPermissionModal] = useState(false);
    const [permissionValues, setPermissionValues] = useState({
        shareWithTeacher: null,
        shareWithParent: false,
        sharingAllowedGlobal: false
    });
    const { query } = useRouter();

    const { error, data: pupil } = useQuery(getPupilForOwnActivityPage, {
        variables: { id: query?.child_id }
    });

    const { error: getUserError, data: user } = useQuery(getUserForOtherActivity, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [getUserError]);

    useEffect(() => setHeaderTitle('Add your own activity'), []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const breadcrumbLists = [
        {
            route: '/',
            homeIcon: true
        },
        {
            label: pupil?.pupil?.fullname,
            route: `/child/${query?.child_id}`
        },
        {
            label: 'Add an activity'
        }
    ];

    const onSave = (croppedImage) => {
        user?.getUser?.sharingAllowed == null && setPermissionModal(true);
        setPreviewImage(croppedImage);
    };

    return (
        <Formik
            initialValues={{ ...formInitialStates['otherActivity'] }}
            validationSchema={otherActivityValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { description } = values;

                    const files = [];

                    let file = previewImage && _getBase64ToFile(previewImage?.preview, filename);

                    if (file) files.push(file);

                    let saveOwnPupilActivityFeedbackMutationInput = {
                        pupilId: query?.child_id,
                        hasPhoto: previewImage ? true : false,
                        description,
                        sharingAllowedGlobal: permissionValues.sharingAllowedGlobal
                    };

                    if (user?.getUser?.sharingAllowed !== null) {
                        saveOwnPupilActivityFeedbackMutationInput['sharingAllowed'] = user?.getUser.sharingAllowed;
                    }

                    if (user?.getUser?.sharingAllowed == null) {
                        saveOwnPupilActivityFeedbackMutationInput['sharingAllowed'] = permissionValues.shareWithParent;
                    }

                    await saveOwnPupilActivityFeedbackMutation({
                        variables: {
                            file: files,
                            input: saveOwnPupilActivityFeedbackMutationInput
                        }
                    });
                    resetForm({ values: '' });
                    setPreviewImage(null);
                    callSnackbar('New activity created', 'success');
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <Form>
                    <div className="other-activity-container">
                        <Breadcrumb breadcrumbLists={breadcrumbLists} customClass="hide-on-mobile" />
                        <div className="other-activity-heading">
                            <Heading1 customClass="hide-on-mobile" text="Add your own activity" centerText />
                            <Paragraph text=" Tell your teacher about a different learning activity you did together." centerText />
                        </div>
                        <div className="other-activity-content">
                            <ActivityDescription
                                errors={errors}
                                touched={touched}
                                handleChange={handleChange}
                                handleBlur={handleBlur}
                                values={values}
                            />
                            <UploadImageCard
                                type={'OWN'}
                                setFileName={setFileName}
                                customClass="my10"
                                previewImage={previewImage?.preview}
                                setPreviewImage={setPreviewImage}
                                onSave={onSave}
                                child_name={pupil?.pupil?.firstname}
                            />
                        </div>
                        <div className="other-activity-btn-section">
                            <LWPButton btnText="Save and close" onClick={handleSubmit} loading={loading} />
                        </div>
                    </div>
                    <ConfirmationImageModal
                        open={permissionModal}
                        onSubmit={(e) => {
                            setPermissionModal(false);
                            setPermissionValues(e);
                        }}
                    />
                </Form>
            )}
        </Formik>
    );
};

OtherActivity.pageType = PageType.PARENT;
OtherActivity.pageTitle = 'Child: Other activity';

export default OtherActivity;
