import { gql, useMutation, useQuery } from '@apollo/client';
import Card from '@mui/material/Card';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { saveDemoActivityFeedback } from '../../graphQl/mutations';
import { clearDemoActivityCookies, getCookie, setDemoActivityCookies } from '../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, STATUS_CODES, unexpectedError } from '../../shared/Constant';
import formInitialStates from '../../shared/formInitialStates';
import { _getBase64ToFile, _removeWhiteSpace, getActivityComponentName, getTopicType, ThemeContext } from '../../shared/Services/handler';
import { topicDemoActivityValidation } from '../../shared/validations';
import LinkExpiredPage from '../LinkExpiredPage';
import LinkInvalidPage from '../LinkInvalidPage';
import LWPButton from './../../components/Shared/Button/LWPButton';
import CommonActivityPreview from './../../components/Shared/CommonActivityPreview';
import CommonCheckBox from './../../components/Shared/CommonCheckBox';
import CommonLoading from './../../components/Shared/CommonLoading';
import RenderHtml from './../../components/Shared/CommonRenderHtml';
import DialogWrapper from './../../components/Shared/DialogWrapper';
import Divider from './../../components/Shared/Divider';
import MathScotWithBubbleText from './../../components/Shared/MathScotWithBubbleText';
import RenderStaticActivies from './../../components/Shared/StaticActivityViews/RenderStaticActivies';
import Paragraph from './../../components/Shared/Typography/Paragraph';
import CommentCard from './../PagesContent/CommentCard';
import RatingCard from './../Parent/Cards/RatingCard';
import UploadImageCard from './../Parent/Cards/UploadImageCard';

// Queries

const getDemoActivity = gql`
    query getDemoActivity($id: String!, $magicLink: String) {
        getDemoActivity(id: $id, magicLink: $magicLink) {
            id
            name
            starValue
            activityType
            welcomeMessage
            rationaleModal {
                id
            }
            details
            topic {
                id
                teacherTopicName
                isReading
            }
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
                        fontType
                        fontSize
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
                        setByTeacherData {
                            heading
                        }
                    }
                }
            }
        }
    }
`;

