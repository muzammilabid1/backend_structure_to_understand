import { gql, useMutation, useQuery } from '@apollo/client';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, Grid } from '@mui/material';
import { Form, Formik } from 'formik';
import { SubjectProgrammeType } from 'lwp-shared';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { updateTopic } from '../../../graphQl/mutations';
import { getAllTopicDomains, getSchoolTagsForAdmin, getTopicForAdmin, getTopicTagsForAdmin } from '../../../graphQl/queries';
import { TV_IMAGE, unexpectedError } from '../../../shared/Constant';
import { detectDataUriFile, ThemeContext } from '../../../shared/Services/handler';
import { addTopicFromAdminValidation } from '../../../shared/validations';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import ChildCard from '../../Shared/Cards/ChildCard';
import VideoCard from '../../Shared/Cards/VideoCard';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonFileUpload from '../../Shared/CommonFileUpload';
import CommonLoading from '../../Shared/CommonLoading';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonTag from '../../Shared/CommonTag';
import DialogWrapper from '../../Shared/DialogWrapper';
import DateField from '../../Shared/InputField/DateField';
import InputField from '../../Shared/InputField/InputField';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading2 from '../../Shared/Typography/Heading2';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import UpdateTopicModal from '../../Teacher/Modals/UpdateTopicModal';

// Mutations

const generateDemoTopicMagicLink = gql`
    mutation generateDemoTopicMagicLink($topicId: String!, $expiryTime: DateTime) {
        generateDemoTopicMagicLink(topicId: $topicId, expiryTime: $expiryTime) {
            url
            expiryTime
        }
    }
`;

const deleteTopic = gql`
    mutation deleteTopic($id: String!) {
        deleteTopic(id: $id) {
            status
            msg
        }
    }
`;

// Queries

const getDefaultDemoTopicMagicLinkExpiry = gql`
    query getDefaultDemoTopicMagicLinkExpiry {
        getDefaultDemoTopicMagicLinkExpiry
    }
`;

