import { gql, useMutation, useQuery } from '@apollo/client';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { updateModal } from '../../../graphQl/mutations';
import { unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import {
    _removeWhiteSpace,
    generateHTMLStringForActivityErrors,
    getStepsValue,
    isValid,
    PreSubmitStepWork,
    ThemeContext
} from '../../../shared/Services/handler';
import { editStaticModalFromAdminValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonFieldArrayForActivitySteps from '../../Shared/CommonFieldArrayForActivitySteps';
import CommonLoading from '../../Shared/CommonLoading';
import RenderHtml from '../../Shared/CommonRenderHtml';
import CommonSnackbar from '../../Shared/CommonSnackbar';
import InputField from '../../Shared/InputField/InputField';
import Heading2 from '../../Shared/Typography/Heading2';

// Queries

const getModalForAdmin = gql`
    query getModalForAdmin($id: String!) {
        getModalForAdmin(id: $id) {
            id
            name
            nameForContentDev
            steps {
                ... on StaticLwpActivityLegacy {
                    legacySteps {
                        id
                        order
                        stepType
                        text
                        imageUrl
                        downloadUrl
                        downloadName
                        linkUrl
                        linkName
                        properties
                        fontSize
                        fontType
                        textCarouselData
                        carouselData {
                            textEditorState
                            labelEditorState
                            type
                            imageUrl
                            alt
                            fileName
                            fileIdentifier
                        }
                        accordionData
                        checkListTextData
                        tableData
                        selectedModalId
                        fileName
                        editorState
                        timerData
                        btnType
                        imageCarouselData
                        checklistImageData
                        includeSeconds
                        clickableAlphabetData
                        dimensions
                        audioUrl
                        tabsData
                        editAsHtml
                    }
                }
            }
        }
    }
`;

const EditStaticModal = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();
    const [errorInfo, setErrorInfo] = useState(null);

    const { loading, error, data: modalData } = useQuery(getModalForAdmin, { variables: { id: queryParams?.modal_id } });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [updateModalMutation, { loading: updateModalLoading }] = useMutation(updateModal);

    if (loading) return <CommonLoading />;

    return (
        <Formik
            initialValues={{
                name: modalData?.getModalForAdmin?.name,
                nameForContentDev: modalData?.getModalForAdmin?.nameForContentDev,
                steps: modalData?.getModalForAdmin?.steps?.legacySteps
                    ? getStepsValue(modalData?.getModalForAdmin?.steps?.legacySteps ?? [])
                    : [],
                addStepType: sharedJson?.activity_step_types?.[0]?.key
            }}
            validateOnChange={false}
            validationSchema={editStaticModalFromAdminValidation}
            onSubmit={async (values) => {
                try {
                    let { name, steps, nameForContentDev } = values;

                    let files = [];

                    [steps, files] = PreSubmitStepWork(steps, files, true);

                    const updatedSteps = steps.map((item) => {
                        return {
                            ...item,
                            fontSize: +item?.fontSize
                        };
                    });

                    const errorMessages = isValid(steps);

                    if (errorMessages?.length > 0) {
                        setErrorInfo({ open: true, message: <RenderHtml text={generateHTMLStringForActivityErrors(errorMessages)} /> });
                    } else {
                        await updateModalMutation({
                            variables: {
                                file: [...files],
                                input: {
                                    id: queryParams?.modal_id,
                                    name: _removeWhiteSpace(name),
                                    nameForContentDev: nameForContentDev ? _removeWhiteSpace(nameForContentDev) : null,
                                    steps: updatedSteps
                                }
                            }
                        });
                        callSnackbar('Modal updated', 'success');
                    }
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, setFieldValue, setFieldTouched }) => {
                return (
                    <div className="teacher_detials activity_detail_for_admin edit-static-modal">
                        <div className="desktop-btn">
                            <LWPButton
                                btnText="Go back to modals"
                                startIcon="navigate_before"
                                color="inherit"
                                variant="text"
                                size="medium"
                                onClick={() => router?.push(`/admin/activity-modals`)}
                            />
                        </div>
                        <Heading2 text="Edit Modal" />
                        <InputField
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.name}
                            touched={true}
                            label="Modal Name"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <InputField
                            name="nameForContentDev"
                            value={values.nameForContentDev}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.nameForContentDev}
                            touched={true}
                            label="Name for content developers"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <CommonFieldArrayForActivitySteps
                            values={values}
                            handleChange={handleChange}
                            handleBlur={handleBlur}
                            setFieldTouched={setFieldTouched}
                            setFieldValue={setFieldValue}
                            errors={errors}
                        />
                        <br />
                        <LWPButton btnText="Update modal" onClick={handleSubmit} loading={updateModalLoading} />
                        {errorInfo?.open && (
                            <CommonSnackbar
                                message={errorInfo?.message}
                                type={'error'}
                                open={errorInfo?.open}
                                onClose={() => setErrorInfo(null)}
                            />
                        )}
                    </div>
                );
            }}
        </Formik>
    );
};

export default EditStaticModal;