const ActivityDemo = () => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar, setHeaderTitle, setParentPath } = useContext(ThemeContext);
    const [customError, setCustomError] = useState('');
    const [customPermissionError, setCustomPermissionError] = useState('');
    const [filename, setFileName] = useState(null);
    const [showPolicy, setShowPolicy] = useState(false);
    const [privatePolicyData, setPrivatePolicyData] = useState('');
    const [showPhotoPermission, setShowPhotoPermission] = useState(true);
    const [showLinkInvalidPage, setShowLinkInvalidPage] = useState(false);
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState(false);

    const [saveDemoActivityFeedbackMutation, { loading: saveDemoActivityFeedbackLoading }] = useMutation(saveDemoActivityFeedback);

    const {
        loading: getDemoActivityIsLoading,
        error: getDemoActivityError,
        data: demoActivity
    } = useQuery(getDemoActivity, {
        variables: {
            id: queryParams?.activity_id,
            magicLink: searchParams.get('magicLink')
        },
        skip: !queryParams?.activity_id
    });

    const fetchData = () => {
        fetch('https://learningwithparents.com/wp-json/wp/v2/snippets')
            .then((response) => response.json())
            .then((data) => {
                setPrivatePolicyData(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    useEffect(() => {
        setParentPath(`/topicdemo/${demoActivity?.getDemoActivity?.topic?.id}?magicLink=${searchParams.get('magicLink')}`);
        setHeaderTitle(demoActivity?.getDemoActivity?.name);
    }, [demoActivity]);

    useEffect(() => {
        showPolicy && fetchData();
    }, [showPolicy]);

    useEffect(() => {
        const cookie = getCookie('remember_settings');

        if (!cookie) {
            setShowPhotoPermission(true);
        } else {
            setShowPhotoPermission(false);
        }
    }, []);

    useEffect(() => {
        const statusCode =
            getDemoActivityError?.graphQLErrors?.[0]?.extensions?.exception?.status || getDemoActivityError?.networkError?.statusCode;

        if (statusCode === STATUS_CODES.INVALID_MAGIC_LINK) {
            setShowLinkInvalidPage(true);
        } else if (statusCode === STATUS_CODES.EXPIRED_MAGIC_LINK) {
            setShowLinkExpiredPage(true);
        } else {
            getDemoActivityError?.message && callSnackbar(getDemoActivityError, 'error');
        }
    }, [getDemoActivityError]);

    const customErrorSetup = (values) => {
        const { parentComment, pupilComment, photo } = values;

        if (parentComment || pupilComment || photo) {
            setCustomError('');
        }
    };

    if (getDemoActivityIsLoading) return <CommonLoading />;

    if (showLinkInvalidPage) return <LinkInvalidPage />;

    if (showLinkExpiredPage) return <LinkExpiredPage />;

    return (
        <Formik
            initialValues={{
                ...formInitialStates['demoActivityFeedback'],
                shareGlobal: getCookie('share_global') ? getCookie('share_global') === 'true' : false,
                shareWithParents: getCookie('share_with_parents') ? getCookie('share_with_parents') === 'true' : false,
                rememberSettings: getCookie('remember_settings') ? getCookie('remember_settings') === 'true' : false
            }}
            validationSchema={topicDemoActivityValidation}
            onSubmit={async (values) => {
                try {
                    let { parentComment, pupilComment, rating, shareGlobal, shareWithParents, rememberSettings } = values;

                    parentComment = _removeWhiteSpace(parentComment);
                    pupilComment = _removeWhiteSpace(pupilComment);

                    if (!parentComment && !pupilComment && !values.photo) return setCustomError('This field is required.');
                    else setCustomError('');

                    if (!shareWithParents) return setCustomPermissionError('This field is required');
                    else setCustomPermissionError('');

                    if (rememberSettings) {
                        setDemoActivityCookies(shareGlobal, shareWithParents, rememberSettings);
                    } else {
                        clearDemoActivityCookies();
                    }

                    const files = [];

                    const file = values.photo ? _getBase64ToFile(values.photo?.preview, filename) : null;

                    if (file) files.push(file);

                    let demoActivityFeedbackInput = {
                        staticActivityId: queryParams?.activity_id,
                        rating: +rating,
                        parentComment,
                        pupilComment,
                        sharingAllowed: shareWithParents && shareGlobal
                    };

                    await saveDemoActivityFeedbackMutation({
                        variables: {
                            file: files,
                            input: demoActivityFeedbackInput
                        }
                    });
                    callSnackbar('Comments have been saved', 'success');
                    setShowPhotoPermission(false);
                    router?.push({
                        pathname: `/topicdemo/${demoActivity?.getDemoActivity?.topic?.id}`,
                        query: searchParams.get('magicLink') ? { magicLink: searchParams.get('magicLink') } : {}
                    });
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
            {({ values, handleChange, handleSubmit, errors, touched }) => {
                return (
                    <div className="view-activity-container">
                        <MathScotWithBubbleText
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-child.png`}
                            bubbleText={demoActivity?.getDemoActivity?.welcomeMessage}
                        />
                        {demoActivity?.getDemoActivity?.activityType === 'STATIC' ? (
                            <RenderStaticActivies
                                activityComponentName={getActivityComponentName(demoActivity?.getDemoActivity?.details)}
                                type={getTopicType(demoActivity?.getDemoActivity?.topic?.isReading)}
                                readOnly={true}
                            />
                        ) : (
                            <CommonActivityPreview activity={demoActivity?.getDemoActivity} readOnly={true} />
                        )}
                        <div className="rating-comments-upload-container">
                            <Form>
                                <RatingCard value={values.rating} setValue={handleChange} isDemo={true} isActivity={true} />
                                <CommentCard
                                    name="parentComment"
                                    onChange={(e) => {
                                        handleChange({ target: { name: 'parentComment', value: e.target.value } });
                                        customErrorSetup(values);
                                    }}
                                    value={values.parentComment}
                                    error={errors.parentComment || customError}
                                    touched={touched.parentComment || customError}
                                    type={getTopicType(demoActivity?.getDemoActivity?.topic?.isReading)}
                                    sideImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/adult-mathscot.png`}
                                    textBoxImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/adult-mathscot.png`}
                                    title={'Family'}
                                    label={`What did your child enjoy or do well in this activity?`}
                                />
                                <CommentCard
                                    name="pupilComment"
                                    onChange={(e) => {
                                        handleChange({ target: { name: 'pupilComment', value: e.target.value } });
                                        customErrorSetup(values);
                                    }}
                                    value={values.pupilComment}
                                    error={errors.pupilComment || customError}
                                    touched={touched.pupilComment || customError}
                                    type={getTopicType(demoActivity?.getDemoActivity?.topic?.isReading)}
                                    title={'Pupil'}
                                    label="What did you find easy or hard? Let your teacher know!"
                                    helperText="I enjoyed beating my sister at this game!"
                                    sideImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`}
                                    textBoxImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`}
                                />
                                <UploadImageCard
                                    skipPresignedUrl
                                    child_name={'your pupil'}
                                    type={getTopicType(demoActivity?.getDemoActivity?.topic?.isReading)}
                                    setFileName={setFileName}
                                    previewImage={values.photo?.preview}
                                    error={errors.photo || customError}
                                    touched={touched.photo || customError}
                                    onClose={() => handleChange({ target: { name: 'photo', value: '' } })}
                                    onSave={(croppedImage) => {
                                        handleChange({ target: { name: 'photo', value: croppedImage } });
                                    }}
                                />
                                {showPhotoPermission && (
                                    <Card
                                        className={`demo-activity-photo-permission-card ${getTopicType(
                                            demoActivity?.getDemoActivity?.topic?.isReading
                                        )}-bg`}>
                                        <CommonCheckBox
                                            name="shareWithParents"
                                            checked={values.shareWithParents}
                                            error={errors.shareWithParents || customPermissionError}
                                            touched={touched.shareWithParents || customPermissionError}
                                            onChange={handleChange}
                                            className="mt8">
                                            I am happy to share these comments and photos with Learning with Parents and their partners for
                                            internal use. Learning with Parents will store the data in line with the terms of their{' '}
                                            <u
                                                onClick={() => {
                                                    setShowPolicy(!showPolicy);
                                                }}>
                                                privacy policy
                                            </u>
                                            .
                                        </CommonCheckBox>
                                        <CommonCheckBox
                                            name="shareGlobal"
                                            checked={values.shareGlobal}
                                            error={errors.shareGlobal}
                                            touched={touched.shareGlobal}
                                            onChange={handleChange}
                                            label="I give permission for Learning with Parents and their partners to use this image in marketing materials and on other social media. In all cases we will never disclose your name or contact details when we use the photograph."
                                            className="mt8"
                                        />

                                        <Divider customClass="my10" />

                                        <CommonCheckBox
                                            name="rememberSettings"
                                            checked={values.rememberSettings}
                                            error={errors.rememberSettings}
                                            touched={touched.rememberSettings}
                                            onChange={handleChange}
                                            label="Remember these settings on this device. I agree to these terms for all comments and photos I share with Learning with Parents."
                                            className="mb10"
                                        />
                                    </Card>
                                )}
                                {!showPhotoPermission && (
                                    <Card className="demo-activity-photo-permission-update-card">
                                        <Paragraph>
                                            You have agreed to share comments and photos with Learning with Parents and partners for
                                            internal use only.{' '}
                                            <u
                                                className="update-link"
                                                data-test="update-photo-permission-link"
                                                onClick={() => {
                                                    setShowPhotoPermission(true);
                                                }}>
                                                Click here to update this
                                            </u>
                                            .
                                        </Paragraph>
                                    </Card>
                                )}
                                <div className="save_comment_btn_wrapper">
                                    <LWPButton btnText="Save comments" onClick={handleSubmit} loading={saveDemoActivityFeedbackLoading} />
                                </div>
                            </Form>
                        </div>
                        <DialogWrapper open={showPolicy} setOpen={() => setShowPolicy(!showPolicy)} contentWidth="750px">
                            {privatePolicyData?.length ? (
                                <>
                                    <h1>Privacy Policy</h1>
                                    <RenderHtml
                                        text={(privatePolicyData || [])
                                            .filter((data) => data?.title.rendered === 'Privacy and data protection')
                                            .map((data) => data?.content.rendered)}
                                    />
                                </>
                            ) : (
                                <CommonLoading />
                            )}
                        </DialogWrapper>
                    </div>
                );
            }}
        </Formik>
    );
};

export default ActivityDemo;
