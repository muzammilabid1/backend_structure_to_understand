import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Formik } from 'formik';
import gql from 'graphql-tag';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { updatePupil } from '../../../graphQl/mutations';
import { PARENT, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _removeWhiteSpace, getChildRoute, ThemeContext } from '../../../shared/Services/handler';
import { updateChildValidation } from '../../../shared/validations';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import LWPButton from './../../Shared/Button/LWPButton';
import InputField from './../../Shared/InputField/InputField';
import ParentAndCarersTable from './../../Shared/ParentAndCarersTable';
import Heading1 from './../../Shared/Typography/Heading1';

// Queries
const getPupilbyIdForChildSettings = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            firstname
            lastname
            type
            currentClass {
                name
                yearGroup {
                    year
                }
                mainTeacher {
                    nameForChildren
                }
            }
        }
    }
`;

const ChildSettings = () => {
    const { setHeaderTitle, callSnackbar, setParentPath } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();

    const { error: error, data: child } = useQuery(getPupilbyIdForChildSettings, {
        variables: { id: queryParams?.child_id }
    });

    const [updateChild, { loading }] = useMutation(updatePupil);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        setHeaderTitle('Child details');
        setParentPath(getChildRoute(child?.pupil));
    }, []);

    return (
        <Formik
            initialValues={
                child?.pupil
                    ? {
                          firstname: child?.pupil?.firstname,
                          lastname: child?.pupil?.lastname
                      }
                    : formInitialStates['updateChild']
            }
            enableReinitialize
            validationSchema={updateChildValidation}
            onSubmit={async (values) => {
                try {
                    const { firstname, lastname } = values;

                    await updateChild({
                        variables: {
                            input: {
                                firstname: _removeWhiteSpace(firstname),
                                lastname: _removeWhiteSpace(lastname),
                                id: queryParams?.child_id
                            }
                        },
                        refetchQueries: [{ query: getPupilbyIdForChildSettings, variables: { id: queryParams?.child_id } }]
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <div className="setting-container">
                    <div className="desktop-btn">
                        <LWPButton
                            btnText="Go back"
                            startIcon="navigate_before"
                            color="inherit"
                            variant="text"
                            size="medium"
                            onClick={() => router?.push(getChildRoute(child?.pupil))}
                        />
                    </div>
                    <Heading1
                        dataTest="child-settings-page-heading"
                        text={`${child?.pupil?.firstname}’s details`}
                        centerText
                        customClass="main-heading"
                    />
                    <div className="setting-section">
                        <div className="setting-content">
                            <>
                                <InputField
                                    label="First name"
                                    type="text"
                                    name="firstname"
                                    value={values.firstname}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.firstname}
                                    touched={touched.firstname}
                                    md={8}
                                    lg={8}
                                />
                                <InputField
                                    label="Last name"
                                    type="text"
                                    name="lastname"
                                    value={values.lastname}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.lastname}
                                    touched={touched.lastname}
                                    md={8}
                                    lg={8}
                                />
                                <LWPButton loading={loading} btnText="Update name" onClick={handleSubmit} />
                            </>

                            {child?.pupil?.currentClass?.name && (
                                <div className="class_details">
                                    <Heading1 text="Class details" />
                                    <Heading3 text="Class details" />
                                    <Paragraph
                                        text={`${child?.pupil?.currentClass?.name} (${child?.pupil?.currentClass?.yearGroup?.year})`}
                                    />
                                    <Heading3 text="Year group" />
                                    <Paragraph text={child?.pupil?.currentClass?.yearGroup?.year} />
                                    <Heading3 text="Main class teacher" />
                                    <Paragraph
                                        text={
                                            child?.pupil?.currentClass?.mainTeacher?.nameForChildren
                                                ? `${child?.pupil?.currentClass?.mainTeacher?.nameForChildren}`
                                                : '-'
                                        }
                                    />
                                </div>
                            )}

                            <ParentAndCarersTable child_id={queryParams?.child_id} viewType={PARENT} />
                        </div>
                    </div>
                </div>
            )}
        </Formik>
    );
};

export default ChildSettings;