const Details = ({ topic_id, setClassName }) => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [pdfFileName, setPdfFileName] = useState(null);
    const [resourceFileName, setResourceFileName] = useState(null);
    const [demoTopicLink, setDemoTopicLink] = useState({});
    const [demoLinkEarliestExpiry] = useState(() => moment().startOf('day').toDate());
    const [demoLinkDefaultExpiry, setDemoLinkDefaultExpiry] = useState(null);
    const [demoLinkExpiry, setDemoLinkExpiry] = useState(null);
    const [topicLink, setTopicLink] = useState(false);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const { error: domainError, data: topicDomains } = useQuery(getAllTopicDomains);

    const { loading: getTopicIsLoading, error, data: topic } = useQuery(getTopicForAdmin, { variables: { id: topic_id } });

    const { error: topicTagsError, data: topicTagsData } = useQuery(getTopicTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    const { error: schoolTagsError, data: schoolTagsData } = useQuery(getSchoolTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    const {
        loading: defaultDemoLinkExpiryLoading,
        error: defaultDemoLinkExpiryError,
        data: defaultDemoLinkExpiryData
    } = useQuery(getDefaultDemoTopicMagicLinkExpiry);

    const [updateTopicMutation, { loading: updateTopicIsLoading, error: updateTopicError }] = useMutation(updateTopic, {
        refetchQueries: [{ query: getTopicForAdmin, variables: { id: topic_id } }],
        awaitRefetchQueries: true
    });

    const isDraft = topic?.getTopicForAdmin?.isPublished == false;

    const [deleteTopicMutation, { loading: deleteTopicLoading }] = useMutation(deleteTopic);

    const [generateDemoTopicMagicLinkMutation, { loading: generateDemoTopicMagicLinkLoading }] = useMutation(generateDemoTopicMagicLink);

    useEffect(() => {
        topic && setClassName({ name: topic?.getTopicForAdmin?.teacherTopicName });
    }, [topic, isDraft]);

    useEffect(() => {
        domainError?.message && callSnackbar(domainError, 'error');
        error?.message && callSnackbar(error, 'error');
        updateTopicError?.message && callSnackbar(updateTopicError, 'error');
        topicTagsError?.message && callSnackbar(topicTagsError, 'error');
        schoolTagsError?.message && callSnackbar(schoolTagsError, 'error');
        defaultDemoLinkExpiryError?.message && callSnackbar(defaultDemoLinkExpiryError, 'error');
    }, [updateTopicError, domainError, error, topicTagsError, schoolTagsError, defaultDemoLinkExpiryError]);

    // The admin picks any expiry from today onwards, but the field starts on the one the
    // backend would apply by itself, so generating a link without a thought is unchanged.
    useEffect(() => {
        if (!defaultDemoLinkExpiryData?.getDefaultDemoTopicMagicLinkExpiry) return;

        const defaultExpiry = moment(defaultDemoLinkExpiryData.getDefaultDemoTopicMagicLinkExpiry).toDate();

        setDemoLinkDefaultExpiry(defaultExpiry);
        setDemoLinkExpiry(defaultExpiry);
    }, [defaultDemoLinkExpiryData]);

    const domainAndYearGroupIdsOptions = [];
    const initailDomainAndYearGroupIds = topic?.getTopicForAdmin?.domainsAndYearGroups?.map((item) => ({
        value: `${item?.yearGroup?.year}: ${item?.domain?.title}`,
        id: `${item?.domain?.id}${item?.yearGroup?.id}`,
        subject: item?.domain?.subject?.name,
        domainId: item?.domain?.id,
        yearGroupId: item?.yearGroup?.id,
        isReadyTeddyDomain: item?.domain?.subject?.programmeType === SubjectProgrammeType.READY_TEDDY
    }));

    const allDomains = topicDomains?.allTopicDomains || [];

    allDomains.forEach((domain) => {
        domain.yearGroups.forEach((yearGroup) => {
            const option = {
                value: `${yearGroup.year}: ${domain.title}`,
                id: `${domain.id}${yearGroup.id}`,
                subject: domain?.subject?.name,
                domainId: domain.id,
                yearGroupId: yearGroup.id,
                isReadyTeddyDomain: domain?.subject?.programmeType === SubjectProgrammeType.READY_TEDDY
            };

            domainAndYearGroupIdsOptions.push(option);
        });
    });

    const isReadyTeddyDomainSelected = (value) => value?.some((item) => item?.isReadyTeddyDomain);

    const warningText = topic?.getTopicForAdmin?.isHidden
        ? { text: 'This topic is currently not offer to teacher', color: '#FFF6D9', iconColor: '#F28D00' }
        : topic?.getTopicForAdmin?.schoolTags?.length > 0
          ? { text: 'This topic is currently limited release', color: '#E5F3FA', iconColor: '#39B0E2' }
          : topic?.getTopicForAdmin?.isPublished
            ? { text: 'This topic is currently available', color: '#EDF6E6', iconColor: '#7F972A' }
            : { text: 'This topic is currently draft', color: '#E3E3E3', iconColor: '#525252' };

    if (getTopicIsLoading) return <CommonLoading />;

    return (
        <div>
            <Alert
                icon={
                    <HelpOutlineIcon
                        sx={{
                            color: warningText?.iconColor
                        }}
                    />
                }
                sx={{
                    backgroundColor: warningText?.color
                }}
                severity="warning">
                {warningText?.text}
            </Alert>
            <br />

            <Formik
                initialValues={{
                    teacherTopicName: topic?.getTopicForAdmin?.teacherTopicName,
                    topicTags:
                        topic?.getTopicForAdmin?.tags?.map((tags) => ({ key: tags?.id, value: tags?.name, color: tags?.color })) ?? [],
                    domainAndYearGroupIds: initailDomainAndYearGroupIds,
                    video: topic?.getTopicForAdmin?.video?.slice(31),
                    teacherDescription: topic?.getTopicForAdmin?.teacherDescription,
                    isDemo: topic?.getTopicForAdmin?.isDemo,
                    isHidden: topic?.getTopicForAdmin?.isHidden,
                    isTeacherPdfRequired: topic?.getTopicForAdmin?.isTeacherPdfRequired,
                    videoThumb: topic?.getTopicForAdmin?.videoThumb,
                    videoThumbId: null,
                    teacherPdf: topic?.getTopicForAdmin?.teacherPdf,
                    teacherPdfId: null,
                    teacherResource: topic?.getTopicForAdmin?.teacherResource,
                    teacherResourceId: null,
                    parentTopicName: topic?.getTopicForAdmin?.parentTopicName?.length > 0 ? topic?.getTopicForAdmin?.parentTopicName : null,
                    teacherEmailBody: topic?.getTopicForAdmin?.teacherEmailBody,
                    limitedRelease: topic?.getTopicForAdmin?.schoolTags?.length > 0 ? true : false,
                    schoolTags:
                        topic?.getTopicForAdmin?.schoolTags?.map((tags) => ({ key: tags?.id, value: tags?.name, color: tags?.color })) ??
                        [],
                    isPublished: topic?.getTopicForAdmin?.isPublished,
                    scrapbookPrompt: topic?.getTopicForAdmin?.scrapbookPrompt,
                    noVideo: topic?.getTopicForAdmin?.noVideo ?? false
                }}
                validationSchema={addTopicFromAdminValidation}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        const { videoThumb, teacherPdf, teacherResource, video, domainAndYearGroupIds, topicTags, schoolTags, ...rest } =
                            values;

                        let files = [];
                        const videoThumbFile = detectDataUriFile(videoThumb, filename, values?.videoThumbId);
                        const pdfFile = detectDataUriFile(teacherPdf, pdfFileName, values?.teacherPdfId);
                        const resourceFile = detectDataUriFile(teacherResource, resourceFileName, values?.teacherResourceId);

                        if (videoThumbFile) files.push(videoThumbFile);
                        if (pdfFile) files.push(pdfFile);
                        if (resourceFile) files.push(resourceFile);

                        const domainAndYear = domainAndYearGroupIds?.map((itme) => ({
                            domainId: itme?.domainId,
                            yearGroupId: itme?.yearGroupId
                        }));

                        const topicTagId = topicTags?.map((tag) => tag.key);
                        const schoolTagId = rest?.limitedRelease ? schoolTags?.map((tag) => tag.key) : [];

                        await updateTopicMutation({
                            variables: {
                                file: files,
                                input: {
                                    id: topic_id,
                                    hasVideoThumb: videoThumb ? true : false,
                                    hasTeacherPdf: teacherPdf ? true : false,
                                    hasTeacherResource: teacherResource ? true : false,
                                    video: video ? video?.toString() : null,
                                    domainAndYearGroupIds: domainAndYear,
                                    topicTagId,
                                    schoolTagId,
                                    teacherTopicName: rest?.teacherTopicName,
                                    teacherDescription: rest?.teacherDescription,
                                    isDemo: rest?.isDemo,
                                    isHidden: rest?.isHidden,
                                    isTeacherPdfRequired: rest?.isTeacherPdfRequired,
                                    videoThumbId: rest?.videoThumbId,
                                    teacherPdfId: rest?.teacherPdfId,
                                    teacherResourceId: rest?.teacherResourceId,
                                    parentTopicName: rest?.parentTopicName,
                                    teacherEmailBody: rest?.teacherEmailBody,
                                    isPublished: rest?.isPublished,
                                    noVideo: rest?.noVideo,
                                    scrapbookPrompt: isReadyTeddyDomainSelected(domainAndYearGroupIds) ? rest?.scrapbookPrompt : null
                                }
                            }
                        });
                        callSnackbar('Change saved!', 'success');
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
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue }) => (
                    <Form className="topic_details admin_topic_details" onSubmit={(e) => e.preventDefault()}>
                        <InputField
                            name="teacherTopicName"
                            value={values.teacherTopicName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.teacherTopicName}
                            touched={touched.teacherTopicName}
                            label="Teacher topic name"
                            type="text"
                            md={6}
                            lg={6}
                        />

                        <CommonMultiSelect
                            name="domainAndYearGroupIds"
                            label="Domain and YearGroup"
                            value={values.domainAndYearGroupIds}
                            displayEmpty
                            shrink={values.domainAndYearGroupIds}
                            error={errors.domainAndYearGroupIds}
                            touched={touched.domainAndYearGroupIds}
                            options={domainAndYearGroupIdsOptions}
                            onChange={(value) => {
                                handleChange({
                                    target: { name: 'domainAndYearGroupIds', value }
                                });
                                if (!isReadyTeddyDomainSelected(value)) setFieldValue('scrapbookPrompt', '');
                            }}
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'domainAndYearGroupIds', value }
                                })
                            }
                        />

                        {isReadyTeddyDomainSelected(values.domainAndYearGroupIds) ? (
                            <InputField
                                name="scrapbookPrompt"
                                value={values.scrapbookPrompt}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.scrapbookPrompt}
                                touched={touched.scrapbookPrompt}
                                label="Scrapbook prompt"
                                inputComponent={'textarea'}
                                md={12}
                                lg={12}
                                endIcon={'visibility'}
                                endIconHandler={() => setOpenModal(true)}
                            />
                        ) : null}

                        <CommonMultiSelect
                            value={values.topicTags}
                            options={(topicTagsData?.getTopicTagsForAdmin || [])?.map((tag) => ({
                                value: tag.name,
                                key: tag.id,
                                color: tag.color
                            }))}
                            label="Topic tags"
                            name="topicTags"
                            error={errors.topicTags}
                            touched={touched.topicTags}
                            md={6}
                            lg={6}
                            onChange={(value) =>
                                handleChange({
                                    target: { name: 'topicTags', value: value }
                                })
                            }
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'topicTags', value: value }
                                })
                            }
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                ))
                            }
                        />

                        <InputField
                            name="parentTopicName"
                            value={values.parentTopicName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.parentTopicName}
                            touched={touched.parentTopicName}
                            label="Parent topic name"
                            type="text"
                            md={12}
                            lg={12}
                        />

                        <InputField
                            name="teacherEmailBody"
                            value={values.teacherEmailBody}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.teacherEmailBody}
                            touched={touched.teacherEmailBody}
                            label="Teacher email body"
                            type="text"
                            inputComponent={'textarea'}
                            md={12}
                            lg={12}
                        />

                        <InputField
                            name="teacherDescription"
                            label="Teacher description"
                            value={values.teacherDescription}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.teacherDescription}
                            touched={touched.teacherDescription}
                            inputComponent={'textarea'}
                            md={12}
                            lg={12}
                            endIcon={'visibility'}
                            endIconHandler={() => setOpenModal(true)}
                        />

                        {!values.noVideo && (
                            <InputField
                                name="video"
                                value={values.video}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.video}
                                touched={touched.video}
                                label="Video ID"
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                md={6}
                                lg={6}
                            />
                        )}

                        {topic?.getTopicForAdmin?.isDemo && (
                            <>
                                <Link passHref href={`/topicdemo/${topic_id}`}>
                                    {'Preview topic demo'}
                                </Link>
                                <br />
                                <br />
                            </>
                        )}

                        {values?.teacherPdf && (
                            <>
                                <CommonCheckBox
                                    name="isTeacherPdfRequired"
                                    checked={values.isTeacherPdfRequired}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    label="Is teacher pdf required"
                                    error={errors.isTeacherPdfRequired}
                                    touched={touched.isTeacherPdfRequired}
                                />
                            </>
                        )}

                        <Grid container className="thumbnail_image_container">
                            <Grid item xs={12} md={6} lg={6}>
                                <div className="topic_image">
                                    <Paragraph text="Topic image" />
                                    <CommonIconButton
                                        toolTipTitle="This image is displayed on the topic card on the pupil homepage"
                                        icon="info"
                                    />
                                </div>

                                <CommonFileUpload
                                    name="'videoThumb'"
                                    previewImage={values.videoThumb}
                                    icon="folder"
                                    onSetFileName={(fileName) => setFileName(fileName)}
                                    onSetFileID={(id) => handleChange({ target: { name: 'videoThumbId', value: id } })}
                                    onClose={() => handleChange({ target: { name: 'videoThumb', value: '' } })}
                                    onSave={(croppedImage) => {
                                        handleChange({ target: { name: 'videoThumb', value: croppedImage } });
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <br />

                        <Grid container className="thumbnail_image_container">
                            <Grid item xs={12} md={6} lg={6}>
                                <CommonFileUpload
                                    name="'teacherPdf'"
                                    previewImage={values.teacherPdf}
                                    icon="folder"
                                    heading="Teacher PDF"
                                    onSetFileName={(fileName) => setPdfFileName(fileName)}
                                    onSetFileID={(id) => handleChange({ target: { name: 'teacherPdfId', value: id } })}
                                    onClose={() => handleChange({ target: { name: 'teacherPdf', value: '' } })}
                                    onSave={(croppedImage) => {
                                        handleChange({ target: { name: 'teacherPdf', value: croppedImage } });
                                    }}
                                    accept="application/pdf"
                                />
                            </Grid>
                        </Grid>

                        {topic?.getTopicForAdmin?.teacherPdf && (
                            <LWPButton
                                btnText="Download PDF"
                                startIcon="download"
                                customClass={`mt8 ${values?.video && 'download-btn'}`}
                                onClick={() => {
                                    window.location.href = topic?.getTopicForAdmin?.teacherPdf;
                                }}
                            />
                        )}

                        <Grid container className="thumbnail_image_container" mt={3}>
                            <Grid item xs={12} md={6} lg={6}>
                                <CommonFileUpload
                                    name="teacherResource"
                                    previewImage={values.teacherResource}
                                    icon="folder"
                                    heading="Teacher resource"
                                    onSetFileName={(fileName) => setResourceFileName(fileName)}
                                    onSetFileID={(id) => handleChange({ target: { name: 'teacherResourceId', value: id } })}
                                    onClose={() => handleChange({ target: { name: 'teacherResource', value: '' } })}
                                    onSave={(croppedImage) => {
                                        handleChange({ target: { name: 'teacherResource', value: croppedImage } });
                                    }}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                                />
                                <Paragraph text="This will be sent out to teachers the week before a topic is released." />
                            </Grid>
                        </Grid>

                        {topic?.getTopicForAdmin?.teacherResource && (
                            <LWPButton
                                btnText="Download teacher resource"
                                startIcon="download"
                                customClass={`mt8 ${values?.video && 'download-btn'}`}
                                onClick={() => {
                                    window.location.href = topic?.getTopicForAdmin?.teacherResource;
                                }}
                            />
                        )}

                        <Grid container alignItems={'center'} spacing={2} mt={1} mb={3}>
                            {!values?.noVideo && values?.video ? (
                                <Grid item lg={4} md={6} sm={6} xs={12}>
                                    <VideoCard customClass controls={true} videoId={values?.video} />
                                </Grid>
                            ) : null}

                            <Grid item lg={3} md={6} sm={6} xs={12}>
                                <Heading3 text="Preview card" customClass="topic_settings" />

                                <ChildCard
                                    key={1}
                                    activeBorder
                                    heading={values?.parentTopicName?.length > 0 ? values?.parentTopicName : values?.teacherTopicName}
                                    childName={values?.parentTopicName?.length > 0 ? values?.parentTopicName : values?.teacherTopicName}
                                    childImg={values.videoThumb}
                                    videoLink={!values?.noVideo && values?.video ? `https://player.vimeo.com/video/${values.video}` : null}
                                    tv={TV_IMAGE}
                                    type={'TOPIC'}
                                    lg
                                    md
                                    sm
                                    xs
                                />
                            </Grid>
                        </Grid>
                        <Heading3 text="Topic settings" customClass="topic_settings" />

                        <CommonCheckBox
                            name="isDemo"
                            checked={values.isDemo}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Demo"
                            error={errors.isDemo}
                            touched={touched.isDemo}
                        />

                        <CommonCheckBox
                            name="isHidden"
                            checked={values.isHidden}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Not offered to teacher"
                            error={errors.isHidden}
                            touched={touched.isHidden}
                        />

                        <CommonCheckBox
                            name="noVideo"
                            checked={values.noVideo}
                            onChange={(e) => {
                                handleChange(e);
                                if (e.target.checked) setFieldValue('video', null);
                            }}
                            onBlur={handleBlur}
                            label="No video content"
                            error={errors.noVideo}
                            touched={touched.noVideo}
                        />

                        <CommonCheckBox
                            label="Limited release"
                            name="limitedRelease"
                            checked={values.limitedRelease}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.limitedRelease}
                            touched={touched.limitedRelease}
                        />

                        {values.limitedRelease && (
                            <>
                                <br />
                                <CommonMultiSelect
                                    value={values.schoolTags}
                                    options={(schoolTagsData?.getSchoolTagsForAdmin || [])?.map((tag) => ({
                                        value: tag.name,
                                        key: tag.id,
                                        color: tag.color
                                    }))}
                                    label="School tags"
                                    name="schoolTags"
                                    error={errors.schoolTags}
                                    touched={touched.schoolTags}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'schoolTags', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'schoolTags', value: value }
                                        })
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                        ))
                                    }
                                />
                            </>
                        )}

                        <div className="topic-details-btn-container">
                            <Grid container gap={3}>
                                {isDraft && (
                                    <LWPButton
                                        btnText="Save draft"
                                        color="inherit"
                                        onClick={() => {
                                            setFieldValue('isPublished', false);
                                            handleSubmit();
                                        }}
                                        disabled={updateTopicIsLoading}
                                    />
                                )}
                                <LWPButton
                                    btnText={isDraft ? 'Publish' : 'Update details'}
                                    onClick={() => {
                                        setFieldValue('isPublished', true);
                                        handleSubmit();
                                    }}
                                    disabled={updateTopicIsLoading}
                                />
                            </Grid>
                            <LWPButton
                                customClass="remove-topic-btn"
                                btnText="Delete topic"
                                onClick={() => setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal)}
                            />
                        </div>

                        {openDeleteItemConfirmationModal && (
                            <ConfirmationModal
                                open={openDeleteItemConfirmationModal}
                                onCancel={() => setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal)}
                                onConfirm={() => {
                                    deleteTopicMutation({
                                        variables: { id: topic_id }
                                    })
                                        .then(() => {
                                            callSnackbar('Topic deleted successfully!', 'success');
                                            setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal);
                                            router?.push(`/admin/topics`);
                                        })
                                        .catch(({ ...err }) => {
                                            callSnackbar(err, 'error');
                                            setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal);
                                        });
                                }}
                                loading={deleteTopicLoading}
                                heading="Delete Topic">
                                Are you sure you want to delete this topic?
                            </ConfirmationModal>
                        )}

                        {!isDraft && (
                            <div className="mt6">
                                <LWPButton
                                    btnText="Create link for setting topic"
                                    onClick={() => {
                                        setTopicLink(true);
                                    }}
                                />
                            </div>
                        )}

                        <DialogWrapper
                            className="reset_password_modal"
                            open={topicLink}
                            setOpen={() => setTopicLink(false)}
                            contentWidth="768px"
                            heading="Link for setting topic">
                            <Paragraph customClass="title" text={`Use this link in emails to teachers for setting the topic.`} />
                            <CopyToClipboard
                                text={`${location.protocol}//${location.host}/set-topic/${topic_id}`}
                                onCopy={() => {
                                    callSnackbar('Link copied!', 'success');
                                }}>
                                <div className="reset_pwd_link_contain">
                                    <Paragraph text={`${location.protocol}//${location.host}/set-topic/${topic_id}`} />
                                    <span className="material-icons icon">content_copy</span>
                                </div>
                            </CopyToClipboard>
                            <div className="btn_contain">
                                <LWPButton btnText="Finish" onClick={() => setTopicLink(false)} />
                            </div>
                        </DialogWrapper>

                        <DialogWrapper
                            className="reset_password_modal"
                            open={demoTopicLink?.url}
                            setOpen={() => setDemoTopicLink({})}
                            contentWidth="768px"
                            heading="Demo Topic Link">
                            <Paragraph
                                customClass="title"
                                text={`Use this link to access demo topic. This link will expire on ${moment(
                                    demoTopicLink?.expiryTime
                                ).format('DD/MM/YYYY')}.`}
                            />
                            <CopyToClipboard
                                text={demoTopicLink?.url}
                                onCopy={() => {
                                    callSnackbar('Link copied!', 'success');
                                }}>
                                <div className="reset_pwd_link_contain">
                                    <Paragraph text={demoTopicLink?.url} />
                                    <span className="material-icons icon">content_copy</span>
                                </div>
                            </CopyToClipboard>
                            <div className="btn_contain">
                                <LWPButton btnText="Finish" onClick={() => setDemoTopicLink({})} />
                            </div>
                        </DialogWrapper>
                        <div className="mt6">
                            <Heading2 text={'Demo Topic'} />

                            <div className="mt6">
                                <DateField
                                    label="Demo link expires on"
                                    name="demoLinkExpiry"
                                    lg={4}
                                    md={6}
                                    sm={6}
                                    xs={12}
                                    value={demoLinkExpiry}
                                    minDate={demoLinkEarliestExpiry}
                                    disabled={defaultDemoLinkExpiryLoading}
                                    onChange={(event) => setDemoLinkExpiry(event.target.value)}
                                    dataTest="demo-link-expiry"
                                />
                            </div>

                            <div className="mt6">
                                <LWPButton
                                    btnText="Generate demo link"
                                    onClick={() => {
                                        // Send an expiry only once the admin has moved off the default day, so an
                                        // untouched field, or one they have emptied, still lets the backend apply
                                        // MAGIC_LINK_TIMEOUT on its own.
                                        const isCustomExpiry =
                                            demoLinkExpiry &&
                                            demoLinkDefaultExpiry &&
                                            !moment(demoLinkExpiry).isSame(demoLinkDefaultExpiry, 'day');

                                        generateDemoTopicMagicLinkMutation({
                                            variables: {
                                                topicId: topic_id,
                                                expiryTime: isCustomExpiry ? moment(demoLinkExpiry).endOf('day').toDate() : null
                                            }
                                        })
                                            .then(({ data }) => {
                                                setDemoTopicLink({
                                                    url: `${location.protocol}//${location.host}/topicdemo/${topic_id}?magicLink=${data?.generateDemoTopicMagicLink?.url}`,
                                                    expiryTime: data?.generateDemoTopicMagicLink?.expiryTime
                                                });
                                            })
                                            .catch((error) => {
                                                callSnackbar(error.message, 'error');
                                            });
                                    }}
                                    disabled={generateDemoTopicMagicLinkLoading || defaultDemoLinkExpiryLoading}
                                    loading={generateDemoTopicMagicLinkLoading}
                                    dataTest="generate-demo-link"
                                />
                            </div>
                        </div>

                        <div className="mt6">
                            <Heading2 text={'Preview Topic'} />

                            <CommonIconButton
                                toolTipTitle="Preview Topic"
                                onClick={() => {
                                    window.open(
                                        `${location.protocol}//${location.host}/previewtopic/${topic_id}`,
                                        '_blank',
                                        `width=${window.innerWidth}, height=${window.innerHeight}`
                                    );
                                }}
                                icon="visibility"
                            />
                        </div>

                        {openModal && (
                            <UpdateTopicModal
                                open={openModal}
                                setOpen={() => setOpenModal(!openModal)}
                                isPreview={true}
                                showScrapbookPrompt={isReadyTeddyDomainSelected(values.domainAndYearGroupIds)} // Show the scrapbook prompt in preview only if the topic belongs to Ready Teddy domain
                                topicData={{
                                    teacherTopicName: values.teacherTopicName,
                                    subject: values.subject,
                                    yearGroups: topic?.getTopicForAdmin?.yearGroups,
                                    teacherDescription: values.teacherDescription,
                                    scrapbookPrompt: isReadyTeddyDomainSelected(values.domainAndYearGroupIds)
                                        ? values?.scrapbookPrompt
                                        : null
                                }}
                            />
                        )}
                    </Form>
                )}
            </Formik>
        </div>
    );
};

Details.propTypes = { topic_id: PropTypes.string, setClassName: PropTypes.string };

export default Details;
