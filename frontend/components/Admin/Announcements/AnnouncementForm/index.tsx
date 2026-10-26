/* eslint-disable @next/next/no-img-element */
import { gql, useMutation, useQuery } from '@apollo/client';
import ClearIcon from '@mui/icons-material/Clear';
import { Grid, MenuItem, Select } from '@mui/material';
import { Box } from '@mui/system';
import { Formik } from 'formik';
import { behaviour, ImageSourceType, PageAnnouncementUserOption } from 'lwp-shared';
import { useRouter } from 'next/router';
import { ChangeEvent, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { _getBase64ToFile, _removeWhiteSpace, convertEnumIntoMUISelectOptions } from '../../../../shared/Services/handler';
import { pageAnnouncementValidation } from '../../../../shared/validations';
import { IStaticLwpPageAnnouncement } from '../../../../types/entities/IStaticLwpPageAnnouncement';
import { useLwpAppContext } from '../../../AuthProvider';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonCheckBox from '../../../Shared/CommonCheckBox';
import CommonEditor from '../../../Shared/CommonEditor';
import CommonError from '../../../Shared/CommonError';
import CommonFileUpload from '../../../Shared/CommonFileUpload';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonMultiSelect from '../../../Shared/CommonMultiSelect';
import CommonTag from '../../../Shared/CommonTag';
import InputField from '../../../Shared/InputField/InputField';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import AnnouncementPreviewModal from '../AnnouncementPreviewModal';
import TargetPageOption from './TargetPageOption';

const getPageAnnouncement = gql`
    query getPageAnnouncement($id: String!) {
        getPageAnnouncement(id: $id) {
            id
            title
            message
            imageUrl
            imageType
            includeImage
            userOptions
            targetPages
            priority
            schoolTags {
                id
                name
                color
            }
        }
    }
`;

const getSchoolTagsForAnnouncementForm = gql`
    query getSchoolTagsForAdmin {
        getSchoolTagsForAdmin {
            id
            name
            color
        }
    }
`;

const addPageAnnouncement = gql`
    mutation addPageAnnouncement($input: AddPageAnnouncementInput!, $file: Upload) {
        addPageAnnouncement(input: $input, file: $file)
    }
`;

const updatePageAnnouncement = gql`
    mutation updatePageAnnouncement($input: UpdatePageAnnouncementInput!, $file: Upload) {
        updatePageAnnouncement(input: $input, file: $file)
    }
`;

const defaultPageAnnouncementImages = [
    {
        key: 'exclamation.png',
        label: 'Exclamation'
    },
    {
        key: 'question.png',
        label: 'Question'
    },
    {
        key: 'mathscot-cheer.png',
        label: 'Mathscot Cheer'
    },
    {
        key: 'mathscot-point-right.png',
        label: 'Mathscot Point Right'
    },
    {
        key: 'mathscot-wave.png',
        label: 'Mathscot Wave'
    },
    {
        key: 'mathscot-hands-together.png',
        label: 'Mathscot Hands Together'
    },
    {
        key: 'mathscot-holding-sign.png',
        label: 'Mathscot Holding Sign'
    },
    {
        key: 'mathscot-podium.png',
        label: 'Mathscot Podium'
    }
];

const USER_TYPE_OPTIONS = convertEnumIntoMUISelectOptions(PageAnnouncementUserOption);

export const PAGE_GROUP_LABELS: Record<PageAnnouncementUserOption, string> = {
    [PageAnnouncementUserOption.SCHOOL_LEADER]: 'School leader pages',
    [PageAnnouncementUserOption.TEACHER]: 'Teacher pages',
    [PageAnnouncementUserOption.PARENT]: 'Parent pages',
    [PageAnnouncementUserOption.ALL_USERS]: 'Pages for everyone',
    [PageAnnouncementUserOption.ADMIN]: 'Admin pages'
};

interface PageOption {
    key: string;
    value: string;
    group: string;
}

/** The pages these user types can open, as picker options grouped by audience. */
const getPageOptions = (userOptions: PageAnnouncementUserOption[]): PageOption[] =>
    behaviour.announcementPages.getPagesReachableBy(userOptions).map((page) => ({
        key: page.route,
        value: page.label,
        group: PAGE_GROUP_LABELS[page.audience]
    }));

const AnnouncementForm = () => {
    const router = useRouter();
    const announcementId = router?.query?.announcement_id as string | undefined;
    const { callSnackbar } = useLwpAppContext();
    const [addAnnouncementMutation, { loading: addLoading }] = useMutation(addPageAnnouncement);
    const [fileName, setFileName] = useState<string | null>(null);

    const [updateAnnouncementMutation, { loading: updateLoading }] = useMutation(updatePageAnnouncement);
    const { data: announcementData, loading } = useQuery(getPageAnnouncement, { variables: { id: announcementId }, skip: !announcementId });
    const { data, loading: getSchoolTagsLoading } = useQuery(getSchoolTagsForAnnouncementForm);

    const [previewState, setPreviewState] = useState({
        isOpen: false,
        announcement: null
    });

    const announcement: IStaticLwpPageAnnouncement | null = announcementData?.getPageAnnouncement;
    // A saved page that left the registry, or that the user types can no longer open, is dropped.
    const savedTargetPages = getPageOptions(announcement?.userOptions || []).filter((page) =>
        announcement?.targetPages?.includes(page.key)
    );

    return (
        <div className="admin-announcement-form" data-test="admin-announcement-form">
            <LWPButton
                btnText={'Back to Page announcements'}
                startIcon="navigate_before"
                color="inherit"
                variant="text"
                size="medium"
                onClick={() => router?.push(`/admin/announcements`)}
                customClass="mb9"
            />
            <Heading1 text={announcementId ? 'Update message' : 'Add a new message'} customClass="admin-announcement-form-heading" />
            {loading || getSchoolTagsLoading ? (
                <CommonLoading />
            ) : (
                <Formik
                    initialValues={{
                        message: announcement?.message || '',
                        title: announcement?.title || '',
                        priority: announcement?.priority || '',
                        includeImage: announcement?.includeImage || false,
                        image: announcement?.imageType === ImageSourceType.UPLOADED ? announcement?.imageUrl : null,
                        schoolTags:
                            announcement?.schoolTags?.length > 0
                                ? (announcement?.schoolTags || [])?.map((schoolTag) => ({
                                      key: schoolTag?.id,
                                      value: schoolTag?.name,
                                      color: schoolTag?.color
                                  }))
                                : [],
                        userOptions:
                            announcement?.userOptions?.length > 0
                                ? announcement?.userOptions?.map((userOption) => ({
                                      value: userOption
                                          .replaceAll('_', ' ')
                                          .toLowerCase()
                                          .replace(/^\w/, (c) => c.toUpperCase()),
                                      key: userOption
                                  }))
                                : [],
                        targetPages: savedTargetPages,
                        // Dropping every chosen page would quietly widen the announcement to every page, so saving waits for a choice.
                        pagesDropped: announcement?.targetPages?.length > 0 && savedTargetPages.length === 0,
                        pagesDropConfirmed: false,
                        predefinedImageKey:
                            announcement?.imageType === ImageSourceType.PREDEFINED
                                ? defaultPageAnnouncementImages?.find((img) => announcement?.imageUrl?.includes(img?.key)).key
                                : null,
                        editAsHtml: false
                    }}
                    enableReinitialize
                    validationSchema={pageAnnouncementValidation}
                    onSubmit={async (values, { setFieldValue: setSubmittedFieldValue }) => {
                        // After the pages were dropped, the first Save only confirms the warning and the next one saves to every page.
                        if (values.pagesDropped && !values.pagesDropConfirmed) {
                            setSubmittedFieldValue('pagesDropConfirmed', true);

                            return;
                        }

                        try {
                            const input = {
                                includeImage: values?.includeImage,
                                message: values?.message,
                                title: _removeWhiteSpace(values?.title),
                                priority: +_removeWhiteSpace(values?.priority),
                                userOptions: values.userOptions?.map((userOption) => userOption.key),
                                schoolTagIds: values.schoolTags?.map((tag) => tag.key),
                                targetPages: values.targetPages?.map((page) => page.key)
                            };
                            let file = null;

                            if (values?.includeImage) {
                                if (values?.predefinedImageKey) {
                                    input['imageUrl'] = values?.predefinedImageKey;
                                } else if (values?.image) {
                                    file = values?.image?.startsWith('data:') ? _getBase64ToFile(values?.image, fileName) : null;
                                }
                            }

                            if (announcementId) {
                                await updateAnnouncementMutation({
                                    variables: { input: { ...input, id: announcementId, hasImage: values?.includeImage }, file }
                                });
                            } else {
                                await addAnnouncementMutation({
                                    variables: { input, file }
                                });
                            }

                            router.push('/admin/announcements');
                        } catch (err) {
                            callSnackbar(err, 'error');
                        }
                    }}>
                    {({ values, errors, touched, setValues, setFieldValue, handleChange, handleBlur, handleSubmit }) => (
                        <Grid container rowGap={2}>
                            <Grid item xs={12}>
                                <InputField
                                    label="Title"
                                    xs={12}
                                    sm={12}
                                    md={12}
                                    lg={12}
                                    name="title"
                                    value={values.title}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.title}
                                    touched={touched.title}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <CommonCard>
                                    <CommonCheckBox
                                        checked={values.editAsHtml}
                                        onChange={() => setFieldValue('editAsHtml', !values.editAsHtml)}
                                        label="Edit As Html"
                                    />
                                    <CommonEditor
                                        value={values.message}
                                        editAsHtml={values.editAsHtml}
                                        onChange={(editorState) => setFieldValue('message', editorState)}
                                    />
                                    <CommonError error={errors?.message} touched={touched?.message} />
                                </CommonCard>
                            </Grid>
                            <Grid item xs={12}>
                                <CommonCheckBox
                                    label="Include mathscot/icon"
                                    name="includeImage"
                                    checked={values.includeImage}
                                    error={errors.includeImage}
                                    touched={touched.includeImage}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        setValues({
                                            ...values,
                                            includeImage: e?.target?.checked,
                                            image: null,
                                            predefinedImageKey: null
                                        });
                                    }}
                                />
                            </Grid>
                            {values?.includeImage ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Select
                                            className="select-predefined-image"
                                            fullWidth
                                            name="predefinedImageKey"
                                            value={values?.predefinedImageKey || ''}
                                            displayEmpty
                                            endAdornment={
                                                values?.predefinedImageKey ? (
                                                    <ClearIcon
                                                        className="mr4 cp"
                                                        onClick={() => setFieldValue('predefinedImageKey', null)}
                                                        fontSize="small"
                                                        color="action"
                                                    />
                                                ) : null
                                            }
                                            renderValue={(value) => {
                                                if (!value) {
                                                    return <Paragraph text="Select an image" />;
                                                }

                                                const img = defaultPageAnnouncementImages.find((i) => i.key === value);

                                                return (
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {img && (
                                                            <img
                                                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.DEFAULTPAGEANNOUNCEMENTICONS}/${img.key}`}
                                                                alt={img.label}
                                                                width={24}
                                                                height={24}
                                                            />
                                                        )}
                                                        <Paragraph text={img?.label ?? 'Select an image'} />
                                                    </Box>
                                                );
                                            }}>
                                            <Grid
                                                container
                                                spacing={1}
                                                padding={1}
                                                width={'100%'}
                                                maxWidth={'398px'}
                                                className="select-predefined-image-options">
                                                {defaultPageAnnouncementImages.map((img, ind) => (
                                                    <Grid item key={ind} xs={3}>
                                                        <MenuItem
                                                            value={img.key}
                                                            className={
                                                                img.key === values?.predefinedImageKey ? 'selected-predefined-image' : ''
                                                            }
                                                            onClick={() =>
                                                                setValues({
                                                                    ...values,
                                                                    predefinedImageKey: img.key,
                                                                    image: null
                                                                })
                                                            }>
                                                            <img
                                                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.DEFAULTPAGEANNOUNCEMENTICONS}/${img.key}`}
                                                                alt={img.label}
                                                            />
                                                        </MenuItem>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Select>
                                        <CommonError error={errors.predefinedImageKey} touched={touched.predefinedImageKey} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <CommonFileUpload
                                            name="image"
                                            previewImage={values.image}
                                            heading="Upload your own image"
                                            setFileName={setFileName}
                                            accept={'image/png, image/jpeg, image/jpg'}
                                            onClose={() => setFieldValue('image', null)}
                                            onSave={(value) => {
                                                setValues({
                                                    ...values,
                                                    predefinedImageKey: null,
                                                    image: value
                                                });
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            ) : null}

                            <Grid item xs={12} md={12} lg={12}>
                                <Heading3 style={{ fontSize: '16px', fontWeight: '700', fontStyle: 'normal' }} text="User type" />
                            </Grid>
                            <Grid item xs={12} md={12} lg={12}>
                                <CommonMultiSelect
                                    value={values.userOptions}
                                    options={USER_TYPE_OPTIONS}
                                    label="User"
                                    name="userOptions"
                                    error={errors.userOptions}
                                    touched={touched.userOptions}
                                    md={12}
                                    lg={12}
                                    onChange={(value) => {
                                        const reachableRoutes = getPageOptions(value.map((option) => option.key)).map((page) => page.key);
                                        // Drop pages none of the remaining user types can open.
                                        const remainingTargetPages = values.targetPages.filter((page) =>
                                            reachableRoutes.includes(page.key)
                                        );

                                        handleChange({
                                            target: { name: 'userOptions', value: value }
                                        });
                                        setFieldValue('targetPages', remainingTargetPages);
                                        if (values.targetPages.length > 0 && remainingTargetPages.length === 0) {
                                            setFieldValue('pagesDropped', true);
                                            setFieldValue('pagesDropConfirmed', false);
                                        }
                                    }}
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'userOptions', value: value }
                                        })
                                    }
                                    dataTest="add-page-announcement-user-options-multi-select"
                                />
                            </Grid>

                            <Grid item xs={12} md={12} lg={12}>
                                <CommonMultiSelect
                                    label="School tags"
                                    options={(data?.getSchoolTagsForAdmin || []).map((item) => ({
                                        value: item.name,
                                        key: item.id,
                                        ...item
                                    }))}
                                    value={values.schoolTags}
                                    error={errors.schoolTags}
                                    touched={touched.schoolTags}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'schoolTags', value: value }
                                        });
                                    }}
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
                                    md={12}
                                    lg={12}
                                    dataTest="add-page-announcement-school-tags-multi-select"
                                />
                            </Grid>

                            <Grid item xs={12} md={12} lg={12}>
                                <Heading3 style={{ fontSize: '16px', fontWeight: '700', fontStyle: 'normal' }} text="Pages" />
                                <Paragraph text="Leave empty to show on every page. Only pages the selected user types can open are listed." />
                            </Grid>
                            <Grid item xs={12} md={12} lg={12}>
                                <CommonMultiSelect
                                    label="Pages"
                                    name="targetPages"
                                    placeholder={values.targetPages.length ? '' : 'All pages'}
                                    options={getPageOptions(values.userOptions.map((option) => option.key))}
                                    groupBy={(option) => (option as PageOption).group}
                                    renderOption={(props, option) => (
                                        <TargetPageOption key={option.key} optionProps={props} label={option.value} route={option.key} />
                                    )}
                                    value={values.targetPages}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'targetPages', value: value }
                                        });
                                        setFieldValue('pagesDropped', false);
                                        setFieldValue('pagesDropConfirmed', false);
                                    }}
                                    md={12}
                                    lg={12}
                                    dataTest="add-page-announcement-target-pages-multi-select"
                                />
                                <div data-test="add-page-announcement-target-pages-dropped-error">
                                    <CommonError
                                        error={
                                            values.pagesDropped
                                                ? 'None of the chosen pages can be reached by these user types any more, so this would show on every page. Pick pages again, or press Save again to show it on every page.'
                                                : null
                                        }
                                        touched
                                    />
                                </div>
                            </Grid>

                            <Grid item xs={12} md={12} lg={12}>
                                <InputField
                                    name="priority"
                                    value={values.priority}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.priority}
                                    touched={touched.priority}
                                    label="Priority"
                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                    xs={12}
                                    sm={12}
                                    md={12}
                                    lg={12}
                                />
                            </Grid>

                            <Grid item xs={12} className="admin-announcement-form-actions">
                                <LWPButton
                                    btnText="Preview"
                                    color="inherit"
                                    onClick={() =>
                                        setPreviewState({
                                            isOpen: true,
                                            announcement: {
                                                message: values?.message,
                                                imageUrl:
                                                    values?.image || values?.predefinedImageKey
                                                        ? values?.image ||
                                                          `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.DEFAULTPAGEANNOUNCEMENTICONS}/${values.predefinedImageKey}`
                                                        : null,
                                                title: values?.title,
                                                targetPages: values.targetPages?.map((page) => page.key)
                                            }
                                        })
                                    }
                                />
                                <div>
                                    <LWPButton
                                        btnText={'Cancel'}
                                        color="inherit"
                                        variant="text"
                                        size="large"
                                        disabled={addLoading || updateLoading}
                                        onClick={() => router.push(`/admin/announcements`)}
                                    />
                                    <LWPButton
                                        btnText={'Save'}
                                        color="primary"
                                        variant="contained"
                                        size="large"
                                        dataTest="add-page-announcement-save-button"
                                        onClick={handleSubmit}
                                        customClass="mr2"
                                        loading={addLoading || updateLoading}
                                    />
                                </div>
                            </Grid>
                        </Grid>
                    )}
                </Formik>
            )}

            {previewState?.isOpen ? (
                <AnnouncementPreviewModal
                    announcement={previewState.announcement}
                    open={previewState.isOpen}
                    onClose={() => setPreviewState({ isOpen: false, announcement: null })}
                />
            ) : null}
        </div>
    );
};

export default AnnouncementForm;
