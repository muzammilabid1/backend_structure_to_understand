import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { SubjectProgrammeType } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonCheckBox from '../../../components/Shared/CommonCheckBox';
import CommonFileUpload from '../../../components/Shared/CommonFileUpload';
import CommonMultiSelect from '../../../components/Shared/CommonMultiSelect';
import CommonTag from '../../../components/Shared/CommonTag';
import InputField from '../../../components/Shared/InputField/InputField';
import Heading1 from '../../../components/Shared/Typography/Heading1';
import Heading3 from '../../../components/Shared/Typography/Heading3';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { addTopic } from '../../../graphQl/mutations';
import { getAllTopicDomains, getSchoolTagsForAdmin, getTopicTagsForAdmin } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _getBase64ToFile, _removeWhiteSpace, detectDataUriFile, ThemeContext } from '../../../shared/Services/handler';
import { addTopicFromAdminValidation } from '../../../shared/validations';
import { PageType } from '../../../types/enums/PageType';

const AddTopicPage = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [resourceFileName, setResourceFileName] = useState(null);

    const router = useRouter();

    const { error: domainError, data: domains } = useQuery(getAllTopicDomains);

    const { error: topicTagsError, data: topicTagsData } = useQuery(getTopicTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    const { error: schoolTagsError, data: schoolTagsData } = useQuery(getSchoolTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    const [addTopicMutation, { loading }] = useMutation(addTopic);

    useEffect(() => {
        domainError?.message && callSnackbar(domainError, 'error');
        topicTagsError?.message && callSnackbar(topicTagsError, 'error');
        schoolTagsError?.message && callSnackbar(schoolTagsError, 'error');
    }, [domainError, topicTagsError, schoolTagsError]);

    const domainAndYearGroupIdsOptions = [];

    const allDomains = domains?.allTopicDomains || [];

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

    return (
        <Formik
            enableReinitialize
            initialValues={formInitialStates['addTopicFromAdmin']}
            validationSchema={addTopicFromAdminValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { teacherTopicName, video, videoThumb, teacherResource, domainAndYearGroupIds, schoolTags, topicTags, ...rest } =
                        values;

                    const files = [];
                    const topicTagId = topicTags?.map((tag) => tag.key);
                    const schoolTagId = rest?.limitedRelease ? schoolTags?.map((tag) => tag.key) : [];

                    const file = videoThumb && _getBase64ToFile(videoThumb, filename);

                    if (file) files.push(file);

                    const resourceFile = detectDataUriFile(teacherResource, resourceFileName, rest?.teacherResourceId);

                    if (resourceFile) files.push(resourceFile);

                    const domainAndYear = domainAndYearGroupIds?.map((itme) => ({
                        domainId: itme?.domainId,
                        yearGroupId: itme?.yearGroupId
                    }));

                    await addTopicMutation({
                        variables: {
                            file: files,
                            input: {
                                teacherTopicName: _removeWhiteSpace(teacherTopicName),
                                video: video?.toString(),
                                domainAndYearGroupIds: domainAndYear,
                                topicTagId,
                                schoolTagId,
                                teacherDescription: rest?.teacherDescription,
                                parentTopicName: rest?.parentTopicName,
                                teacherEmailBody: rest?.teacherEmailBody,
                                isHidden: rest?.isHidden,
                                isDemo: rest?.isDemo,
                                noVideo: rest?.noVideo,
                                isPublished: rest?.isPublished,
                                teacherResourceId: rest?.teacherResourceId,
                                scrapbookPrompt: isReadyTeddyDomainSelected(domainAndYearGroupIds) ? rest?.scrapbookPrompt : null
                            }
                        }
                    });
                    resetForm();
                    callSnackbar('New topic created', 'success');
                    router?.push(`/admin/topics`);
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue }) => {
                return (
                    <div>
                        <LWPButton
                            btnText="Go back to topic"
                            startIcon="navigate_before"
                            color="inherit"
                            variant="text"
                            size="medium"
                            onClick={() => router?.push(`/admin/topics`)}
                        />

                        <Heading1 text="Add new topic" />

                        <InputField
                            name="teacherTopicName"
                            value={values.teacherTopicName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.teacherTopicName}
                            touched={touched.teacherTopicName}
                            label="Teacher topic name"
                            type="text"
                            md={12}
                            lg={12}
                            inputProps={{ 'data-test': 'add-topic-name-input' }}
                        />

                        <CommonMultiSelect
                            name="domainAndYearGroupIds"
                            label="Domain and Year group"
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
                            onBlur={(value) => {
                                handleBlur({
                                    target: { name: 'domainAndYearGroupIds', value }
                                });
                            }}
                            data-test={'domain-and-year-group-multiselect'}
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
                                type="text"
                                md={12}
                                lg={12}
                                multiline
                                rows={3}
                                inputProps={{ 'data-test': 'add-scrapbook-prompt-input' }}
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
                            data-test={'topic-tags-multiselect'}
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
                            name="teacherDescription"
                            label="Teacher description"
                            value={values.teacherDescription}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.teacherDescription}
                            touched={touched.teacherDescription}
                            multiline
                            rows={3}
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
                            multiline
                            rows={3}
                            md={12}
                            lg={12}
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
                                md={12}
                                lg={12}
                            />
                        )}

                        <CommonFileUpload
                            name="'videoThumb'"
                            previewImage={values.videoThumb}
                            customClass="add-topic-file-upload"
                            icon="folder"
                            heading="Topic image"
                            setFileName={setFileName}
                            onClose={() => handleChange({ target: { name: 'videoThumb', value: '' } })}
                            onSave={(croppedImage) => {
                                handleChange({ target: { name: 'videoThumb', value: croppedImage } });
                            }}
                        />

                        <div className="mb5">
                            <CommonFileUpload
                                name="teacherResource"
                                previewImage={values.teacherResource}
                                customClass="add-topic-file-upload"
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
                            <Paragraph text="This will be sent out to teachers the week before a topic is released." customClass="mb2" />
                        </div>

                        <Heading3 text="Topic settings " />

                        <CommonCheckBox
                            label="Not offered to teacher"
                            name="isHidden"
                            checked={values.isHidden}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.isHidden}
                            touched={touched.isHidden}
                        />

                        <CommonCheckBox
                            label="No video content"
                            name="noVideo"
                            checked={values.noVideo}
                            onChange={handleChange}
                            onBlur={handleBlur}
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
                        <br />
                        {values.limitedRelease && (
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
                        )}

                        <Grid container gap={3}>
                            <LWPButton
                                btnText="Save draft"
                                color="inherit"
                                onClick={() => {
                                    setFieldValue('isPublished', false);

                                    handleSubmit();
                                }}
                                disabled={loading}
                            />
                            <LWPButton
                                btnText="Publish"
                                onClick={() => {
                                    setFieldValue('isPublished', true);

                                    handleSubmit();
                                }}
                                loading={loading}
                            />
                        </Grid>
                    </div>
                );
            }}
        </Formik>
    );
};

AddTopicPage.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    defaultValues: PropTypes.object,
    topicQuery: PropTypes.func,
    item: PropTypes.string
};

AddTopicPage.defaultProps = {
    open: false,
    setOpen: () => {}
};

AddTopicPage.pageType = PageType.ADMIN;
AddTopicPage.pageTitle = 'Admin: Add topic';

export default AddTopicPage;
